import { supabase } from './supabase-client.js';
import { showError } from './toast.js';

async function loadVideos() {
    try {
        const { data: videos, error } = await supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('video-feed');
        container.innerHTML = '';

        if (videos.length === 0) {
            container.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100vh; color:white;"><h3>لا توجد فيديوهات حالياً</h3></div>';
            return;
        }

        videos.forEach((video, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'video-wrapper';
            wrapper.setAttribute('data-video-id', video.id);
            wrapper.setAttribute('data-video-url', video.url);
            wrapper.setAttribute('data-likes', video.likes || 0);

            // Create regular video element
            const videoElement = document.createElement('video');
            videoElement.src = video.url;
            videoElement.loop = true;
            videoElement.playsinline = true;
            videoElement.muted = index !== 0;
            videoElement.controls = true;
            videoElement.preload = 'metadata';
            videoElement.setAttribute('controlsList', 'nodownload');
            videoElement.crossOrigin = 'anonymous'; // For CORS support

            // Handle video errors
            videoElement.addEventListener('error', (e) => {
                console.error('Video load error:', video.url, e);
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; text-align:center; z-index:10; padding: 20px;';
                errorDiv.innerHTML = `
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <p style="margin-top:10px; font-size: 18px;">فشل تحميل الفيديو</p>
                    <p style="font-size:14px; color: #ccc;">تأكد من أن الرابط مباشر لملف الفيديو</p>
                `;
                videoElement.parentElement.appendChild(errorDiv);
            });

            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.innerHTML = `<h3>${video.description || ''}</h3>`;

            // Create actions
            const actions = document.createElement('div');
            actions.className = 'actions';
            actions.innerHTML = `
                <button class="action-btn like-btn" data-video-id="${video.id}" data-liked="false">
                    <i class="fas fa-heart"></i>
                    <span class="like-count">${video.likes || 0}</span>
                </button>
                <button class="action-btn share-btn" data-video-url="${video.url}">
                    <i class="fas fa-share"></i>
                    <span>مشاركة</span>
                </button>
            `;

            wrapper.appendChild(videoElement);
            wrapper.appendChild(overlay);
            wrapper.appendChild(actions);
            container.appendChild(wrapper);
        });

        setupEventListeners();
        setupObserver();

    } catch (error) {
        console.error('Error loading videos:', error);
        document.getElementById('video-feed').innerHTML = '<p style="color:white; text-align:center; padding-top:50px;">حدث خطأ في تحميل الفيديوهات</p>';
    }
}

// Intersection Observer for Auto Play/Pause
function setupObserver() {
    const options = {
        root: document.getElementById('video-feed'),
        threshold: 0.6
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const wrapper = entry.target;
            const video = wrapper.querySelector('video');

            if (video) {
                if (entry.isIntersecting) {
                    video.play().catch(e => console.log('Autoplay prevented:', e));
                } else {
                    video.pause();
                }
            }
        });
    }, options);

    document.querySelectorAll('.video-wrapper').forEach(wrapper => {
        observer.observe(wrapper);
    });
}

// Setup Event Listeners for Like and Share buttons
function setupEventListeners() {
    // Like buttons
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();

            const videoId = btn.getAttribute('data-video-id');
            const isLiked = btn.getAttribute('data-liked') === 'true';
            const icon = btn.querySelector('i');
            const countSpan = btn.querySelector('.like-count');
            let count = parseInt(countSpan.innerText) || 0;

            if (isLiked) {
                // Unlike
                icon.style.color = 'white';
                count = Math.max(0, count - 1);
                btn.setAttribute('data-liked', 'false');

                // Update DB
                try {
                    await supabase.from('videos').update({ likes: count }).eq('id', videoId);
                } catch (error) {
                    console.error('Error updating likes:', error);
                }
            } else {
                // Like
                icon.style.color = '#e74c3c';
                count++;
                btn.setAttribute('data-liked', 'true');

                // Update DB
                try {
                    await supabase.from('videos').update({ likes: count }).eq('id', videoId);
                } catch (error) {
                    console.error('Error updating likes:', error);
                }
            }

            countSpan.innerText = count;
        });
    });

    // Share buttons
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();

            const videoUrl = btn.getAttribute('data-video-url');

            try {
                if (navigator.share) {
                    await navigator.share({
                        title: 'فيديو من هديتي',
                        text: 'شاهد هذا الفيديو الرائع!',
                        url: videoUrl
                    });
                } else {
                    // Fallback: copy to clipboard
                    await navigator.clipboard.writeText(videoUrl);

                    // Show toast notification
                    const toast = document.createElement('div');
                    toast.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#4CAF50; color:white; padding:15px 30px; border-radius:8px; z-index:10000; font-size:16px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
                    toast.innerHTML = '<i class="fas fa-check-circle"></i> تم نسخ الرابط';
                    document.body.appendChild(toast);

                    setTimeout(() => {
                        toast.style.opacity = '0';
                        toast.style.transition = 'opacity 0.3s';
                        setTimeout(() => toast.remove(), 300);
                    }, 2000);
                }
            } catch (err) {
                console.error('Error sharing:', err);
            }
        });
    });

    // Click on wrapper to toggle play/pause
    document.querySelectorAll('.video-wrapper').forEach(wrapper => {
        const video = wrapper.querySelector('video');
        if (video) {
            wrapper.addEventListener('click', (e) => {
                // Don't toggle if clicking on buttons or video controls
                if (e.target.closest('.action-btn') || e.target.tagName === 'VIDEO') return;

                if (video.paused) {
                    video.play().catch(e => console.log('Play prevented:', e));
                } else {
                    video.pause();
                }
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', loadVideos);
