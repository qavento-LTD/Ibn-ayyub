import { supabase } from '../../js/supabase-client.js';
import { showError, showSuccess } from '../../js/toast.js';

// Handle admin login
async function handleLogin() {
    const passwordInput = document.getElementById('admin-password-input');
    const entered = passwordInput.value.trim();
    if (!entered) {
        showError('الرجاء إدخال كلمة المرور');
        return;
    }
    try {
        const { data: settings, error } = await supabase
            .from('store_settings')
            .select('admin_password_hash')
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        const storedHash = settings?.admin_password_hash || '';
        // For simplicity we compare plain text (no hashing). In production replace with proper hashing.
        if (entered === storedHash) {
            // Fetch user profile to get role
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            const role = profile?.role || '';
            localStorage.setItem('adminAuthenticated', 'true');
            localStorage.setItem('userRole', role);
            showSuccess('تم تسجيل الدخول بنجاح');
            // Redirect based on role
            if (role === 'admin') {
                setTimeout(() => {
                    window.location.href = './settings.html';
                }, 1000);
            } else if (role === 'publisher') {
                setTimeout(() => {
                    window.location.href = './publisher.html';
                }, 1000);
            } else {
                showError('ليس لديك صلاحية للوصول');
            }
        } else {
            showError('كلمة المرور غير صحيحة');
        }
    } catch (e) {
        console.error('Login error:', e);
        showError('حدث خطأ أثناء تسجيل الدخول');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
});
