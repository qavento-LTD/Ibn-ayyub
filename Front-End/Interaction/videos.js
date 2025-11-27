// videos.js – Handles Netflix-style video page interactions
import { getVideos, getVideoProducts, addToCart, getCurrentUser, supabase } from '../../js/supabase-client.js';
import { showSuccess, showError } from '../../js/toast.js';
import { formatPrice } from '../../js/utils.js';

// State
let videos = [];
let reelsObserver = null;

// DOM Elements
const heroVideo = document.getElementById('heroVideo');
const heroTitle = document.getElementById('heroTitle');
const heroDesc = document.getElementById('heroDesc');
const heroPlayBtn = document.getElementById('heroPlayBtn');
const ambientBg = document.getElementById('ambientBg');
const reelsOverlay = document.getElementById('reelsOverlay');
const reelsFeed = document.getElementById('reelsFeed');
const closeReelsBtn = document.getElementById('closeReelsBtn');

// Rails
const rails = {
    trending: document.getElementById('trendingRail'),
    tutorials: document.getElementById('tutorialsRail'),
    reviews: document.getElementById('reviewsRail')
};

// =============================================
// Load & Render
// =============================================
async function loadContent() {
    try {
        const { data, error } = await getVideos();
        if (error) throw error;
        videos = data || [];

        if (videos.length > 0) {
            setupHero(videos[0]); // Featured video is the first one
            populateRails();
        }
    } catch (e) {
        console.error('Error loading videos:', e);
    }
}

function setupHero(video) {
    heroVideo.src = video.video_url;
    heroTitle.textContent = video.title;
    heroDesc.textContent = video.description || 'شاهد هذا الفيديو المميز واستمتع بتجربة تسوق فريدة.';

    // Play button opens this video in Reels mode
    heroPlayBtn.onclick = () => openReelsMode(video.id);

    // Ambient Light Effect (Simple simulation based on category color)
    const colors = {
        'general': 'rgba(230, 57, 70, 0.15)',
        'tutorials': 'rgba(69, 123, 157, 0.15)',
        'reviews': 'rgba(255, 215, 0, 0.15)'
    };
    ambientBg.style.background = `radial-gradient(circle at 50% 50%, ${colors[video.category] || colors.general}, transparent 70%)`;
}

function populateRails() {
    // Clear rails
    Object.values(rails).forEach(r => r.innerHTML = '');

    // Filter and populate
    const trending = videos.slice(0, 5); // Just taking first 5 as trending for now
    const tutorials = videos.filter(v => v.category === 'tutorials');
    const reviews = videos.filter(v => v.category === 'reviews');

    renderCards(trending, rails.trending);
    renderCards(tutorials, rails.tutorials);
    renderCards(reviews, rails.reviews);
}

function renderCards(videoList, container) {
    if (videoList.length === 0) {
        container.innerHTML = '<p style="color:#666; padding:20px;">لا توجد فيديوهات في هذا القسم</p>';
        return;
    }

    videoList.forEach(v => {
        const card = document.createElement('div');
        card.className = 'video-card-3d';
        card.innerHTML = `
            <img src="${v.thumbnail_url || '../assets/images/logo.png'}" class="card-image" alt="${v.title}">
            <div class="card-overlay">
                <div class="card-title">${v.title}</div>
                <div class="card-meta">
                    <span><i class="far fa-clock"></i> ${formatDuration(v.duration || 0)}</span>
                    <span><i class="far fa-heart"></i> ${v.likes_count || 0}</span>
                </div>
            </div>
            <div class="play-btn-mini"><i class="fas fa-play"></i></div>
        `;

        // 3D Tilt Effect
        card.addEventListener('mousemove', handleTilt);
        card.addEventListener('mouseleave', resetTilt);

        // Click to open Reels
        card.addEventListener('click', () => openReelsMode(v.id));

        container.appendChild(card);
    });
}

// =============================================
// 3D Tilt Logic
// =============================================
function handleTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg rotation
    const rotateY = ((x - centerX) / centerX) * 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
}

function resetTilt(e) {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
}

// =============================================
// Reels Overlay Logic (Preserved & Enhanced)
// =============================================
function openReelsMode(startVideoId) {
    reelsOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderReelsFeed(startVideoId);
}

function closeReelsMode() {
    reelsOverlay.classList.remove('active');
    document.body.style.overflow = '';
    reelsFeed.innerHTML = '';
    if (reelsObserver) reelsObserver.disconnect();
}

async function renderReelsFeed(startVideoId) {
    reelsFeed.innerHTML = '';
    const startVideoIndex = videos.findIndex(v => v.id === startVideoId);
    const orderedVideos = [
        videos[startVideoIndex],
        ...videos.slice(0, startVideoIndex),
        ...videos.slice(startVideoIndex + 1)
    ].filter(Boolean);

    for (const [index, video] of orderedVideos.entries()) {
        const wrapper = await createReelsWrapper(video, index);
        reelsFeed.appendChild(wrapper);
    }
    setupReelsObserver();
}

