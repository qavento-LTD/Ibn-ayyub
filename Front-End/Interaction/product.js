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
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #ff4757; margin-bottom: 20px;"></i>
                <p>رابط المنتج غير صالح</p>
                <a href="products.html" class="btn-outline" style="margin-top: 20px; display: inline-block;">العودة للمنتجات</a>
            </div>`;
        return;
    }

    try {
        const { data: product, error } = await getProductById(productId);

        if (error) throw error;
        if (!product) throw new Error('المنتج غير موجود');

        // Render Product
        renderProductDetails(product, container);

    } catch (err) {
        console.error('Load product error:', err);
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff4757; margin-bottom: 20px;"></i>
                <p>${err.message || 'حدث خطأ في تحميل المنتج'}</p>
                <button class="btn-outline" onclick="location.reload()" style="margin-top: 20px;">إعادة المحاولة</button>
            </div>`;
    }
}

// =============================================
// Render Product Details
// =============================================
function renderProductDetails(product, container) {
    container.innerHTML = `
        <div class="product-container fade-in">
            <!-- Image -->
            <div class="product-image-wrapper">
                <img src="${product.image_url || '../assets/images/default-product.png'}" alt="${product.title}">
            </div>

            <!-- Info -->
            <div class="product-info">
                <div class="product-category">${getCategoryName(product.category)}</div>
                <h1 class="product-title">${product.title}</h1>
                <div class="product-price">${formatPrice(product.price)}</div>
                
                <div class="product-description">
                    ${product.description || 'لا يوجد وصف متاح لهذا المنتج حالياً.'}
                </div>

                <div class="actions-wrapper">
                    <div class="qty-selector">
                        <button class="qty-btn" onclick="updateQty(-1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="text" value="1" class="qty-input" id="qtyInput" readonly>
                        <button class="qty-btn" onclick="updateQty(1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>

                    <button class="add-to-cart-btn" id="addToCartBtn">
                        <i class="fas fa-shopping-cart"></i>
                        أضف إلى السلة
                    </button>
                </div>
            </div>
        </div>`;

    // Attach Event Listeners
    attachEventListeners(product);
}

// =============================================
// Helper: Get Category Name
// =============================================
function getCategoryName(cat) {
    const names = {
        'gifts': 'هدايا',
        'antiques': 'تحف',
        'art': 'فنون'
    };
    return names[cat] || cat || 'عام';
}

// =============================================
// Update Quantity
// =============================================
window.updateQty = (change) => {
    const input = document.getElementById('qtyInput');
    if (!input) return;

    let val = parseInt(input.value) || 1;
    val = Math.max(1, val + change);
    input.value = val;
};

// =============================================
// Attach Event Listeners
// =============================================
function attachEventListeners(product) {
    const addBtn = document.getElementById('addToCartBtn');

    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const qty = parseInt(document.getElementById('qtyInput').value, 10) || 1;
            const user = await getCurrentUser();

            if (!user) {
                showError('يرجى تسجيل الدخول لإضافة منتجات للسلة');
                setTimeout(() => window.location.href = 'login.html', 1500);
                return;
            }

            // UI Feedback
            const originalContent = addBtn.innerHTML;
            addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';
            addBtn.disabled = true;

            try {
                const { error } = await addToCart(user.id, product.id, qty);
                if (error) throw error;

                showSuccess(`تمت إضافة ${qty}x "${product.title}" إلى السلة`);
                addBtn.innerHTML = '<i class="fas fa-check"></i> تمت الإضافة';
                addBtn.style.background = '#00b894';

                // Update cart count
                if (window.updateCartCount) window.updateCartCount();

                setTimeout(() => {
                    addBtn.innerHTML = originalContent;
                    addBtn.style.background = '';
                    addBtn.disabled = false;
                }, 2000);

            } catch (e) {
                console.error('Add to cart error:', e);
                showError('حدث خطأ في إضافة المنتج');
                addBtn.innerHTML = originalContent;
                addBtn.disabled = false;
            }
        });
    }
}

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    loadProduct();
});
