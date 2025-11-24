// =============================================
// Authentication JavaScript
// =============================================

import { signIn, signUp, supabase } from '../../js/supabase-client.js';
import { showSuccess, showError, showLoading } from '../../js/toast.js';
import { isValidEmail } from '../../js/utils.js';

// =============================================
// Sign Up Logic
// =============================================
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = signupForm.querySelector('button[type="submit"]');

    // Validation
    if (!name || !email || !password) {
      showError('يرجى ملء جميع الحقول');
      return;
    }

    if (!isValidEmail(email)) {
      showError('البريد الإلكتروني غير صحيح');
      return;
    }

    if (password.length < 6) {
      showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    // Show loading
    const loadingToast = showLoading('جاري إنشاء الحساب...');
    submitBtn.disabled = true;

    try {
      // Sign up the user
      const { data, error } = await signUp(email, password, name);

      if (error) throw error;

      // Create user profile in user_profiles table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: email,
            full_name: name,
            role: 'customer'
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw error, profile will be created on first login
        }
      }

      loadingToast.remove();
      showSuccess('تم إنشاء الحساب بنجاح!');

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);

    } catch (error) {
      loadingToast.remove();
      console.error('Signup error:', error);
      showError(error.message || 'حدث خطأ في إنشاء الحساب');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// =============================================
// Login Logic
// =============================================
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    // Validation
    if (!email || !password) {
      showError('يرجى ملء جميع الحقول');
      return;
    }

    if (!isValidEmail(email)) {
      showError('البريد الإلكتروني غير صحيح');
      return;
    }

    // Show loading
    const loadingToast = showLoading('جاري تسجيل الدخول...');
    submitBtn.disabled = true;

    try {
      const { data, error } = await signIn(email, password);

      if (error) throw error;

      // Check if user profile exists, create if not
      if (data.user) {
        const { data: profile, error: profileCheckError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // If profile doesn't exist, create it
        if (profileCheckError && profileCheckError.code === 'PGRST116') {
          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
              role: 'customer'
            });

          if (createError) {
            console.error('Profile creation error:', createError);
          }
        }
      }

      loadingToast.remove();
      showSuccess('تم تسجيل الدخول بنجاح!');

      setTimeout(() => {
        window.location.href = '../index.html';
      }, 1000);

    } catch (error) {
      loadingToast.remove();
      console.error('Login error:', error);

      let errorMessage = 'حدث خطأ في تسجيل الدخول';
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'يرجى تأكيد بريدك الإلكتروني أولاً';
      }

      showError(errorMessage);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// =============================================
// Google Login Logic
// =============================================
const googleBtn = document.getElementById('google-login');
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    const loadingToast = showLoading('جاري تسجيل الدخول بجوجل...');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/index.html'
        }
      });

      if (error) throw error;

    } catch (error) {
      loadingToast.remove();
      console.error('Google Login Error:', error);
      showError('حدث خطأ أثناء تسجيل الدخول بجوجل');
    }
  });
}

// =============================================
// Password Toggle
// =============================================
function initPasswordToggle() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');

  passwordInputs.forEach(input => {
    const wrapper = input.parentElement;
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'password-toggle';
    toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    toggleBtn.style.cssText = 'position: absolute; left: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--gray-dark);';

    wrapper.style.position = 'relative';
    wrapper.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => {
      const type = input.type === 'password' ? 'text' : 'password';
      input.type = type;
      toggleBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
  });
}

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔐 Auth Page - Initializing...');
  initPasswordToggle();
  console.log('✅ Auth page ready!');
});