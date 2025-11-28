// =============================================
// Utility Functions
// =============================================

/**
 * Format price in SAR
 */
export function formatPrice(price) {
    return `${parseFloat(price).toFixed(2)} EGP`;
}

/**
 * Format date in Arabic
 */
export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format date and time
 */
export function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Debounce function for search inputs
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Validate phone number (Saudi format)
 */
export function isValidPhone(phone) {
    const re = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
    return re.test(phone.replace(/\s/g, ''));
}

/**
 * Generate unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Truncate text
 */
export function truncate(text, length = 100) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substr(0, length) + '...';
}

/**
 * Get query parameter from URL
 */
export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Set query parameter in URL
 */
export function setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

/**
 * Calculate cart total
 */
export function calculateTotal(items) {
    return items.reduce((total, item) => {
        const price = parseFloat(item.product?.price || item.price || 0);
        const quantity = parseInt(item.quantity || 1);
        return total + (price * quantity);
    }, 0);
}

/**
 * Storage helpers
 */
export const storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage set error:', e);
        }
    },

    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Storage remove error:', e);
        }
    },

    clear() {
        try {
            localStorage.clear();
        } catch (e) {
            console.error('Storage clear error:', e);
        }
    }
};

/**
 * Loading state manager
 */
export class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
    }

    start(key) {
        this.loadingStates.set(key, true);
        this.updateUI(key, true);
    }

    stop(key) {
        this.loadingStates.set(key, false);
        this.updateUI(key, false);
    }

    isLoading(key) {
        return this.loadingStates.get(key) || false;
    }

    updateUI(key, isLoading) {
        const element = document.querySelector(`[data-loading-key="${key}"]`);
        if (element) {
            if (isLoading) {
                element.classList.add('loading');
                element.disabled = true;
            } else {
                element.classList.remove('loading');
                element.disabled = false;
            }
        }
    }
}

export const loadingManager = new LoadingManager();

/**
 * Form validation helper
 */
export function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;
    const errors = [];

    inputs.forEach(input => {
        const value = input.value.trim();
        const label = input.previousElementSibling?.textContent || input.name;

        // Clear previous error
        input.classList.remove('error');

        if (!value) {
            isValid = false;
            input.classList.add('error');
            errors.push(`${label} مطلوب`);
        } else if (input.type === 'email' && !isValidEmail(value)) {
            isValid = false;
            input.classList.add('error');
            errors.push(`${label} غير صحيح`);
        } else if (input.type === 'tel' && !isValidPhone(value)) {
            isValid = false;
            input.classList.add('error');
            errors.push(`${label} غير صحيح`);
        }
    });

    return { isValid, errors };
}

/**
 * Scroll to element smoothly
 */
export function scrollToElement(element, offset = 0) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if user is admin
 */
export async function isAdmin(supabase) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        return profile?.role === 'admin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

/**
 * Check if user is a publisher
 */
export async function isPublisher(supabase) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        return profile?.role === 'publisher';
    } catch (error) {
        console.error('Error checking publisher status:', error);
        return false;
    }
}





const showError = (message) => { console.error(message); }
export { showError };



const showSuccess = (message) => { console.log(message); }
export { showSuccess };




const showToast = (message) => { console.log(message); }
export { showToast };