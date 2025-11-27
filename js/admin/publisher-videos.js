import { supabase } from '../supabase-client.js';
import { isPublisher } from '../utils.js';

// State for selected products
let selectedProducts = [];

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

            card.innerHTML = `
                <div class="video-preview">
                    <video src="${video.video_url}" controls preload="metadata"></video>
                </div>
                <div class="video-info">
                    <h4 style="margin:0 0 5px 0;">${video.title || 'بدون عنوان'}</h4>
                    <span style="font-size:12px; background:#eee; padding:2px 8px; border-radius:10px;">${video.category || 'عام'}</span>
                    <p style="margin:10px 0; font-size:14px; color:#666;">${video.description || ''}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <span style="color:#666;"><i class="fas fa-heart"></i> ${video.likes_count || 0}</span>
                        <button class="btn btn-danger" onclick="deleteVideo('${video.id}', '${video.video_url}')">
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
    }
}

// Product Search & Linking
async function searchProducts(query) {
    const resultsContainer = document.getElementById('search-results');
    if (!query) {
        resultsContainer.style.display = 'none';
        return;
    }

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('id, title, price, image_url')
            .ilike('title', `%${query}%`)
            .limit(5);

        if (error) throw error;

        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'block';

        if (products.length === 0) {
            resultsContainer.innerHTML = '<div style="padding:10px; text-align:center; color:#666;">لا توجد نتائج</div>';
            return;
        }

        products.forEach(p => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:10px; border-bottom:1px solid #eee; cursor:pointer; display:flex; align-items:center; gap:10px; transition:background 0.2s;';
            item.innerHTML = `
                <img src="${p.image_url || '../../assets/images/logo.png'}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                <div>
                    <div style="font-weight:600; font-size:14px;">${p.title}</div>
                    <div style="font-size:12px; color:#666;">${p.price} ر.س</div>
                </div>
            `;
            item.onmouseover = () => item.style.background = '#f5f5f5';
            item.onmouseout = () => item.style.background = 'white';
            item.onclick = () => addProductToSelection(p);
            resultsContainer.appendChild(item);
        });

    } catch (error) {
        console.error('Search error:', error);
    }
}

function addProductToSelection(product) {
    if (selectedProducts.find(p => p.id === product.id)) return;

    selectedProducts.push(product);
    renderSelectedProducts();
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('product-search').value = '';
}

function removeProductFromSelection(productId) {
    selectedProducts = selectedProducts.filter(p => p.id !== productId);
    renderSelectedProducts();
}

function renderSelectedProducts() {
    const container = document.getElementById('selected-products');
    if (selectedProducts.length === 0) {
        container.innerHTML = '<p style="color: #999; font-size: 14px; width: 100%;">لم يتم اختيار منتجات بعد.</p>';
        return;
    }

    container.innerHTML = selectedProducts.map(p => `
        <div style="background: white; border: 1px solid #ddd; padding: 5px 10px; border-radius: 20px; display: flex; align-items: center; gap: 8px; font-size: 13px;">
            <span>${p.title}</span>
            <i class="fas fa-times" onclick="removeProductFromSelection('${p.id}')" style="cursor: pointer; color: #e74c3c;"></i>
        </div>
    `).join('');

    // Re-attach listeners because inline onclick with string functions is tricky in modules
    container.querySelectorAll('.fa-times').forEach((icon, index) => {
        icon.onclick = () => removeProductFromSelection(selectedProducts[index].id);
    });
}

// Upload Video
async function uploadVideo() {
    const fileInput = document.getElementById('video-file');
    const thumbInput = document.getElementById('video-thumbnail');
    const titleInput = document.getElementById('video-title');
    const categoryInput = document.getElementById('video-category');
    const descInput = document.getElementById('video-description');

    const uploadBtn = document.getElementById('upload-btn');
    const progressBar = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    const file = fileInput.files[0];
    const thumbFile = thumbInput.files[0];
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const category = categoryInput.value;

    if (!file) {
        showToast('الرجاء اختيار ملف فيديو', 'error');
        return;
    }
    if (!title) {
        showToast('الرجاء إدخال عنوان الفيديو', 'error');
        return;
    }

    // Validate video
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
        showToast('صيغة الفيديو غير مدعومة', 'error');
        return;
    }
    if (file.size > 100 * 1024 * 1024) {
        showToast('حجم الفيديو كبير جداً (الحد الأقصى 100 ميجابايت)', 'error');
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'جاري الرفع...';
    progressBar.style.display = 'block';

    try {
        const timestamp = Date.now();

        // 1. Upload Video
        const fileExt = file.name.split('.').pop();
        const videoPath = `videos/vid_${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('videos')
            .upload(videoPath, file, {
                cacheControl: '3600',
                upsert: false,
                onUploadProgress: (progress) => {
                    const percent = (progress.loaded / progress.total) * 100;
                    progressFill.style.width = percent + '%';
                    progressText.textContent = Math.round(percent) + '%';
                }
            });

        if (uploadError) throw uploadError;
        const { data: { publicUrl: videoUrl } } = supabase.storage.from('videos').getPublicUrl(videoPath);

        // 2. Upload Thumbnail (if exists)
        let thumbnailUrl = null;
        if (thumbFile) {
            const thumbExt = thumbFile.name.split('.').pop();
            const thumbPath = `thumbnails/thumb_${timestamp}.${thumbExt}`;
            await supabase.storage.from('videos').upload(thumbPath, thumbFile);
            const { data } = supabase.storage.from('videos').getPublicUrl(thumbPath);
            thumbnailUrl = data.publicUrl;
        }

        // 3. Insert into Database
        const { data: videoData, error: dbError } = await supabase
            .from('videos')
            .insert([{
                title,
                description,
                video_url: videoUrl,
                thumbnail_url: thumbnailUrl,
                category,
                likes_count: 0,
                views_count: 0
            }])
            .select()
            .single();

        if (dbError) throw dbError;

        // 4. Link Products
        if (selectedProducts.length > 0) {
            const productLinks = selectedProducts.map(p => ({
                video_id: videoData.id,
                product_id: p.id,
                display_time: 0 // Default to start
            }));

            const { error: linkError } = await supabase
                .from('video_products')
                .insert(productLinks);

            if (linkError) console.error('Error linking products:', linkError);
        }

        showToast('تم نشر الفيديو بنجاح!', 'success');

        // Reset Form
        fileInput.value = '';
        thumbInput.value = '';
        titleInput.value = '';
        descInput.value = '';
        selectedProducts = [];
        renderSelectedProducts();
        progressBar.style.display = 'none';
        progressFill.style.width = '0%';

        loadVideos();

    } catch (error) {
        console.error('Upload error:', error);
        showToast('حدث خطأ: ' + error.message, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'رفع الفيديو';
    }
}

// Delete Video
window.deleteVideo = async function (id, url) {
    if (!confirm('هل أنت متأكد من حذف هذا الفيديو؟')) return;

    try {
        // Try to delete from storage (best effort)
        if (url) {
            const path = url.split('/').pop(); // Simple extraction, might need refinement
            // await supabase.storage.from('videos').remove([`videos/${path}`]); 
        }

        const { error } = await supabase.from('videos').delete().eq('id', id);
        if (error) throw error;

        showToast('تم الحذف بنجاح');
        loadVideos();
    } catch (error) {
        showToast('خطأ في الحذف', 'error');
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await checkAccess();
    if (!hasAccess) return;

    loadVideos();

    // Listeners
    document.getElementById('upload-btn').addEventListener('click', uploadVideo);

    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('product-search');

    searchBtn.addEventListener('click', () => searchProducts(searchInput.value));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchProducts(searchInput.value);
    });

    // Make remove function global for inline onclicks
    window.removeProductFromSelection = removeProductFromSelection;
});
