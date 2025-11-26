import { supabase } from './supabase-client.js';

// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

// Load Reviews
export async function loadReviews(productId) {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('reviews-list');
        const statsContainer = document.getElementById('reviews-stats');

        if (!reviews || reviews.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#666; padding:40px;">لا توجد تقييمات بعد. كن أول من يقيّم هذا المنتج!</p>';
            statsContainer.innerHTML = '<p style="color:#666;">لا توجد تقييمات</p>';
            return;
        }

        // Calculate stats
        const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
        const totalReviews = reviews.length;

        // Display stats
        statsContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="font-size: 48px; font-weight: 900; color: #E63946;">${avgRating}</div>
                <div>
                    <div class="stars" style="font-size: 24px; color: #FFD700;">
                        ${generateStars(avgRating)}
                    </div>
                    <p style="color: #666; margin-top: 5px;">${totalReviews} تقييم</p>
                </div>
            </div>
        `;

        // Display reviews
        container.innerHTML = reviews.map(review => `
            <div class="review-card" style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div>
                        <div style="font-weight: 700; font-size: 16px; color: #1D3557;">${review.user_name}</div>
                        <div class="stars" style="color: #FFD700; margin-top: 5px;">
                            ${generateStars(review.rating)}
                        </div>
                    </div>
                    <div style="color: #666; font-size: 14px;">
                        ${formatDate(review.created_at)}
                    </div>
                </div>
                <p style="color: #333; line-height: 1.6; margin: 0;">${review.comment}</p>
                ${review.verified_purchase ? '<span style="display: inline-block; margin-top: 10px; padding: 4px 12px; background: #4CAF50; color: white; border-radius: 20px; font-size: 12px;"><i class="fas fa-check-circle"></i> عملية شراء موثقة</span>' : ''}
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Add Review
export async function addReview(productId, reviewData) {
    try {
        const { data, error } = await supabase
            .from('reviews')
            .insert([{
                product_id: productId,
                user_name: reviewData.name,
                user_email: reviewData.email,
                rating: reviewData.rating,
                comment: reviewData.comment
            }])
            .select();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error adding review:', error);
        return { success: false, error: error.message };
    }
}

// Generate Stars HTML
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let html = '';
    for (let i = 0; i < fullStars; i++) {
        html += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
        html += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        html += '<i class="far fa-star"></i>';
    }
    return html;
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} شهور`;
    return `منذ ${Math.floor(diffDays / 365)} سنوات`;
}

// Initialize Review Form
export function initializeReviewForm(productId) {
    const form = document.getElementById('review-form');
    if (!form) return;

    // Star rating interaction
    const stars = document.querySelectorAll('.star-rating i');
    let selectedRating = 0;

    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            selectedRating = index + 1;
            updateStars(selectedRating);
        });

        star.addEventListener('mouseenter', () => {
            updateStars(index + 1);
        });
    });

    const starContainer = document.querySelector('.star-rating');
    if (starContainer) {
        starContainer.addEventListener('mouseleave', () => {
            updateStars(selectedRating);
        });
    }

    function updateStars(rating) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('far');
                star.classList.add('fas');
                star.style.color = '#FFD700';
            } else {
                star.classList.remove('fas');
                star.classList.add('far');
                star.style.color = '#ddd';
            }
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('review-name').value.trim();
        const email = document.getElementById('review-email').value.trim();
        const comment = document.getElementById('review-comment').value.trim();

        if (!name || !comment || selectedRating === 0) {
            showToast('الرجاء ملء جميع الحقول واختيار التقييم', 'error');
            return;
        }

        if (comment.length < 10) {
            showToast('التعليق يجب أن يكون 10 أحرف على الأقل', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري الإرسال...';

        const result = await addReview(productId, {
            name,
            email,
            rating: selectedRating,
            comment
        });

        if (result.success) {
            showToast('تم إضافة تقييمك بنجاح!', 'success');
            form.reset();
            selectedRating = 0;
            updateStars(0);
            loadReviews(productId);
        } else {
            showToast('حدث خطأ: ' + result.error, 'error');
        }

        submitBtn.disabled = false;
        submitBtn.textContent = 'إرسال التقييم';
    });
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
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

// Auto-load reviews if product ID exists
if (productId) {
    document.addEventListener('DOMContentLoaded', () => {
        loadReviews(productId);
        initializeReviewForm(productId);
    });
}
