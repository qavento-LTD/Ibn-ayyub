// =============================================
// Main JavaScript - Ibn Ayyub Gift Store
// =============================================

import { addToCart, getCurrentUser, getProducts } from '../../js/supabase-client.js';
import { showSuccess, showError, showLoading } from '../../js/toast.js';
import { formatPrice } from '../../js/utils.js';

// =============================================
// Menu Toggle
// =============================================
function initMenu() {
    const menuBtn = document.getElementById('menu-btn');
    const nav = document.querySelector('.nav');

    if (!menuBtn || !nav) return;

    function toggleMenu() {
        const isActive = menuBtn.classList.toggle('active');
        nav.classList.toggle('open', isActive);
    }

    menuBtn.addEventListener('click', toggleMenu);

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !menuBtn.contains(e.target) && nav.classList.contains('open')) {
            toggleMenu();
        }
    });

    // Close menu on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('open')) {
            toggleMenu();
        }
    });
}

// =============================================
// Cart Toggle
// =============================================
function initCartToggle() {
    const cartBtn = document.getElementById('cart-btn');
    const cartContainer = document.querySelector('.cart-container');
    const closeBtn = document.getElementById('closeCart');

    if (!cartBtn || !cartContainer) return;

    function toggleCart() {
        cartContainer.classList.toggle('active');
    }

    cartBtn.addEventListener('click', toggleCart);

    if (closeBtn) {
        closeBtn.addEventListener('click', toggleCart);
    }

    // Close cart when clicking outside
    document.addEventListener('click', (e) => {
        if (!cartContainer.contains(e.target) && !cartBtn.contains(e.target) && cartContainer.classList.contains('active')) {
            toggleCart();
        }
    });
}

