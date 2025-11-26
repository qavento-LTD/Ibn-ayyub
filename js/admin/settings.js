import { supabase } from '../supabase-client.js';
import { isAdmin } from '../utils.js';
import { showError, showSuccess, showLoading } from '../toast.js';

// Check Admin Access
async function checkAccess() {
    const adminStatus = await isAdmin(supabase);
    if (!adminStatus) {
        showError('ليس لديك صلاحية للوصول لهذه الصفحة');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 2000);
        return false;
    }
    // Verify that the admin has logged in via the login page
    const loggedIn = localStorage.getItem('adminAuthenticated') === 'true';
    const role = localStorage.getItem('userRole');
    if (!loggedIn || role !== 'admin') {
        // Redirect to login page or home
        window.location.href = './login.html';
        return false;
    }
    return true;
}


// Load Settings
async function loadSettings() {
    const loadingToast = showLoading('جاري تحميل الإعدادات...');
    try {
        const { data: settings, error } = await supabase
            .from('store_settings')
            .select('*')
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        if (settings) {
            // General
            document.getElementById('store-name').value = settings.store_name || '';
            document.getElementById('store-email').value = settings.store_email || '';
            document.getElementById('store-phone').value = settings.store_phone || '';
            document.getElementById('currency').value = settings.currency || 'SAR';
            document.getElementById('tax-rate').value = settings.tax_rate || 15;
            // Shipping
            document.getElementById('shipping-fee').value = settings.shipping_fee || 0;
            document.getElementById('free-shipping').value = settings.free_shipping_threshold || 0;
            // Social
            const social = settings.social_links || {};
            document.getElementById('facebook').value = social.facebook || '';
            document.getElementById('instagram').value = social.instagram || '';
            document.getElementById('twitter').value = social.twitter || '';
            // Features and Discount
            document.getElementById('features').value = settings.features || '';
            document.getElementById('discount').value = settings.discount || 0;
            // Store Status
            document.getElementById('maintenance-mode').checked = settings.maintenance_mode || false;
            document.getElementById('allow-registration').checked = settings.allow_registration ?? true;
        }
        loadingToast.remove();
    } catch (error) {
        loadingToast.remove();
        console.error('Error loading settings:', error);
        showError('حدث خطأ في تحميل الإعدادات');
    }
}

// Save Settings
async function saveSettings() {
    const loadingToast = showLoading('جاري حفظ الإعدادات...');
    try {
        const settingsData = {
            store_name: document.getElementById('store-name').value,
            store_email: document.getElementById('store-email').value,
            store_phone: document.getElementById('store-phone').value,
            currency: document.getElementById('currency').value,
            tax_rate: parseFloat(document.getElementById('tax-rate').value),
            shipping_fee: parseFloat(document.getElementById('shipping-fee').value),
            free_shipping_threshold: parseFloat(document.getElementById('free-shipping').value),
            social_links: {
                facebook: document.getElementById('facebook').value,
                instagram: document.getElementById('instagram').value,
                twitter: document.getElementById('twitter').value
            },
            // New fields
            features: document.getElementById('features').value,
            discount: parseFloat(document.getElementById('discount').value) || 0,
            // Do not modify admin password here
            maintenance_mode: document.getElementById('maintenance-mode').checked,
            allow_registration: document.getElementById('allow-registration').checked
        };
        const { data: existing } = await supabase
            .from('store_settings')
            .select('id')
            .single();
        let error;
        if (existing) {
            ({ error } = await supabase
                .from('store_settings')
                .update(settingsData)
                .eq('id', existing.id));
        } else {
            ({ error } = await supabase
                .from('store_settings')
                .insert([settingsData]));
        }
        if (error) throw error;
        loadingToast.remove();
        showSuccess('تم حفظ الإعدادات بنجاح');
    } catch (error) {
        loadingToast.remove();
        console.error('Error saving settings:', error);
        showError('حدث خطأ في حفظ الإعدادات');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await checkAccess();
    if (hasAccess) {
        loadSettings();
        const tabs = document.querySelectorAll('.settings-tab');
        const sections = document.querySelectorAll('.settings-section');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.target).classList.add('active');
            });
        });
        document.getElementById('save-settings').addEventListener('click', saveSettings);
    }
});
