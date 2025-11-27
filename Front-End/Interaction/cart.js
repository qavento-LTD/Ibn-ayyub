// =============================================
// Cart Page JavaScript
// =============================================

import { getCartItems, updateCartQuantity, removeFromCart, getCurrentUser, supabase } from '../../js/supabase-client.js';
import { showSuccess, showError, showLoading } from '../../js/toast.js';
import { formatPrice } from '../../js/utils.js';

let cartItems = [];
let shippingSettings = {
    fee: 25,
    freeMin: 200,
    enableFree: true
};

// =============================================
// Load Cart Items
// =============================================
async function loadCart() {
    const cartContainer = document.getElementById('cart-items-wrapper');
    if (!cartContainer) return;

    const user = await getCurrentUser();

    if (!user) {
        renderEmptyState(cartContainer, 'lock', 'يرجى تسجيل الدخول لعرض السلة', 'login.html', 'تسجيل الدخول');
        updateSummary(0);
        return;
    }

    try {
        // Fetch Settings & Items in parallel
        const [settingsRes, itemsRes] = await Promise.all([
            fetchShippingSettings(),
            getCartItems(user.id)
        ]);

        const items = itemsRes.data;

        if (itemsRes.error) throw itemsRes.error;

        if (!items || items.length === 0) {
            renderEmptyState(cartContainer, 'shopping-cart', 'سلة التسوق فارغة', 'products.html', 'تصفح المنتجات');
            updateSummary(0);
            return;
        }

        cartItems = items;
        renderCartItems(items, cartContainer);
        updateSummary(calculateSubtotal(items));

    } catch (error) {
        console.error('Load cart error:', error);
        cartContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color: #ff4757;"></i>
                <h3>حدث خطأ في تحميل السلة</h3>
                <button class="btn-outline" onclick="location.reload()" style="margin-top: 20px;">إعادة المحاولة</button>
            </div>`;
    }
}

// =============================================
// Fetch Shipping Settings
// =============================================
async function fetchShippingSettings() {
    try {
        const { data: settings } = await supabase
            .from('site_settings')
            .select('setting_key, setting_value')
            .in('setting_key', ['shipping-fee', 'free-shipping-min', 'enable-free-shipping']);

        if (settings) {
            const config = {};
            settings.forEach(s => config[s.setting_key] = s.setting_value);

            shippingSettings.fee = Number(config['shipping-fee']) || 25;
            shippingSettings.freeMin = Number(config['free-shipping-min']) || 200;
            shippingSettings.enableFree = config['enable-free-shipping'] === true || config['enable-free-shipping'] === 'true';
        }
    } catch (e) {
        console.error('Error fetching settings:', e);
    }
}

// =============================================
// Render Empty State
// =============================================
function renderEmptyState(container, icon, title, link, btnText) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-${icon}"></i>
            <h3>${title}</h3>
            <a href="${link}" class="btn-outline">${btnText}</a>
        </div>`;
}

// =============================================
// Render Cart Items
// =============================================
function renderCartItems(items, container) {
    container.innerHTML = items.map(item => `
        <div class="cart-item" id="cart-item-${item.id}">
            <div class="cart-item-img">
                <img src="${item.product.image_url || '../assets/images/default-product.png'}" alt="${item.product.title}">
            </div>
            <div class="cart-item-info">
                <div class="item-header">
                    <div class="item-title">${item.product.title}</div>
                    <div class="item-price">${formatPrice(item.product.price)}</div>
                </div>
                <div class="item-controls">
                    <div class="qty-control">
                        <button class="qty-btn" onclick="updateItemQty('${item.id}', ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="text" class="qty-input" value="${item.quantity}" readonly>
                        <button class="qty-btn" onclick="updateItemQty('${item.id}', ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="remove-btn" onclick="removeItem('${item.id}')">
                        <i class="fas fa-trash-alt"></i> حذف
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// =============================================
// Calculate Subtotal
// =============================================
function calculateSubtotal(items) {
    return items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
}

// =============================================
// Update Summary
// =============================================
function updateSummary(subtotal) {
    const subtotalEl = document.getElementById('subtotal-display');
    const shippingEl = document.getElementById('shipping-display');
    const totalEl = document.getElementById('total-display');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);

    // Calculate Shipping
    let shippingFee = shippingSettings.fee;
    if (shippingSettings.enableFree && subtotal >= shippingSettings.freeMin) {
        shippingFee = 0;
    }

    // Update Shipping UI
    if (shippingEl) {
        if (shippingFee === 0) {
            shippingEl.innerHTML = '<span style="color: var(--success-color); font-weight: 700;">مجاني 🎉</span>';
        } else {
            shippingEl.textContent = formatPrice(shippingFee);
        }
    }

    // Update Total
    if (totalEl) totalEl.textContent = formatPrice(subtotal + shippingFee);

    // Update Button
    if (checkoutBtn) {
        if (subtotal > 0) {
            checkoutBtn.disabled = false;
            checkoutBtn.onclick = () => window.location.href = 'checkout.html';
        } else {
            checkoutBtn.disabled = true;
            checkoutBtn.onclick = null;
        }
    }
}

// =============================================
// Update Item Quantity
// =============================================
window.updateItemQty = async (itemId, newQty) => {
    if (newQty < 1) return;

    const loadingToast = showLoading('جاري التحديث...');

    try {
        const { error } = await updateCartQuantity(itemId, newQty);
        if (error) throw error;

        // Update local state instead of full reload for speed
        const item = cartItems.find(i => i.id === itemId);
        if (item) item.quantity = newQty;

        // Re-render
        const container = document.getElementById('cart-items-wrapper');
        renderCartItems(cartItems, container);
        updateSummary(calculateSubtotal(cartItems));

        loadingToast.remove();
    } catch (error) {
        loadingToast.remove();
        console.error('Update quantity error:', error);
        showError('حدث خطأ أثناء تحديث الكمية');
    }
};

// =============================================
// Remove Item
// =============================================
window.removeItem = async (itemId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    const loadingToast = showLoading('جاري الحذف...');

    try {
        const { error } = await removeFromCart(itemId);
        if (error) throw error;

        // Update local state
        cartItems = cartItems.filter(i => i.id !== itemId);

        // Re-render
        const container = document.getElementById('cart-items-wrapper');
        if (cartItems.length === 0) {
            renderEmptyState(container, 'shopping-cart', 'سلة التسوق فارغة', 'products.html', 'تصفح المنتجات');
            updateSummary(0);
        } else {
            renderCartItems(cartItems, container);
            updateSummary(calculateSubtotal(cartItems));
        }

        loadingToast.remove();
        showSuccess('تم حذف المنتج');
    } catch (error) {
        loadingToast.remove();
        console.error('Remove item error:', error);
        showError('حدث خطأ أثناء الحذف');
    }
};

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
});
