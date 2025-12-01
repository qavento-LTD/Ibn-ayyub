// Admin Layout Manager
// Handles dynamic injection of Sidebar, Header, and Theme for consistent design.

const AdminLayout = {
    init() {
        this.injectTheme();
        this.injectSidebar();
        this.injectHeader();
        this.highlightActiveLink();
        this.setupMobileMenu();
    },

    injectTheme() {
        // Check if admin-theme.css is already linked
        const existingLink = document.querySelector('link[href*="admin-theme.css"]');
        if (!existingLink) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            // Determine path relative to current page
            // Assuming pages are in /pages/admin/ or similar depth
            // We'll try to find the root or use absolute/relative path guessing
            // A safer bet for this project structure is usually ../../css/
            link.href = '../../css/admin-theme.css';
            document.head.appendChild(link);
        }

        // Inject FontAwesome if missing
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fa = document.createElement('link');
            fa.rel = 'stylesheet';
            fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(fa);
        }
    },

    injectSidebar() {
        const sidebarHTML = `
            <aside class="sidebar">
                <div class="sidebar-brand">
                    <img src="../../assets/images/logo.png" alt="Logo" onerror="this.style.display='none'">
                    <h2>هديتي</h2>
                </div>
                <div class="sidebar-menu">
                    <a href="admin.html" class="menu-item" data-page="admin">
                        <i class="fas fa-cash-register"></i> الكاشير
                    </a>
                    <a href="products.html" class="menu-item" data-page="products">
                        <i class="fas fa-box"></i> المنتجات
                    </a>
                    <a href="orders.html" class="menu-item" data-page="orders">
                        <i class="fas fa-shopping-cart"></i> الطلبات
                    </a>
                    <a href="reports.html" class="menu-item" data-page="reports">
                        <i class="fas fa-chart-line"></i> التقارير
                    </a>
                    <a href="expenses.html" class="menu-item" data-page="expenses">
                        <i class="fas fa-wallet"></i> المصروفات
                    </a>
                    <a href="returns.html" class="menu-item" data-page="returns">
                        <i class="fas fa-undo"></i> المرتجعات
                    </a>
                    <a href="purchases.html" class="menu-item" data-page="purchases">
                        <i class="fas fa-truck-loading"></i> الواردات
                    </a>
                    <a href="users.html" class="menu-item" data-page="users">
                        <i class="fas fa-users"></i> المستخدمين
                    </a>
                    <a href="chat.html" class="menu-item" data-page="chat">
                        <i class="fas fa-comments"></i> المحادثات
                    </a>
                    <a href="settings.html" class="menu-item" data-page="settings">
                        <i class="fas fa-cog"></i> الإعدادات
                    </a>
                    
                    <div style="margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 15px;">
                        <a href="#" class="menu-item" onclick="if(window.showShiftModal) window.showShiftModal(); return false;">
                            <i class="fas fa-clock"></i> حالة الوردية
                        </a>
                        <a href="../../index.html" class="menu-item" style="color: var(--danger);">
                            <i class="fas fa-sign-out-alt"></i> خروج
                        </a>
                    </div>
                </div>
            </aside>
        `;

        // Ensure admin-container exists, if not, wrap body content (fallback)
        let container = document.querySelector('.admin-container');
        if (!container) {
            // If no container, we might be on a legacy page. 
            // We won't force wrap to avoid breaking scripts, but we'll prepend sidebar to body
            // and hope the CSS handles the overlap (fixed position sidebar).
            container = document.body;
        }

        if (!document.querySelector('.sidebar')) {
            // Insert at start of container
            if (container.classList.contains('admin-container')) {
                container.insertAdjacentHTML('afterbegin', sidebarHTML);
            } else {
                document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
            }
        }
    },

    injectHeader() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent && !document.querySelector('.top-header')) {
            const pageTitle = document.title.split('|')[0].trim().replace('نظام الكاشير - ', '');
            const headerHTML = `
                <header class="top-header">
                    <div class="page-title">
                        <h1>${pageTitle}</h1>
                        <p>لوحة التحكم / ${pageTitle}</p>
                    </div>
                    <div class="header-actions" id="header-actions">
                        <button class="btn btn-secondary" onclick="location.reload()">
                            <i class="fas fa-sync-alt"></i> تحديث
                        </button>
                        <div class="user-profile" style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 40px; height: 40px; background: var(--primary-fade); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                A
                            </div>
                            <div style="display: none; @media(min-width: 768px){display: block;}">
                                <div style="font-weight: 700; font-size: 0.9rem;">المدير العام</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">Admin</div>
                            </div>
                        </div>
                    </div>
                </header>
            `;
            mainContent.insertAdjacentHTML('afterbegin', headerHTML);
        }
    },

    highlightActiveLink() {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        const links = document.querySelectorAll('.menu-item');

        links.forEach(link => {
            // Check data-page attribute first, then fallback to href matching
            const pageName = link.dataset.page;
            if (pageName === currentPage || (currentPage === 'admin' && pageName === 'admin')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    },

    setupMobileMenu() {
        if (window.innerWidth < 992 && !document.querySelector('.mobile-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'mobile-toggle btn btn-primary';
            toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
            toggleBtn.style.position = 'fixed';
            toggleBtn.style.bottom = '20px';
            toggleBtn.style.right = '20px';
            toggleBtn.style.zIndex = '1100';
            toggleBtn.style.borderRadius = '50%';
            toggleBtn.style.width = '50px';
            toggleBtn.style.height = '50px';
            toggleBtn.style.boxShadow = 'var(--shadow-lg)';

            toggleBtn.onclick = () => {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.classList.toggle('active');
            };

            document.body.appendChild(toggleBtn);
        }
    }
};

// Helper to initialize layout with specific active page
export function initAdminLayout(activePageId) {
    // Wait for DOM if not ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initAdminLayout(activePageId));
        return;
    }

    AdminLayout.init();
    
    // Override active link if provided
    if (activePageId) {
        const links = document.querySelectorAll('.menu-item');
        links.forEach(link => {
            if (link.dataset.page === activePageId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}

export { AdminLayout };