async function createReelsWrapper(video, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';
    wrapper.setAttribute('data-video-id', video.id);

    const videoElement = document.createElement('video');
    videoElement.src = video.video_url;
    videoElement.loop = true;
    videoElement.playsinline = true;
    videoElement.muted = index !== 0;
    videoElement.controls = true;
    videoElement.preload = index < 2 ? 'auto' : 'metadata';

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
        <h3>${video.title}</h3>
        <p>${video.description || ''}</p>
        <div class="shop-btn-wrapper" style="margin-top:10px;"></div>
    `;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const likeBtn = document.createElement('button');
    likeBtn.className = 'action-btn';
    likeBtn.innerHTML = `<i class="fas fa-heart"></i><span>${video.likes_count || 0}</span>`;
    likeBtn.onclick = (e) => { e.stopPropagation(); handleLike(video.id, likeBtn); };

    const shareBtn = document.createElement('button');
    shareBtn.className = 'action-btn';
    shareBtn.innerHTML = `<i class="fas fa-share"></i>`;
    shareBtn.onclick = (e) => { e.stopPropagation(); handleShare(video.video_url); };

    actions.appendChild(likeBtn);
    actions.appendChild(shareBtn);

    wrapper.appendChild(videoElement);
    wrapper.appendChild(overlay);
    wrapper.appendChild(actions);

    // Click to play/pause
    videoElement.addEventListener('click', () => {
        videoElement.paused ? videoElement.play() : videoElement.pause();
    });

    // Load Products
    const products = await fetchVideoProducts(video.id);
    if (products && products.length > 0) {
        const shopBtn = document.createElement('button');
        shopBtn.className = 'btn';
        shopBtn.style.cssText = 'background: white; color: black; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 0.9rem; border:none; cursor:pointer; display:flex; align-items:center; gap:5px;';
        shopBtn.innerHTML = `<i class="fas fa-shopping-bag"></i> تسوق (${products.length})`;
        shopBtn.onclick = (e) => { e.stopPropagation(); showProductModal(products); };
        overlay.querySelector('.shop-btn-wrapper').appendChild(shopBtn);
    }

    return wrapper;
}

// ... (Rest of the helper functions: setupReelsObserver, handleLike, handleShare, fetchVideoProducts, showProductModal, formatDuration) ...
// Re-implementing them briefly to ensure file completeness

function setupReelsObserver() {
    const options = { root: reelsFeed, threshold: 0.6 };
    reelsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (video) {
                if (entry.isIntersecting) {
                    video.play().catch(() => { });
                    video.muted = false;
                } else {
                    video.pause();
                    video.currentTime = 0;
                }
            }
        });
    }, options);
    document.querySelectorAll('.video-wrapper').forEach(wrapper => reelsObserver.observe(wrapper));
}

async function handleLike(videoId, button) {
    const isLiked = button.classList.contains('liked');
    const countSpan = button.querySelector('span');
    let count = parseInt(countSpan.textContent) || 0;
    if (isLiked) { button.classList.remove('liked'); count = Math.max(0, count - 1); }
    else { button.classList.add('liked'); count++; }
    countSpan.textContent = count;
    try { await supabase.from('videos').update({ likes_count: count }).eq('id', videoId); } catch (error) { console.error(error); }
}

async function handleShare(url) {
    if (navigator.share) { try { await navigator.share({ title: 'فيديو مميز', url: url }); } catch (err) { } }
    else { navigator.clipboard.writeText(url); showSuccess('تم نسخ الرابط'); }
}

async function fetchVideoProducts(videoId) {
    const { data } = await getVideoProducts(videoId);
    return data || [];
}

function showProductModal(products) {
    const modal = document.createElement('div');
    modal.style.cssText = `position: fixed; bottom: 0; left: 0; right: 0; background: white; border-radius: 20px 20px 0 0; padding: 20px; z-index: 3000; max-height: 50vh; overflow-y: auto; animation: slideUp 0.3s ease; color: black;`;
    const itemsHtml = products.map(item => {
        const p = item.product;
        return `<div style="display:flex; gap:10px; margin-bottom:15px; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px;">
                <img src="${p.image_url || '../assets/images/logo.png'}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
                <div style="flex:1;"><div style="font-weight:bold;">${p.title}</div><div style="color:var(--primary);">${formatPrice(p.price)}</div></div>
                <button onclick="addToCart('${p.id}')" style="background:var(--primary); color:white; border:none; width:35px; height:35px; border-radius:50%; cursor:pointer;"><i class="fas fa-plus"></i></button>
            </div>`;
    }).join('');
    modal.innerHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:15px;"><h3 style="margin:0;">المنتجات المرتبطة</h3><button onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; font-size:1.2rem;"><i class="fas fa-times"></i></button></div>${itemsHtml}`;
    document.body.appendChild(modal);
    window.addToCart = async (productId) => {
        const user = await getCurrentUser();
        if (!user) { showError('يرجى تسجيل الدخول'); return; }
        await addToCart(user.id, productId, 1);
        showSuccess('تمت الإضافة للسلة');
    };
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Listeners
closeReelsBtn.addEventListener('click', closeReelsMode);
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.glass-nav');
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
});

// Init
document.addEventListener('DOMContentLoaded', loadContent);
