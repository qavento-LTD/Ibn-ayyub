import { supabase } from '../supabase-client.js';
import { isAdmin } from '../utils.js';

// Check admin access
async function checkAdmin() {
    const adminStatus = await isAdmin(supabase);
    if (!adminStatus) {
        alert('ليس لديك صلاحية للوصول لهذه الصفحة');
        window.location.href = '../../index.html';
        return false;
    }
    return true;
}

// Tab navigation
document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active from all tabs and sections
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));

        // Add active to clicked tab and corresponding section
        tab.classList.add('active');
        const target = tab.getAttribute('data-target');
        document.getElementById(target).classList.add('active');
    });
});

// Load settings
async function loadSettings() {
    try {
        const { data: settings, error } = await supabase
            .from('site_settings')
            .select('*');

        if (error) throw error;

        if (settings && settings.length > 0) {
            settings.forEach(setting => {
                applySettingToUI(setting.setting_key, setting.setting_value);
            });
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Apply setting to UI
function applySettingToUI(key, value) {
    const element = document.getElementById(key);
    if (!element) return;

    if (element.type === 'checkbox') {
        element.checked = value;
    } else {
        element.value = value;
    }
}

// Save settings
window.saveSettings = async function (section) {
    const settingsData = {};

    switch (section) {
        case 'general':
            settingsData['store-name'] = document.getElementById('store-name').value;
            settingsData['store-email'] = document.getElementById('store-email').value;
            settingsData['store-phone'] = document.getElementById('store-phone').value;
            settingsData['store-description'] = document.getElementById('store-description').value;
            settingsData['store-logo'] = document.getElementById('store-logo').value;
            break;

        case 'categories':
            settingsData['cat-love-gifts'] = document.getElementById('cat-love-gifts').checked;
            settingsData['cat-birthday-gifts'] = document.getElementById('cat-birthday-gifts').checked;
            settingsData['cat-wedding-gifts'] = document.getElementById('cat-wedding-gifts').checked;
            settingsData['cat-graduation-gifts'] = document.getElementById('cat-graduation-gifts').checked;
            settingsData['cat-home-gifts'] = document.getElementById('cat-home-gifts').checked;
            settingsData['cat-kids-gifts'] = document.getElementById('cat-kids-gifts').checked;
            break;

        case 'products':
            settingsData['featured-products-count'] = parseInt(document.getElementById('featured-products-count').value);
            settingsData['show-stock'] = document.getElementById('show-stock').checked;
            settingsData['allow-out-of-stock-orders'] = document.getElementById('allow-out-of-stock-orders').checked;
            settingsData['out-of-stock-message'] = document.getElementById('out-of-stock-message').value;
            break;

        case 'videos':
            settingsData['enable-videos'] = document.getElementById('enable-videos').checked;
            settingsData['autoplay-videos'] = document.getElementById('autoplay-videos').checked;
            settingsData['max-video-size'] = parseInt(document.getElementById('max-video-size').value);
            break;

        case 'reviews':
            settingsData['enable-reviews'] = document.getElementById('enable-reviews').checked;
            settingsData['review-moderation'] = document.getElementById('review-moderation').checked;
            settingsData['min-review-length'] = parseInt(document.getElementById('min-review-length').value);
            settingsData['home-reviews-count'] = parseInt(document.getElementById('home-reviews-count').value);
            break;

        case 'social':
            settingsData['social-facebook'] = document.getElementById('social-facebook').value;
            settingsData['social-instagram'] = document.getElementById('social-instagram').value;
            settingsData['social-twitter'] = document.getElementById('social-twitter').value;
            settingsData['social-whatsapp'] = document.getElementById('social-whatsapp').value;
            settingsData['social-tiktok'] = document.getElementById('social-tiktok').value;
            break;

        case 'shipping':
            settingsData['shipping-fee'] = parseFloat(document.getElementById('shipping-fee').value);
            settingsData['free-shipping-min'] = parseFloat(document.getElementById('free-shipping-min').value);
            settingsData['enable-free-shipping'] = document.getElementById('enable-free-shipping').checked;
            settingsData['delivery-time'] = document.getElementById('delivery-time').value;
            break;

        case 'advanced':
            settingsData['maintenance-mode'] = document.getElementById('maintenance-mode').checked;
            settingsData['maintenance-message'] = document.getElementById('maintenance-message').value;
            settingsData['enable-newsletter'] = document.getElementById('enable-newsletter').checked;
            break;
    }

    try {
        // Save each setting
        for (const [key, value] of Object.entries(settingsData)) {
            const { error } = await supabase
                .from('site_settings')
                .upsert({
                    setting_key: key,
                    setting_value: value,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'setting_key'
                });

            if (error) throw error;
        }

        showToast('تم حفظ الإعدادات بنجاح!', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('حدث خطأ في حفظ الإعدادات', 'error');
    }
};

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 16px 32px;
        border-radius: 50px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 700;
        animation: slideDown 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const isAdminUser = await checkAdmin();
    if (isAdminUser) {
        loadSettings();
    }
});
