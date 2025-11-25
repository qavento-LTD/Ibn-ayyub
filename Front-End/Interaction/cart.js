// =============================================
// Cart Page JavaScript
// =============================================

import { getCartItems, updateCartQuantity, removeFromCart, getCurrentUser } from '../../js/supabase-client.js';
import { showSuccess, showError, showLoading } from '../../js/toast.js';
import { formatPrice } from '../../js/utils.js';

// =============================================
// Load Cart Items
// =============================================
async function loadCart() {
    const cartContainer = document.getElementById('full-cart-items');
    if (!cartContainer) return;

    const user = await getCurrentUser();

    if (!user) {
        cartContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-lock" style="font-size: 4rem; color: #dee2e6; margin-bottom: 20px; display: block;"></i>
                <h3 style="color: var(--text-main); margin-bottom: 10px;">يرجى تسجيل الدخول لعرض السلة</h3>
                <p style="color: var(--text-light); margin-bottom: 30px;">سجل دخول لإكمال طلبك</p>
                <a href="login.html" class="btn" style="display: inline-block; padding: 12px 40px; background: var(--primary); color: white; text-decoration: none; border-radius: 50px; font-weight: 700;">تسجيل الدخول</a>
            </div>`;
        updateSummary(0, 0);
        return;
    }

    try {
        const { data: items, error } = await getCartItems(user.id);

        if (error) throw error;

        if (!items || items.length === 0) {
            cartContainer.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-shopping-cart" style="font-size: 4rem; color: #dee2e6; margin-bottom: 20px; display: block;"></i>
                    <h3 style="color: var(--text-main); margin-bottom: 10px;">سلة التسوق فارغة</h3>
                    <p style="color: var(--text-light); margin-bottom: 30px;">ابدأ التسوق الآن وأضف منتجاتك المفضلة</p>
                    <a href="products.html" class="btn" style="display: inline-block; padding: 12px 40px; background: var(--primary); color: white; text-decoration: none; border-radius: 50px; font-weight: 700;">تصفح المنتجات</a>
                </div>`;
            updateSummary(0, 0);
            return;
        }

        renderCartItems(items);
    } catch (error) {
        console.error('Load cart error:', error);
        cartContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--primary); margin-bottom: 20px; display: block;"></i>
                <h3 style="color: var(--text-main);">حدث خطأ في تحميل السلة</h3>
                <button class="btn" onclick="location.reload()" style="margin-top: 20px;">إعادة المحاولة</button>
            </div>`;
    }
}

// =============================================
// Render Cart Items
// =============================================
function renderCartItems(items) {
    const cartContainer = document.getElementById('full-cart-items');
    let subtotal = 0;
    let totalItems = 0;

    const html = items.map(item => {
        const product = item.product;
        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;
        totalItems += item.quantity;

        return `
            <div class="cart-item" id="cart-item-${item.id}">
                <div class="cart-item-img">
                    ${product.image_url && product.image_url.startsWith('http')
                ? `<img src="${product.image_url}" alt="${product.title}">`
                : `<i class="fas fa-gift" style="font-size: 2.5rem; color: #dee2e6;"></i>`
            }
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${product.title}</div>
                    <div class="cart-item-price">${formatPrice(product.price)}</div>
                </div>
                <div class="cart-item-actions">
                    <div class="qty-control">
                        <button onclick="updateItemQty(${item.id}, ${item.quantity - 1})">−</button>
                        <input type="text" value="${item.quantity}" readonly>
                        <button onclick="updateItemQty(${item.id}, ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeItem(${item.id})">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>`;
    }).join('');

    cartContainer.innerHTML = html;
    updateSummary(subtotal, totalItems);
}

// =============================================
// Update Summary
// =============================================
function updateSummary(subtotal, totalItems) {
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total-price');
    const checkoutBtn = document.querySelector('.checkout-btn');

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (totalEl) totalEl.textContent = formatPrice(subtotal);

    if (checkoutBtn) {
        if (totalItems > 0) {
            checkoutBtn.onclick = () => window.location.href = 'checkout.html';
            checkoutBtn.disabled = false;
            checkoutBtn.style.opacity = '1';
            checkoutBtn.style.cursor = 'pointer';
        } else {
            checkoutBtn.onclick = null;
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
        }
    }
}

// =============================================
// Update Item Quantity
// =============================================
window.updateItemQty = async (itemId, newQty) => {
    if (newQty < 1) return;

    const loadingToast = showLoading('جاري تحديث الكمية...');

    try {
        const { error } = await updateCartQuantity(itemId, newQty);
        if (error) throw error;

        loadingToast.remove();
        showSuccess('تم تحديث الكمية');
        loadCart(); // Reload
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
    if (!confirm('هل أنت متأكد من حذف هذا المنتج من السلة؟')) return;

    const loadingToast = showLoading('جاري حذف المنتج...');

    try {
        const { error } = await removeFromCart(itemId);
        if (error) throw error;

        loadingToast.remove();
        showSuccess('تم حذف المنتج من السلة');
        loadCart(); // Reload
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
    console.log('🛒 Cart Page - Initializing...');
    loadCart();
    console.log('✅ Cart page ready!');
});
