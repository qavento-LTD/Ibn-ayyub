// =============================================
// Products Page JavaScript
// =============================================

import { getProductById, getProducts, addToCart, getCurrentUser } from '../../js/supabase-client.js';
import { showSuccess, showError, showLoading } from '../../js/toast.js';
import { formatPrice } from '../../js/utils.js';

let currentCategory = 'all';

// =============================================
// Load Products
// =============================================
async function loadProducts(category = 'all') {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    currentCategory = category;

    // Show loading
    grid.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>جاري تحميل المنتجات...</p>
        </div>`;

    try {
        const { data: products, error } = await getProducts(category === 'all' ? null : category);

        if (error) throw error;

        if (!products || products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open" style="font-size: 4rem; color: #dfe6e9; margin-bottom: 20px;"></i>
                    <h3>لا توجد منتجات في هذا القسم</h3>
                    <p>يرجى التحقق من الأقسام الأخرى</p>
                </div>`;
            return;
        }

        renderProducts(products, grid);

    } catch (error) {
        console.error('Load products error:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle" style="font-size: 4rem; color: #ff4757; margin-bottom: 20px;"></i>
                <h3>حدث خطأ في تحميل المنتجات</h3>
                <button class="filter-btn active" onclick="location.reload()" style="margin-top: 20px;">إعادة المحاولة</button>
            </div>`;
    }
}

// =============================================
// Render Products
// =============================================
function renderProducts(products, grid) {
    grid.innerHTML = products.map((product, index) => `
        <div class="product-card fade-in" style="animation-delay: ${index * 0.1}s">
            <div class="product-img-wrapper">
                <img src="${product.image_url || '../assets/images/default-product.png'}" alt="${product.title}" loading="lazy">
                ${product.featured ? '<span class="product-badge"><i class="fas fa-star"></i> مميز</span>' : ''}
            </div>
            
            <div class="product-info">
                <div class="product-category">${getCategoryName(product.category)}</div>
                <h3 class="product-title">${product.title}</h3>
                <div class="product-price">${formatPrice(product.price)}</div>
                
                <div class="card-actions">
                    <button class="btn-add-cart" onclick="handleAddToCart('${product.id}', '${product.title}', this)">
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                    <a href="product.html?id=${product.id}" class="btn-details" title="التفاصيل">
                        <i class="fas fa-arrow-left"></i>
                    </a>
                </div>
            </div>
        </div>
    `).join('');
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
    return names[cat] || cat;
}

// =============================================
// Handle Add to Cart
// =============================================
window.handleAddToCart = async (productId, productTitle, btn) => {
    const user = await getCurrentUser();

    if (!user) {
        showError('يرجى تسجيل الدخول لإضافة منتجات للسلة');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    // UI Feedback
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const { error } = await addToCart(user.id, productId, 1);

        if (error) throw error;

        showSuccess(`تمت إضافة "${productTitle}" إلى السلة`);
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.background = '#00b894';

        // Update cart count globally if available
        if (window.updateCartCount) window.updateCartCount();

        // Reset button after 2 seconds
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.style.background = '';
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Add to cart error:', error);
        showError('حدث خطأ أثناء الإضافة');
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
};

// =============================================
// Filter Logic
// =============================================
function initFilters() {
    const filtersContainer = document.getElementById('filters');
    if (!filtersContainer) return;

    filtersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (btn) {
            // Update UI
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Load Data
            loadProducts(btn.dataset.category);
        }
    });
}

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    loadProducts();
});
