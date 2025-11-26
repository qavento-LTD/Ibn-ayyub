// =============================================
// Products Page JavaScript
// =============================================

import { getProducts, addToCart, getCurrentUser } from '../../js/supabase-client.js';
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
    grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري تحميل المنتجات...</p></div>';

    try {
        const { data: products, error } = await getProducts(category === 'all' ? null : category);

        if (error) throw error;

        if (!products || products.length === 0) {
            grid.innerHTML = '<div class="loading"><p>لا توجد منتجات في هذا القسم حالياً</p></div>';
            return;
        }

        grid.innerHTML = products.map(product => `
            <div class="product-card fade-in-up" data-id="${product.id}">
                <div class="product-img">
                    ${product.image_url && product.image_url.startsWith('http')
                ? `<img src="${product.image_url}" alt="${product.title}" loading="lazy">`
                : `<i class="fas fa-gift"></i>`
            }
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    ${product.description ? `<p style="color: var(--gray-dark); font-size: 0.9rem; margin: 8px 0;">${product.description.substring(0, 80)}...</p>` : ''}
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <a href="product.html?id=${product.id}" class="btn-outline" style="flex: 1; text-align: center; padding: 12px; font-size: 0.9rem;border: 1px solid red">
                            التفاصيل
                        </a>
                        <button class="add-to-cart" data-id="${product.id}" data-title="${product.title}" style="flex: 2;">
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Re-attach event listeners
        attachCartListeners();
        attachCardClickListeners();

        // Trigger animations
        setTimeout(() => {
            document.querySelectorAll('.fade-in-up').forEach(el => {
                el.classList.add('visible');
            });
        }, 100);

    } catch (error) {
        console.error('Load products error:', error);
        grid.innerHTML = `
            <div class="loading" style="grid-column: 1/-1;">
                <p style="color: var(--primary);">حدث خطأ في تحميل المنتجات</p>
                <button class="btn" onclick="location.reload()">إعادة المحاولة</button>
            </div>
        `;
    }
}

// =============================================
// Attach Cart Listeners
// =============================================
function attachCartListeners() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        // Clone to remove old listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            const id = e.target.closest('.add-to-cart').dataset.id;
            const title = e.target.closest('.add-to-cart').dataset.title;

            const user = await getCurrentUser();

            if (!user) {
                showError('يرجى تسجيل الدخول لإضافة منتجات للسلة');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
                return;
            }

            // Show loading state
            const button = e.target.closest('.add-to-cart');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';
            button.disabled = true;

            try {
                const { error } = await addToCart(user.id, id, 1);

                if (error) throw error;

                showSuccess(`تمت إضافة "${title}" إلى السلة`);
                button.innerHTML = '<i class="fas fa-check"></i> تمت الإضافة';

                // Update cart count
                if (window.updateCartCount) {
                    window.updateCartCount();
                }


            } catch (error) {
                console.error('Add to cart error:', error);
                showError('حدث خطأ في إضافة المنتج');
                button.innerHTML = originalText;
            } finally {
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2000);
            }
        });
    });
}

// =============================================
// Click on Product Card to Add to Cart
// =============================================
function attachCardClickListeners() {
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            // Ignore clicks on inner links or buttons
            if (e.target.closest('a') || e.target.closest('button')) return;
            const id = card.dataset.id;
            const title = card.querySelector('.product-title')?.textContent || 'المنتج';
            const user = await getCurrentUser();
            if (!user) {
                showError('يرجى تسجيل الدخول لإضافة منتجات للسلة');
                setTimeout(() => { window.location.href = 'login.html'; }, 1500);
                return;
            }
            const loading = showLoading('جاري إضافة المنتج إلى السلة...');
            try {
                const { error } = await addToCart(user.id, id, 1);
                if (error) throw error;
                showSuccess(`تمت إضافة "${title}" إلى السلة`);
                if (window.updateCartCount) window.updateCartCount();
            } catch (err) {
                console.error('Add to cart error:', err);
                showError(err.message || 'خطأ في إضافة المنتج');
            } finally {
                loading.remove();
            }
        });
    });
}


// =============================================
// Filter Logic
// =============================================
function initFilters() {
    const filtersContainer = document.getElementById('filters');
    if (!filtersContainer) return;

    filtersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            // Remove active class from all
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));

            // Add active to clicked
            e.target.classList.add('active');

            // Load products
            const category = e.target.dataset.category;
            loadProducts(category);
        }
    });
}

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛍️ Products Page - Initializing...');
    // Attach card click listeners after products are loaded
    // This line was added by the user's instruction, but the function attachCardClickListeners() is not defined.
    // Assuming it's a placeholder or intended to be added elsewhere.
    // For now, it's commented out to maintain syntactical correctness.
    // attachCardClickListeners();

    initFilters();
    loadProducts();

    console.log('✅ Products page ready!');
});

// Export for use in other modules
export { loadProducts, attachCartListeners };
