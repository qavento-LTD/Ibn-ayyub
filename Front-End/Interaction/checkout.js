// =============================================
// Checkout Page JavaScript
// =============================================

import { getCartItems, getCurrentUser, supabase } from '../../js/supabase-client.js';
import { showSuccess, showError, showLoading } from '../../js/toast.js';
import { formatPrice } from '../../js/utils.js';

let cartItems = [];
let currentUser = null;

// =============================================
// Load Order Summary
// =============================================
async function loadOrderSummary() {
    currentUser = await getCurrentUser();

    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const { data: items, error } = await getCartItems(currentUser.id);

        if (error) throw error;

        if (!items || items.length === 0) {
            showError('سلة التسوق فارغة');
            setTimeout(() => {
                window.location.href = 'cart.html';
            }, 1500);
            return;
        }

        cartItems = items;
        renderOrderSummary(items);
        loadUserInfo();
    } catch (error) {
        console.error('Load order summary error:', error);
        showError('حدث خطأ في تحميل الطلب');
    }
}

// =============================================
// Render Order Summary
// =============================================
function renderOrderSummary(items) {
    const container = document.getElementById('order-items');
    let subtotal = 0;

    const html = items.map(item => {
        const product = item.product;
        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        return `
            <div class="order-item">
                <div class="order-item-img">
                    ${product.image_url && product.image_url.startsWith('http')
                ? `<img src="${product.image_url}" alt="${product.title}">`
                : `<i class="fas fa-gift" style="font-size: 1.5rem; color: #dee2e6;"></i>`
            }
                </div>
                <div class="order-item-details">
                    <div class="order-item-title">${product.title}</div>
                    <div class="order-item-qty">الكمية: ${item.quantity}</div>
                </div>
                <div class="order-item-price">${formatPrice(product.price * item.quantity)}</div>
            </div>`;
    }).join('');

    container.innerHTML = html;
    updateTotals(subtotal);
}

// =============================================
// Update Totals
// =============================================
function updateTotals(subtotal) {
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (totalEl) totalEl.textContent = formatPrice(subtotal);
}

// =============================================
// Load User Info
// =============================================
async function loadUserInfo() {
    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (profile) {
            document.getElementById('fullName').value = profile.full_name || '';
            document.getElementById('phone').value = profile.phone || '';
            document.getElementById('address').value = profile.address || '';
        }
    } catch (error) {
        console.error('Load user info error:', error);
    }
}

// =============================================
// Place Order
// =============================================
async function placeOrder() {
    const form = document.getElementById('checkout-form');

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const city = document.getElementById('city').value.trim();
    const postalCode = document.getElementById('postalCode').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    const loadingToast = showLoading('جاري إنشاء الطلب...');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    placeOrderBtn.disabled = true;

    try {
        // Calculate total
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

        // Create order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: currentUser.id,
                total_amount: totalAmount,
                status: 'pending',
                shipping_address: `${address}, ${city}${postalCode ? ', ' + postalCode : ''}`,
                payment_method: paymentMethod,
                notes: notes || null
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = cartItems.map(item => ({
            order_id: order.id,
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.price
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // Update user profile
        await supabase
            .from('user_profiles')
            .update({
                full_name: fullName,
                phone: phone,
                address: address
            })
            .eq('id', currentUser.id);

        // Clear cart
        const cartItemIds = cartItems.map(item => item.id);
        await supabase
            .from('cart_items')
            .delete()
            .in('id', cartItemIds);

        loadingToast.remove();
        showSuccess('تم إنشاء الطلب بنجاح! رقم الطلب: #' + order.id);

        // Redirect to orders page after 2 seconds
        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 2000);

    } catch (error) {
        loadingToast.remove();
        console.error('Place order error:', error);
        showError('حدث خطأ في إنشاء الطلب. يرجى المحاولة مرة أخرى');
        placeOrderBtn.disabled = false;
    }
}

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('💳 Checkout Page - Initializing...');

    loadOrderSummary();

    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
    }

    console.log('✅ Checkout page ready!');
});
