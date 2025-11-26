import { supabase } from '../supabase-client.js';
import { isPublisher } from '../utils.js';

// Check Access
async function checkAccess() {
    try {
        const publisherStatus = await isPublisher(supabase);
        if (!publisherStatus) {
            window.location.href = '../../index.html';
            return false;
        }

        const loggedIn = localStorage.getItem('adminAuthenticated') === 'true';
        const role = localStorage.getItem('userRole');

        if (!loggedIn || (role !== 'publisher' && role !== 'admin')) {
            window.location.href = './login.html';
            return false;
        }

        return true;
    } catch (error) {
        console.error('Access check error:', error);
        return false;
    }
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 16px 32px;
        border-radius: 50px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 16px;
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

// Load Videos
async function loadVideos() {
    const grid = document.getElementById('videos-grid');
    grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:40px; color:#666;">جاري التحميل...</p>';

    try {
        const { data: videos, error } = await supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        grid.innerHTML = '';

        if (!videos || videos.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:40px; color:#666;">لا توجد فيديوهات منشورة</p>';
            return;
        }

        videos.forEach(video => {
            const card = document.createElement('div');
            card.className = 'video-card';

            // Get video URL from Supabase Storage
            const videoUrl = video.url;

            card.innerHTML = `
                <div class="video-preview">
                    <video src="${videoUrl}" controls preload="metadata"></video>
                </div>
                <div class="video-info">
                    <p style="margin-bottom:10px; font-weight:600;">${video.description || 'بدون وصف'}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <span style="color:#666;"><i class="fas fa-heart"></i> ${video.likes || 0}</span>
                        <button class="btn btn-danger" onclick="deleteVideo('${video.id}', '${video.url}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading videos:', error);
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:40px; color:red;">حدث خطأ في تحميل الفيديوهات</p>';
        showToast('حدث خطأ في تحميل الفيديوهات', 'error');
    }
}

// Upload Video
async function uploadVideo() {
    const fileInput = document.getElementById('video-file');
    const descInput = document.getElementById('video-description');
    const uploadBtn = document.getElementById('upload-btn');
    const progressBar = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    const file = fileInput.files[0];
    const description = descInput.value.trim();

    if (!file) {
        showToast('الرجاء اختيار ملف فيديو', 'error');
        return;
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
        showToast('يرجى اختيار ملف فيديو صحيح (MP4, WebM, Ogg)', 'error');
        return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
        showToast('حجم الفيديو كبير جداً (الحد الأقصى 100 ميجابايت)', 'error');
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'جاري الرفع...';
    progressBar.style.display = 'block';

    try {
        // Generate unique filename
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `video_${timestamp}.${fileExt}`;
        const filePath = `videos/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('videos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                onUploadProgress: (progress) => {
                    const percent = (progress.loaded / progress.total) * 100;
                    progressFill.style.width = percent + '%';
                    progressText.textContent = Math.round(percent) + '%';
                }
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('videos')
            .getPublicUrl(filePath);

        // Save to database
        const { error: dbError } = await supabase
            .from('videos')
            .insert([{
                url: publicUrl,
                description: description || 'فيديو جديد',
                likes: 0
            }]);

        if (dbError) throw dbError;

        showToast('تم رفع الفيديو بنجاح!', 'success');
        fileInput.value = '';
        descInput.value = '';
        progressBar.style.display = 'none';
        progressFill.style.width = '0%';
        progressText.textContent = '0%';

        // Clear preview
        const preview = document.getElementById('video-preview');
        if (preview) {
            preview.innerHTML = '';
            preview.style.display = 'none';
        }

        loadVideos();

    } catch (error) {
        console.error('Error uploading video:', error);
        showToast('حدث خطأ في رفع الفيديو: ' + error.message, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'رفع الفيديو';
    }
}

// Delete Video
window.deleteVideo = async function (id, url) {
    if (!confirm('هل أنت متأكد من حذف هذا الفيديو؟')) return;

    try {
        // Extract file path from URL
        const urlParts = url.split('/videos/');
        if (urlParts.length > 1) {
            const filePath = 'videos/' + urlParts[1].split('?')[0];

            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('videos')
                .remove([filePath]);

            if (storageError) console.error('Storage delete error:', storageError);
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        showToast('تم حذف الفيديو بنجاح', 'success');
        loadVideos();

    } catch (error) {
        console.error('Error deleting video:', error);
        showToast('حدث خطأ في حذف الفيديو', 'error');
    }
};

// Preview Video
function previewVideo() {
    const fileInput = document.getElementById('video-file');
    const preview = document.getElementById('video-preview');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.innerHTML = `
                <video src="${e.target.result}" controls style="width: 100%; max-height: 300px; border-radius: 12px;">
                </video>
                <p style="margin-top: 10px; color: #666; font-size: 14px;">
                    <i class="fas fa-file-video"></i> ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
            `;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
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
    if (!hasAccess) return;

    // Load videos
    loadVideos();

    // Event listeners
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadVideo);
    }

    const fileInput = document.getElementById('video-file');
    if (fileInput) {
        fileInput.addEventListener('change', previewVideo);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
});
