import { supabase } from './supabase-client.js';

// Load and apply site settings
export async function loadSiteSettings() {
    try {
        const { data: settings, error } = await supabase
            .from('site_settings')
            .select('*');

        if (error) throw error;

        if (settings && settings.length > 0) {
            const settingsMap = {};
            settings.forEach(setting => {
                settingsMap[setting.setting_key] = setting.setting_value;
            });

            applySiteSettings(settingsMap);
        }
    } catch (error) {
        console.error('Error loading site settings:', error);
    }
}

// Apply settings to the page
function applySiteSettings(settings) {
    // Store name
    if (settings['store-name']) {
        document.querySelectorAll('.store-name, [data-store-name]').forEach(el => {
            el.textContent = settings['store-name'];
        });
        // Update page title
        if (document.title.includes('هديتي')) {
            document.title = document.title.replace('هديتي', settings['store-name']);
        }
    }

    // Store email
    if (settings['store-email']) {
        document.querySelectorAll('[data-store-email]').forEach(el => {
            el.textContent = settings['store-email'];
            if (el.tagName === 'A') {
                el.href = `mailto:${settings['store-email']}`;
            }
        });
    }

    // Store phone
    if (settings['store-phone']) {
        document.querySelectorAll('[data-store-phone]').forEach(el => {
            el.textContent = settings['store-phone'];
            if (el.tagName === 'A') {
                el.href = `tel:${settings['store-phone']}`;
            }
        });
    }

    // Store description
    if (settings['store-description']) {
        document.querySelectorAll('[data-store-description]').forEach(el => {
            el.textContent = settings['store-description'];
        });
    }

    // Store logo
    if (settings['store-logo']) {
        document.querySelectorAll('[data-store-logo]').forEach(el => {
            if (el.tagName === 'IMG') {
                el.src = settings['store-logo'];
            }
        });
    }

    // Social media links
    const socialLinks = {
        'facebook': settings['social-facebook'],
        'instagram': settings['social-instagram'],
        'twitter': settings['social-twitter'],
        'whatsapp': settings['social-whatsapp'],
        'tiktok': settings['social-tiktok']
    };

    Object.entries(socialLinks).forEach(([platform, url]) => {
        if (url) {
            document.querySelectorAll(`[data-social="${platform}"]`).forEach(el => {
                el.href = url;
                el.style.display = 'inline-flex';
            });
        } else {
            document.querySelectorAll(`[data-social="${platform}"]`).forEach(el => {
                el.style.display = 'none';
            });
        }
    });

    // Maintenance mode
    if (settings['maintenance-mode'] === true) {
        // Redirect to maintenance page if not admin
        const isAdmin = localStorage.getItem('userRole') === 'admin';
        if (!isAdmin && !window.location.pathname.includes('maintenance.html')) {
            window.location.href = '/pages/maintenance.html';
        }
    }

    // Categories visibility
    const categories = [
        'love-gifts',
        'birthday-gifts',
        'wedding-gifts',
        'graduation-gifts',
        'home-gifts',
        'kids-gifts'
    ];

    categories.forEach(cat => {
        const isEnabled = settings[`cat-${cat}`];
        if (isEnabled === false) {
            document.querySelectorAll(`[data-category="${cat}"]`).forEach(el => {
                el.style.display = 'none';
            });
        }
    });

    // Videos section
    if (settings['enable-videos'] === false) {
        document.querySelectorAll('[data-section="videos"]').forEach(el => {
            el.style.display = 'none';
        });
    }

    // Reviews section
    if (settings['enable-reviews'] === false) {
        document.querySelectorAll('[data-section="reviews"]').forEach(el => {
            el.style.display = 'none';
        });
    }

    // Newsletter
    if (settings['enable-newsletter'] === false) {
        document.querySelectorAll('[data-section="newsletter"]').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// Auto-load on page load
document.addEventListener('DOMContentLoaded', loadSiteSettings);

// Export for use in other files
export { applySiteSettings };
