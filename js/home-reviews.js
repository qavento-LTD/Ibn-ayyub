import { supabase } from './supabase-client.js';

// Load Top Reviews for Homepage
export async function loadTopReviews(limit = 6) {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('*')
            .order('rating', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        const container = document.getElementById('home-reviews-grid');
        if (!container) return;

        if (!reviews || reviews.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p style="font-size: 1.1rem;">لا توجد تقييمات بعد</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">كن أول من يقيّم منتجاتنا!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = reviews.map(review => `
            <div class="testimonial-card" style="position: relative;">
                <div class="stars" style="color: #FFD700; margin-bottom: 15px; font-size: 1.2rem;">
                    ${generateStars(review.rating)}
                </div>
                <p class="testimonial-content">"${review.comment}"</p>
                <div class="testimonial-author">
                    <div class="author-img">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="author-info">
                        <h4>${review.user_name}</h4>
                        <p style="font-size: 0.85rem; color: #999;">${formatDate(review.created_at)}</p>
                    </div>
                </div>
                ${review.verified_purchase ? '<span style="position: absolute; top: 15px; left: 15px; background: #4CAF50; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px;"><i class="fas fa-check-circle"></i> موثق</span>' : ''}
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading reviews:', error);
        const container = document.getElementById('home-reviews-grid');
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #f44336;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i>
                    <p>حدث خطأ في تحميل التقييمات</p>
                </div>
            `;
        }
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

// Auto-load on homepage
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('home-reviews-grid')) {
        loadTopReviews(6);
    }
});