// =============================================
// Load Cart Dropdown
// =============================================
async function loadCartDropdown() {
    const cartItemsWrapper = document.querySelector('.cart-items-wrapper');
    if (!cartItemsWrapper) return;

    const user = await getCurrentUser();
    if (!user) {
        cartItemsWrapper.innerHTML = '<div class="empty-cart-msg" style="text-align: center; padding: 20px; color: var(--text-light);">سجل دخول لعرض السلة</div>';
        return;
    }

    try {
        const { getCartItems } = await import('../../js/supabase-client.js');
        const { data: items, error } = await getCartItems(user.id);

        if (error) throw error;

        if (!items || items.length === 0) {
            cartItemsWrapper.innerHTML = '<div class="empty-cart-msg" style="text-align: center; padding: 20px; color: var(--text-light);">سلة التسوق فارغة</div>';
            return;
        }

        const html = items.map(item => {
            const product = item.product;
            return `
                <div style="display: flex; gap: 10px; padding: 12px; border-bottom: 1px solid #f0f0f0;">
                    <div style="width: 50px; height: 50px; border-radius: 8px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        ${product.image_url && product.image_url.startsWith('http')
                    ? `<img src="${product.image_url}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`
                    : `<i class="fas fa-gift" style="color: #dee2e6;"></i>`
                }
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${product.title}</div>
                        <div style="font-size: 0.85rem; color: var(--text-light);">الكمية: ${item.quantity}</div>
                    </div>
                    <div style="font-weight: 700; color: var(--primary); font-size: 0.9rem;">${formatPrice(product.price)}</div>
                </div>`;
        }).join('');

        cartItemsWrapper.innerHTML = html + `
            <div style="padding: 15px; text-align: center;">
                <a href="pages/cart.html" class="btn" style="display: inline-block; width: 100%; padding: 12px; background: var(--primary); color: white; text-decoration: none; border-radius: 8px; font-weight: 700;">عرض السلة</a>
            </div>`;

    } catch (error) {
        console.error('Load cart dropdown error:', error);
        cartItemsWrapper.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-light);">حدث خطأ</div>';
    }
}


// =============================================
// Add to Cart Functionality
// =============================================
function initCart() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart');

    addToCartButtons.forEach(button => {
        // Clone to remove old listeners
        const newBtn = button.cloneNode(true);
        button.parentNode.replaceChild(newBtn, button);

        newBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            const id = this.dataset.id;
            const title = this.dataset.title;

            // Check if user is logged in
            const user = await getCurrentUser();
            if (!user) {
                showError('يرجى تسجيل الدخول لإضافة منتجات للسلة');
                setTimeout(() => {
                    window.location.href = 'pages/login.html';
                }, 1500);
                return;
            }

            // Show loading state
            const originalText = this.textContent;
            this.textContent = 'جاري الإضافة...';
            this.disabled = true;

            try {
                const { error } = await addToCart(user.id, id, 1);

                if (error) throw error;

                // Success
                showSuccess(`تمت إضافة "${title}" إلى السلة`);
                this.textContent = '✓ تمت الإضافة';

                // Update cart count
                updateCartCount();
                // Reload cart dropdown to show new item
                loadCartDropdown();

            } catch (error) {
                console.error('Add to cart error:', error);
                showError('حدث خطأ في إضافة المنتج');
                this.textContent = originalText;
            } finally {
                setTimeout(() => {
                    this.textContent = originalText;
                    this.disabled = false;
                }, 2000);
            }
        });
    });
}

// =============================================
// Update Cart Count
// =============================================
async function updateCartCount() {
    const cartCountEl = document.getElementById('cart-count');
    if (!cartCountEl) return;

    try {
        const user = await getCurrentUser();
        if (!user) {
            cartCountEl.textContent = '0';
            return;
        }

        const { getCartItems } = await import('../../js/supabase-client.js');
        const { data: items } = await getCartItems(user.id);

        const count = items ? items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        cartCountEl.textContent = count;

        // Refresh dropdown
        loadCartDropdown();

    } catch (error) {
        console.error('Update cart count error:', error);
        cartCountEl.textContent = '0';
    }
}

// =============================================
// Load Featured Products
// =============================================
async function loadFeaturedProducts() {
    const grid = document.getElementById('featuredProductsGrid');
    if (!grid) return;

    // Show loading
    grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري تحميل المنتجات...</p></div>';

    try {
        const { data: products, error } = await getProducts();

        if (error) throw error;

        if (!products || products.length === 0) {
            grid.innerHTML = '<div class="loading"><p>لا توجد منتجات حالياً</p></div>';
            return;
        }

        // Show top 4 featured products
        const featured = products.filter(p => p.featured).slice(0, 4);
        const displayProducts = featured.length > 0 ? featured : products.slice(0, 4);

        grid.innerHTML = displayProducts.map(product => `
            <div class="product-card fade-in-up">
                <div class="product-img">
                    ${product.image_url && product.image_url.startsWith('http')
                ? `<img src="${product.image_url}" alt="${product.title}" loading="lazy">`
                : `<i class="fas fa-gift"></i>`
            }
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <a href="pages/product.html?id=${product.id}" class="btn-outline" style="display:flex; text-align:center; margin-bottom:10px; color:var(--primary); border-color: red; justify-content: center; align-items: center;">التفاصيل</a>
                    <button class="add-to-cart" data-id="${product.id}" data-title="${product.title}">
                        <i class="fas fa-shopping-cart"></i> أضف إلى السلة
                    </button>
                </div>
            </div>
        `).join('');

        // Re-init cart listeners
        initCart();

        // Trigger scroll animations
        initScrollAnimations();

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
// Load Home Videos
// =============================================
async function loadHomeVideos() {
    const grid = document.getElementById('homeVideosGrid');
    if (!grid) return;

    try {
        const { getVideos } = await import('../../js/supabase-client.js');
        const { data: videos, error } = await getVideos();

        if (error) throw error;

        if (!videos || videos.length === 0) {
            grid.innerHTML = '<div class="loading" style="grid-column: 1/-1;"><p>لا توجد فيديوهات حالياً</p></div>';
            return;
        }

        // Show top 3 videos
        const displayVideos = videos.slice(0, 3);

        grid.innerHTML = displayVideos.map(video => `
            <div class="video-card" style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05); transition: transform 0.3s; cursor: pointer;">
                <div style="position: relative; height: 200px;">
                    <img src="${video.thumbnail_url || 'assets/images/logo.png'}" alt="${video.title}" style="width: 100%; height: 100%; object-fit: cover;">
                    <a href="pages/video.html" class="play-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; text-decoration: none;">
                        <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">
                            <i class="fas fa-play"></i>
                        </div>
                    </a>
                </div>
                <div style="padding: 20px;">
                    <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 10px; color: var(--text-main);">${video.title}</h3>
                    <div style="display: flex; justify-content: space-between; color: var(--text-light); font-size: 0.9rem;">
                        <span><i class="far fa-eye"></i> ${video.views_count || 0}</span>
                        <span><i class="far fa-clock"></i> ${formatVideoDuration(video.duration || 0)}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Add hover effect
        const cards = grid.querySelectorAll('.video-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
                card.querySelector('.play-overlay').style.opacity = '1';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.querySelector('.play-overlay').style.opacity = '0';
            });
        });

    } catch (error) {
        console.error('Load home videos error:', error);
        grid.innerHTML = '<div class="loading" style="grid-column: 1/-1;"><p>حدث خطأ في تحميل الفيديوهات</p></div>';
    }
}

function formatVideoDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// =============================================
// Scroll Animations
// =============================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elements = document.querySelectorAll('.fade-in-up');
    elements.forEach(el => observer.observe(el));
}

// =============================================
// Header Scroll Effect
// =============================================
function initHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
}

