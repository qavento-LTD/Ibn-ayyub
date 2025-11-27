// =============================================
// Checkout Page JavaScript
// =============================================

import { getCartItems, getCurrentUser, supabase, removeFromCart } from '../../js/supabase-client.js';
import { showSuccess, showError, showLoading } from '../../js/toast.js';
import { formatPrice } from '../../js/utils.js';

let cartItems = [];
let currentUser = null;
let currentShippingFee = 0;

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
        renderOrderItems(items);
        loadUserInfo();
        calculateTotals(items);
    } catch (error) {
        console.error('Load order summary error:', error);
        showError('حدث خطأ في تحميل الطلب');
    }
}

// =============================================
// Render Order Items
// =============================================
function renderOrderItems(items) {
    const container = document.getElementById('order-items-container');
    if (!container) return;

    container.innerHTML = items.map(item => `
        <div class="mini-product">
            <img src="${item.product.image_url || '../assets/images/default-product.png'}" alt="${item.product.title}">
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">${item.product.title}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-light); font-size: 0.85rem;">الكمية: ${item.quantity}</span>
                    <span style="font-weight: 700; color: var(--primary-color);">${formatPrice(item.product.price * item.quantity)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// =============================================
// Calculate & Update Totals
// =============================================
async function calculateTotals(items) {
    const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    // Update Subtotal UI
    document.getElementById('subtotal-display').textContent = formatPrice(subtotal);

    // Fetch Shipping Settings
    try {
        const { data: settings, error } = await supabase
            .from('site_settings')
            .select('setting_key, setting_value')
            .in('setting_key', ['shipping-fee', 'free-shipping-min', 'enable-free-shipping', 'delivery-time']);

        let shippingFee = 25; // Default fallback
        let freeShippingMin = 200;
        let enableFreeShipping = true;
        let deliveryTime = '3-5';

        if (!error && settings) {
            const config = {};
            settings.forEach(s => config[s.setting_key] = s.setting_value);

            shippingFee = Number(config['shipping-fee']) || 25;
            freeShippingMin = Number(config['free-shipping-min']) || 200;
            enableFreeShipping = config['enable-free-shipping'] === true || config['enable-free-shipping'] === 'true';
            deliveryTime = config['delivery-time'] || '3-5';
        }

        // Calculate Shipping
        if (enableFreeShipping && subtotal >= freeShippingMin) {
            currentShippingFee = 0;
        } else {
            currentShippingFee = shippingFee;
        }

        // Update UI
        const shippingEl = document.getElementById('shipping-display');
        if (currentShippingFee === 0) {
            shippingEl.innerHTML = '<span style="color: var(--success-color); font-weight: 700;">مجاني 🎉</span>';
        } else {
            shippingEl.textContent = formatPrice(currentShippingFee);
        }

        document.getElementById('delivery-time-display').textContent = `${deliveryTime} أيام عمل`;
        document.getElementById('total-display').textContent = formatPrice(subtotal + currentShippingFee);

    } catch (error) {
        console.error('Shipping calculation error:', error);
        // Fallback
        currentShippingFee = 25;
        document.getElementById('shipping-display').textContent = formatPrice(25);
        document.getElementById('total-display').textContent = formatPrice(subtotal + 25);
    }
}

// =============================================
// Load User Info
// =============================================
async function loadUserInfo() {
    try {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (profile) {
            if (profile.full_name) document.getElementById('fullName').value = profile.full_name;
            if (profile.phone) document.getElementById('phone').value = profile.phone;
            if (profile.address) document.getElementById('address').value = profile.address;
        }
    } catch (e) {
        console.log('User info load error', e);
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

    // Get Values
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const city = document.getElementById('city').value.trim();
    const postalCode = document.getElementById('postalCode').value.trim();
    const notes = document.getElementById('notes').value.trim();

    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    // Credit Card Validation
    if (paymentMethod === 'card') {
        const ccNum = document.getElementById('cc-number').value.replace(/\s/g, '');
        const ccExp = document.getElementById('cc-expiry').value;
        const ccCvc = document.getElementById('cc-cvc').value;

        if (ccNum.length < 16) return showError('رقم البطاقة غير صحيح');
        if (!ccExp || ccExp.length < 5) return showError('تاريخ الانتهاء غير صحيح');
        if (!ccCvc || ccCvc.length < 3) return showError('رمز الأمان غير صحيح');
    }

    const btn = document.getElementById('placeOrderBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';

    try {
        const subtotal = cartItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
        const total = subtotal + currentShippingFee;

        // 1. Create Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: currentUser.id,
                subtotal_amount: subtotal,
                shipping_fee: currentShippingFee,
                total_amount: total,
                status: 'pending',
                payment_status: paymentMethod === 'card' ? 'paid' : 'unpaid', // Simulating payment success
                payment_method: paymentMethod,
                shipping_address: `${address}, ${city} ${postalCode ? '- ' + postalCode : ''}`,
                phone: phone,
                notes: notes
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Create Order Items
        const orderItemsData = cartItems.map(item => ({
            order_id: order.id,
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.price
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsData);

        if (itemsError) throw itemsError;

        // 3. Create Payment Record
        const { error: paymentError } = await supabase
            .from('payments')
            .insert({
                order_id: order.id,
                user_id: currentUser.id,
                amount: total,
                provider: paymentMethod === 'card' ? 'stripe' : 'cod', // Simulation
                status: paymentMethod === 'card' ? 'completed' : 'pending',
                payment_details: paymentMethod === 'card' ? { last4: '4242', brand: 'Visa' } : {}
            });

        if (paymentError) console.error('Payment record error:', paymentError); // Non-blocking

        // 4. Clear Cart
        await supabase.from('cart_items').delete().eq('user_id', currentUser.id);

        // Success
        showSuccess('تم استلام طلبك بنجاح! 🎉');
        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 2000);

    } catch (error) {
        console.error('Place order error:', error);
        showError('حدث خطأ أثناء تنفيذ الطلب: ' + (error.message || 'خطأ غير معروف'));
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    loadOrderSummary();

    const btn = document.getElementById('placeOrderBtn');
    if (btn) btn.addEventListener('click', placeOrder);

    // CC Formatting
    const ccInput = document.getElementById('cc-number');
    if (ccInput) {
        ccInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '').substring(0, 16);
            e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
        });
    }

    const expInput = document.getElementById('cc-expiry');
    if (expInput) {
        expInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '').substring(0, 4);
            if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
            e.target.value = v;
        });
    }
});
