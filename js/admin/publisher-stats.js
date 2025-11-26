import { supabase } from '../supabase-client.js';
import { isPublisher, formatPrice } from '../utils.js';
import { showError, showLoading } from '../toast.js';

// Check Access
async function checkAccess() {
    const publisherStatus = await isPublisher(supabase);
    if (!publisherStatus) {
        window.location.href = '../../index.html';
        return false;
    }
    const loggedIn = localStorage.getItem('adminAuthenticated') === 'true';
    const role = localStorage.getItem('userRole');
    if (!loggedIn || role !== 'publisher') {
        window.location.href = './login.html';
        return false;
    }
    return true;
}

// Load Stats
async function loadStats() {
    const loadingToast = showLoading('جاري حساب الإحصائيات...');
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*');

        if (error) throw error;

        // Calculate Metrics
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        const lowStock = products.filter(p => p.stock < 5).length;
        const featuredCount = products.filter(p => p.featured).length;

        // Update UI with animation
        animateValue('total-products', 0, totalProducts, 1000);
        animateValue('total-value', 0, totalValue, 1500, true);
        animateValue('low-stock', 0, lowStock, 1000);
        animateValue('featured-count', 0, featuredCount, 1000);

        loadingToast.remove();

    } catch (error) {
        loadingToast.remove();
        console.error('Error loading stats:', error);
        showError('حدث خطأ في تحميل الإحصائيات');
    }
}

// Number Animation Helper
function animateValue(id, start, end, duration, isCurrency = false) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);

        if (isCurrency) {
            obj.innerHTML = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            obj.innerHTML = value;
        }

        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Logout
function handleLogout() {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('userRole');
    window.location.href = './login.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await checkAccess();
    if (hasAccess) {
        loadStats();
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
});