// =============================================
// Auth State Management
// =============================================
async function initAuthState() {
    const authSection = document.getElementById('auth-section');
    if (!authSection) return;

    try {
        const user = await getCurrentUser();

        if (user) {
            const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'المستخدم';
            const userEmail = user.email;

            authSection.innerHTML = `
                <div class="user-menu-wrapper" style="position: relative;">
                    <div class="user-menu-trigger" id="user-menu-trigger" style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px 12px; border-radius: var(--radius-lg); transition: var(--transition-base);">
                        <i class="fas fa-user-circle" style="font-size: 1.5rem; color: var(--primary);"></i>
                     <!--   <span style="font-weight: 600; color: var(--black);"></span> -->
                        <i class="fas fa-chevron-down" style="font-size: 0.8rem; color: var(--gray-dark);"></i>
                    </div>
                    
                    <div class="user-dropdown" id="user-dropdown" style="display: none; position: absolute; top: 100%; left: 0; margin-top: 8px; background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); min-width: 250px; z-index: 1000; overflow: hidden;">
                        <div style="padding: 16px; border-bottom: 1px solid var(--gray);">
                            <div style="font-weight: 700; color: var(--black); margin-bottom: 4px;">${userName}</div>
                            <div style="font-size: 0.85rem; color: var(--gray-dark);">${userEmail}</div>
                        </div>
                        
                        <div class="dropdown-menu">
                            <a href="/../pages/profile.html" class="dropdown-item">
                                <i class="fas fa-user"></i>
                                <span>الملف الشخصي</span>
                            </a>
                            <a href="/../pages/orders.html" class="dropdown-item">
                                <i class="fas fa-shopping-bag"></i>
                                <span>طلباتي</span>
                            </a>
                            <a href="/../pages/settings.html" class="dropdown-item">
                                <i class="fas fa-cog"></i>
                                <span>الإعدادات</span>
                            </a>
                            <div class="dropdown-divider"></div>
                            <a href="/../pages/admin/" class="dropdown-item admin-only" id="admin-link" style="display: none;">
                                <i class="fas fa-shield-alt"></i>
                                <span>لوحة التحكم</span>
                            </a>
                            <button class="dropdown-item" id="logout-btn" style="width: 100%; text-align: right; color: var(--primary);">
                                <i class="fas fa-sign-out-alt"></i>
                                <span>تسجيل الخروج</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Toggle dropdown
            const trigger = document.getElementById('user-menu-trigger');
            const dropdown = document.getElementById('user-dropdown');

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                dropdown.style.display = 'none';
            });

            // Prevent dropdown from closing when clicking inside
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // Logout functionality
            const logoutBtn = document.getElementById('logout-btn');
            logoutBtn.addEventListener('click', async () => {
                const { signOut } = await import('../../js/supabase-client.js');
                const loadingToast = showLoading('جاري تسجيل الخروج...');

                try {
                    const { error } = await signOut();
                    if (error) throw error;

                    loadingToast.remove();
                    showSuccess('تم تسجيل الخروج بنجاح');

                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } catch (error) {
                    loadingToast.remove();
                    showError('حدث خطأ في تسجيل الخروج');
                }
            });

            // Check if user is admin
            const { isAdmin } = await import('../../js/utils.js');
            const { supabase } = await import('../../js/supabase-client.js');
            const adminStatus = await isAdmin(supabase);

            if (adminStatus) {
                const adminLink = document.getElementById('admin-link');
                if (adminLink) adminLink.style.display = 'flex';
            }

        } else {
            authSection.innerHTML = `
                <a href="pages/login.html" style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--primary); color: var(--white); border-radius: var(--radius-lg); font-weight: 600; transition: var(--transition-base);">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>تسجيل الدخول</span>
                </a>
            `;
        }
    } catch (error) {
        console.error('Auth state error:', error);
    }
}

// =============================================
// Newsletter Form
// =============================================
function initNewsletter() {
    const form = document.querySelector('.newsletter-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = form.querySelector('input[type="email"]').value;

        if (!email) {
            showError('يرجى إدخال البريد الإلكتروني');
            return;
        }

        const loadingToast = showLoading('جاري الاشتراك...');

        // Simulate API call (replace with actual Supabase call)
        setTimeout(() => {
            loadingToast.remove();
            showSuccess('تم الاشتراك بنجاح! شكراً لك');
            form.reset();
        }, 1500);
    });
}

// =============================================
// Initialize Everything
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    console.log('🎉 Ibn Ayyub Store - Initializing...');

    initMenu();
    initCartToggle();
    initHeaderScroll();
    initScrollAnimations();
    initAuthState();
    initNewsletter();
    loadFeaturedProducts();
    loadHomeVideos();
    updateCartCount();
    loadCartDropdown();

    console.log('✅ Initialization complete!');
});

// Export for use in other modules
export {
    initCart,
    updateCartCount,
    loadFeaturedProducts
};