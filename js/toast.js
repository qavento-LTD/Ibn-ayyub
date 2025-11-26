// =============================================
// Toast Notification System
// =============================================

class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: success, error, warning, info
     * @param {number} duration - Duration in ms (0 = permanent)
     */
    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Icon based on type
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="إغلاق">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to container
        this.container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.hide(toast));

        // Auto hide
        if (duration > 0) {
            setTimeout(() => this.hide(toast), duration);
        }

        return toast;
    }

    hide(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 4000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 3500) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }

    /**
     * Show loading toast
     */
    loading(message = 'جاري التحميل...') {
        const toast = document.createElement('div');
        toast.className = 'toast toast-loading';
        toast.innerHTML = `
            <div class="spinner"></div>
            <span class="toast-message">${message}</span>
        `;

        this.container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);

        return toast;
    }

    /**
     * Clear all toasts
     */
    clearAll() {
        const toasts = this.container.querySelectorAll('.toast');
        toasts.forEach(toast => this.hide(toast));
    }
}

// Create global instance
export const toast = new ToastManager();

// Convenience functions
export function showToast(message, type = 'info', duration = 3000) {
    return toast.show(message, type, duration);
}

export function showSuccess(message, duration = 3000) {
    return toast.success(message, duration);
}

export function showError(message, duration = 4000) {
    return toast.error(message, duration);
}

export function showWarning(message, duration = 3500) {
    return toast.warning(message, duration);
}

export function showInfo(message, duration = 3000) {
    return toast.info(message, duration);
}

export function showLoading(message = 'جاري التحميل...') {
    return toast.loading(message);
}

// =============================================
// Confirmation Dialog
// =============================================

export function confirm(message, title = 'تأكيد') {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog-overlay';
        dialog.innerHTML = `
            <div class="confirm-dialog">
                <h3 class="confirm-title">${title}</h3>
                <p class="confirm-message">${message}</p>
                <div class="confirm-buttons">
                    <button class="btn btn-cancel" data-action="cancel">إلغاء</button>
                    <button class="btn btn-confirm" data-action="confirm">تأكيد</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        setTimeout(() => dialog.classList.add('show'), 10);

        const handleClick = (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                dialog.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(dialog);
                }, 300);
                resolve(action === 'confirm');
            }
        };

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                handleClick({ target: { closest: () => ({ dataset: { action: 'cancel' } }) } });
            } else {
                handleClick(e);
            }
        });
    });
}

// =============================================
// Alert Dialog
// =============================================

export function alert(message, title = 'تنبيه', type = 'info') {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'alert-dialog-overlay';

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        dialog.innerHTML = `
            <div class="alert-dialog alert-${type}">
                <i class="fas ${icons[type] || icons.info} alert-icon"></i>
                <h3 class="alert-title">${title}</h3>
                <p class="alert-message">${message}</p>
                <button class="btn btn-primary" data-action="ok">حسناً</button>
            </div>
        `;

        document.body.appendChild(dialog);
        setTimeout(() => dialog.classList.add('show'), 10);

        const handleClick = () => {
            dialog.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(dialog);
            }, 300);
            resolve();
        };

        dialog.querySelector('[data-action="ok"]').addEventListener('click', handleClick);
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) handleClick();
        });
    });
}
