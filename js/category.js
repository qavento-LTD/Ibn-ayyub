import { supabase } from './supabase-client.js';

// Get category from URL
const urlParams = new URLSearchParams(window.location.search);
const categorySlug = urlParams.get('category');

// Category mapping
const CATEGORIES = {
    'love-gifts': {
        name: 'هدايا الحب',
        icon: 'fas fa-heart',
        color: '#E63946',
        description: 'هدايا رومانسية تعبر عن مشاعرك'
    },
    'birthday-gifts': {
        name: 'أعياد الميلاد',
        icon: 'fas fa-birthday-cake',
        color: '#FF6B9D',
        description: 'هدايا مميزة لأعياد الميلاد'
    },
    'wedding-gifts': {
        name: 'هدايا الزفاف',
        icon: 'fas fa-glass-cheers',
        color: '#FFD700',
        description: 'هدايا فاخرة للعرسان'
    },
    'graduation-gifts': {
        name: 'هدايا التخرج',
        icon: 'fas fa-graduation-cap',
        color: '#4CAF50',
        description: 'هدايا تذكارية للخريجين'
    },
    'home-gifts': {
        name: 'هدايا المنزل',
        icon: 'fas fa-home',
        color: '#457B9D',
        description: 'هدايا عملية للمنزل'
    },
    'kids-gifts': {
        name: 'هدايا الأطفال',
        icon: 'fas fa-baby',
        color: '#FF9800',
        description: 'هدايا ممتعة للأطفال'
    }
};

// Load products by category
export async function loadCategoryProducts(category) {
    const categoryInfo = CATEGORIES[category];
    if (!categoryInfo) {
        console.error('Invalid category:', category);
        return;
    }

    // Update page title and header
    updatePageHeader(categoryInfo);

    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i><p style="margin-top: 15px;">جاري تحميل المنتجات...</p></div>';

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('category', category)
            .order('created_at', { ascending: false });

        if (error) throw error;

        grid.innerHTML = '';

        if (!products || products.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <i class="${categoryInfo.icon}" style="font-size: 4rem; color: ${categoryInfo.color}; opacity: 0.3; margin-bottom: 20px;"></i>
                    <h3 style="font-size: 1.5rem; color: #666; margin-bottom: 10px;">لا توجد منتجات في هذا القسم حالياً</h3>
                    <p style="color: #999;">تابعنا لمشاهدة المنتجات الجديدة قريباً</p>
                    <a href="../../index.html" style="display: inline-block; margin-top: 20px; padding: 12px 30px; background: var(--primary); color: white; text-decoration: none; border-radius: 50px; font-weight: 700;">العودة للرئيسية</a>
                </div>
            `;
            return;
        }

        products.forEach(product => {
            const card = createProductCard(product);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading products:', error);
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #f44336;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i>
                <p>حدث خطأ في تحميل المنتجات</p>
            </div>
        `;
    }
}

// Update page header
function updatePageHeader(categoryInfo) {
    const titleEl = document.getElementById('category-title');
    const descEl = document.getElementById('category-description');
    const iconEl = document.getElementById('category-icon');

    if (titleEl) titleEl.textContent = categoryInfo.name;
    if (descEl) descEl.textContent = categoryInfo.description;
    if (iconEl) {
        iconEl.className = categoryInfo.icon;
        iconEl.style.color = categoryInfo.color;
    }

    // Update page title
    document.title = `${categoryInfo.name} - هديتي`;
}

// Create product card
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
        <div class="product-image">
            ${product.image_url
            ? `<img src="${product.image_url}" alt="${product.title}" loading="lazy">`
            : '<i class="fas fa-gift"></i>'}
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            <p class="product-description">${product.description || ''}</p>
            <div class="product-footer">
                <span class="product-price">${product.price} ر.س</span>
                <button class="add-to-cart-btn" onclick="addToCart('${product.id}')">
                    <i class="fas fa-shopping-cart"></i>
                    إضافة
                </button>
            </div>
        </div>
    `;

    // Click to view details
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.add-to-cart-btn')) {
            window.location.href = `../product.html?id=${product.id}`;
        }
    });

    return card;
}

// Add to cart (placeholder - will use existing cart system)
window.addToCart = function (productId) {
    // This will be handled by the main cart system
    console.log('Add to cart:', productId);
    // You can import and use the existing addToCart function here
};

// Auto-load on page load
document.addEventListener('DOMContentLoaded', () => {
    if (categorySlug) {
        loadCategoryProducts(categorySlug);
    }
});

// Export for use in other files
export { CATEGORIES };
