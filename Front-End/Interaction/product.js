// =============================================
// Product Detail Page JavaScript
// =============================================

import { getProductById, addToCart, getCurrentUser } from '../../js/supabase-client.js';
import { showSuccess, showError, showLoading } from '../../js/toast.js';
import { formatPrice } from '../../js/utils.js';

// =============================================
// Get Query Parameter
// =============================================
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// =============================================
// Load Product Details
// =============================================
async function loadProduct() {
    const productId = getQueryParam('id');
    const container = document.getElementById('product-content');

    if (!productId || !container) {
        container.innerHTML = '<p class="loading-skeleton">معرف المنتج غير صالح.</p>';
        return;
    }

    try {
        const { data: product, error } = await getProductById(productId);

        if (error) throw error;
        if (!product) throw new Error('المنتج غير موجود');

        // Build product detail HTML
        const html = `
            <div class="product-detail-container">
                <div class="product-image-container">
                    ${product.image_url && product.image_url.startsWith('http')
                ? `<img src="${product.image_url}" alt="${product.title}">`
                : `<i class="fas fa-gift"></i>`
            }
                </div>
                <div class="product-info-container">
                    <div class="product-category">${product.category || 'عام'}</div>
                    <h1 class="product-title-large">${product.title}</h1>
                    <div class="product-price-large">${formatPrice(product.price)}</div>
                    <p class="product-description-large">${product.description || 'لا يوجد وصف لهذا المنتج.'}</p>
                    <div class="actions">
                        <div class="quantity-selector">
                            <button class="qty-btn" onclick="updateQty(-1)">−</button>
                            <input type="text" value="1" class="qty-input" id="qtyInput" readonly>
                            <button class="qty-btn" onclick="updateQty(1)">+</button>
                        </div>
                        <button class="add-to-cart-large" id="addToCartBtn">
                            <i class="fas fa-shopping-cart"></i>
                            أضف إلى السلة
                        </button>
                    </div>
                </div>
            </div>`;

        container.innerHTML = html;

        // Attach add-to-cart handler
        const addBtn = document.getElementById('addToCartBtn');
        addBtn.addEventListener('click', async () => {
            const qty = parseInt(document.getElementById('qtyInput').value, 10) || 1;
            const user = await getCurrentUser();

            if (!user) {
                showError('يرجى تسجيل الدخول لإضافة منتجات للسلة');
                setTimeout(() => { window.location.href = 'login.html'; }, 1500);
                return;
            }

            const originalText = addBtn.innerHTML;
            addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';
            addBtn.disabled = true;

            try {
                const { error } = await addToCart(user.id, product.id, qty);
                if (error) throw error;

                showSuccess(`تمت إضافة ${qty}x "${product.title}" إلى السلة`);
                addBtn.innerHTML = '<i class="fas fa-check"></i> تمت الإضافة';

                // Update cart count
                if (window.updateCartCount) {
                    window.updateCartCount();
                }

                setTimeout(() => {
                    addBtn.innerHTML = originalText;
                    addBtn.disabled = false;
                }, 2000);

            } catch (e) {
                console.error('Add to cart error:', e);
                showError(e.message || 'حدث خطأ في إضافة المنتج');
                addBtn.innerHTML = originalText;
                addBtn.disabled = false;
            }
        });

    } catch (err) {
        console.error('Load product error:', err);
        container.innerHTML = `
            <div class="loading-skeleton">
                <i class="fas fa-exclamation-triangle" style="color: var(--primary);"></i>
                <p>${err.message || 'حدث خطأ في تحميل المنتج'}</p>
                <button class="btn" onclick="location.reload()">إعادة المحاولة</button>
            </div>`;
    }
}

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛍️ Product Detail Page - Initializing...');
    loadProduct();
    console.log('✅ Product detail page ready!');
});
