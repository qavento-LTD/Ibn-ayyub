import { supabase } from './supabase-client.js';

// DOM Elements
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const imageInput = document.getElementById('imageInput');
const shareProductBtn = document.getElementById('shareProductBtn');
const productModal = document.getElementById('productModal');
const closeModal = document.getElementById('closeModal');
const modalProductsGrid = document.getElementById('modalProductsGrid');
const typingIndicator = document.getElementById('typingIndicator');
const statusText = document.getElementById('statusText');
const imagePreviewModal = document.getElementById('imagePreviewModal');
const previewImage = document.getElementById('previewImage');

// State
let currentUser = null;
let currentSessionId = localStorage.getItem('chat_session_id');
let selectedImage = null;
let typingTimeout = null;
let isTyping = false;

if (!currentSessionId) {
    currentSessionId = 'guest_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chat_session_id', currentSessionId);
}

// Bot Responses
const botResponses = {
    'مرحبا': 'أهلاً بك! كيف يمكنني مساعدتك؟ 😊',
    'السلام': 'وعليكم السلام ورحمة الله! كيف يمكنني خدمتك؟',
    'طلب': 'يمكنك تتبع طلبك من خلال صفحة "تتبع الطلب" في القائمة.',
    'توصيل': 'نقوم بالتوصيل لجميع مناطق المملكة خلال 3-5 أيام عمل. 🚚',
    'دفع': 'نوفر طرق دفع متعددة: مدى، فيزا، ماستركارد، والدفع عند الاستلام. 💳',
    'استرجاع': 'يمكنك استرجاع المنتج خلال 14 يوماً بشرط أن يكون بحالته الأصلية. ↩️',
    'شكرا': 'العفو! نحن في خدمتك دائماً. ❤️',
    'default': 'عذراً، لم أفهم سؤالك. هل يمكنك توضيح المزيد؟ 🤔'
};

// Initialize
async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;

    // Load messages
    await loadMessages();

    // Subscribe to realtime
    subscribeToMessages();
    subscribeToTyping();

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', handleTyping);
    imageInput.addEventListener('change', handleImageSelect);
    shareProductBtn.addEventListener('click', openProductModal);
    closeModal.addEventListener('click', () => productModal.style.display = 'none');

    // Auto-scroll on new messages
    scrollToBottom();
}

// Load Messages
async function loadMessages() {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`user_id.eq.${currentUser?.id || '00000000-0000-0000-0000-000000000000'},session_id.eq.${currentSessionId}`)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error loading messages:', error);
        return;
    }

    messagesContainer.innerHTML = '';

    if (!data || data.length === 0) {
        appendMessage({
            content: 'مرحباً بك! 👋<br>أنا المساعد الذكي. كيف يمكنني مساعدتك اليوم؟',
            sender_type: 'bot',
            created_at: new Date().toISOString(),
            message_type: 'text'
        }, false);
    } else {
        data.forEach(msg => appendMessage(msg, false));
    }

    scrollToBottom();
}

// Subscribe to Realtime Messages
function subscribeToMessages() {
    supabase
        .channel('chat_messages_channel')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${currentSessionId}`
        }, payload => {
            const msg = payload.new;
            // Avoid duplicates from optimistic UI
            const existing = document.querySelector(`[data-msg-id="${msg.id}"]`);
            if (!existing) {
                appendMessage(msg, true);
                scrollToBottom();

                // Play notification sound
                if (msg.sender_type !== 'user') {
                    playNotificationSound();
                }

                // Trigger bot response if user sent it
                if (msg.sender_type === 'user') {
                    setTimeout(() => handleBotResponse(msg), 1000);
                }
            }
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${currentSessionId}`
        }, payload => {
            const msg = payload.new;
            if (msg.deleted_at) {
                const msgEl = document.querySelector(`[data-msg-id="${msg.id}"]`);
                if (msgEl) {
                    msgEl.style.animation = 'fadeOut 0.3s ease';
                    setTimeout(() => msgEl.remove(), 300);
                }
            }
        })
        .subscribe();
}

// Subscribe to Typing Indicators
function subscribeToTyping() {
    supabase
        .channel('typing_channel')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'typing_indicators',
            filter: `session_id=eq.${currentSessionId}`
        }, payload => {
            const data = payload.new;
            if (data && data.is_typing) {
                typingIndicator.classList.add('active');
                statusText.textContent = 'يكتب...';
            } else {
                typingIndicator.classList.remove('active');
                statusText.textContent = 'متصل';
            }
        })
        .subscribe();
}

// Send Message (with Optimistic UI)
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    const tempId = 'temp_' + Date.now();
    const messageData = {
        id: tempId,
        user_id: currentUser?.id || null,
        session_id: currentSessionId,
        sender_type: 'user',
        content: text,
        message_type: 'text',
        status: 'sent',
        created_at: new Date().toISOString()
    };

    // Optimistic UI - Show immediately
    appendMessage(messageData, true);
    messageInput.value = '';
    scrollToBottom();

    // Stop typing indicator
    updateTypingStatus(false);

    // Send to server
    const { data, error } = await supabase
        .from('chat_messages')
        .insert({
            user_id: currentUser?.id || null,
            session_id: currentSessionId,
            sender_type: 'user',
            content: text,
            message_type: 'text',
            status: 'sent'
        })
        .select()
        .single();

    if (error) {
        console.error('Send error:', error);
        // Remove optimistic message and show error
        const tempMsg = document.querySelector(`[data-msg-id="${tempId}"]`);
        if (tempMsg) tempMsg.remove();
        alert('فشل إرسال الرسالة');
    } else {
        // Replace temp message with real one
        const tempMsg = document.querySelector(`[data-msg-id="${tempId}"]`);
        if (tempMsg) {
            tempMsg.setAttribute('data-msg-id', data.id);
        }
    }
}

// Append Message to UI
function appendMessage(msg, animate = true) {
    const div = document.createElement('div');
    div.className = `message ${msg.sender_type === 'user' ? 'sent' : 'received'}`;
    div.setAttribute('data-msg-id', msg.id);
    if (animate) div.style.animation = 'slideIn 0.2s ease';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    let content = '';

    // Handle different message types
    if (msg.message_type === 'product') {
        try {
            const product = JSON.parse(msg.content);
            content = `
                <div class="product-card-message">
                    <img src="${product.image_url}" class="product-card-image">
                    <div class="product-card-info">
                        <div style="font-weight:bold; margin-bottom:5px;">${product.title}</div>
                        <div style="color:var(--primary); font-weight:bold;">${product.price} ر.س</div>
                        <a href="product.html?id=${product.id}" style="font-size:0.8rem; color:var(--primary);">عرض المنتج</a>
                    </div>
                </div>
            `;
        } catch (e) {
            content = msg.content;
        }
    } else if (msg.image_url) {
        content = `<img src="${msg.image_url}" class="message-image" onclick="window.open('${msg.image_url}', '_blank')">`;
    } else {
        content = `<div class="message-content">${msg.content}</div>`;
    }

    bubble.innerHTML = content;

    // Add meta info
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const time = new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    let statusIcon = '';
    if (msg.sender_type === 'user') {
        if (msg.status === 'read') statusIcon = '<i class="fas fa-check-double message-status read"></i>';
        else if (msg.status === 'delivered') statusIcon = '<i class="fas fa-check-double message-status"></i>';
        else statusIcon = '<i class="fas fa-check message-status"></i>';
    }

    meta.innerHTML = `<span>${time}</span> ${statusIcon}`;
    bubble.appendChild(meta);

    // Add delete button for user messages (always visible on mobile)
    if (msg.sender_type === 'user' && msg.id && !msg.id.toString().startsWith('temp_')) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        actions.style.cssText = 'position:absolute; top:5px; left:-35px; opacity:1;'; // Always visible
        actions.innerHTML = `<button class="delete-btn" onclick="window.deleteMessage('${msg.id}')"><i class="fas fa-trash"></i></button>`;
        bubble.style.position = 'relative';
        bubble.appendChild(actions);
    }

    div.appendChild(bubble);
    messagesContainer.appendChild(div);
}

// Delete Message
window.deleteMessage = async function (msgId) {
    if (!confirm('هل تريد حذف هذه الرسالة؟')) return;

    const { error } = await supabase
        .from('chat_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', msgId);

    if (!error) {
        const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
        if (msgEl) msgEl.remove();
    }
};

// Handle Typing
function handleTyping() {
    if (!isTyping) {
        isTyping = true;
        updateTypingStatus(true);
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isTyping = false;
        updateTypingStatus(false);
    }, 1000);
}

// Update Typing Status
async function updateTypingStatus(typing) {
    await supabase
        .from('typing_indicators')
        .upsert({
            session_id: currentSessionId,
            is_typing: typing,
            updated_at: new Date().toISOString()
        });
}

// Bot Response
async function handleBotResponse(userMsg) {
    let reply = botResponses['default'];
    const text = userMsg.content.toLowerCase();

    if (userMsg.message_type === 'product') {
        reply = 'اختيار رائع! 🎁 هل تود إضافته للسلة؟';
    } else {
        for (const key in botResponses) {
            if (text.includes(key)) {
                reply = botResponses[key];
                break;
            }
        }
    }

    await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        sender_type: 'bot',
        content: reply,
        message_type: 'text',
        status: 'sent'
    });
}

// Image Handling
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    selectedImage = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        imagePreviewModal.classList.add('active');
    };
    reader.readAsDataURL(file);
}

window.sendImageMessage = async function () {
    if (!selectedImage) return;

    // In production, upload to Supabase Storage
    // For now, use a placeholder
    const imageUrl = 'https://via.placeholder.com/300';

    await supabase.from('chat_messages').insert({
        user_id: currentUser?.id || null,
        session_id: currentSessionId,
        sender_type: 'user',
        content: 'صورة',
        message_type: 'text',
        image_url: imageUrl,
        status: 'sent'
    });

    closeImagePreview();
};

window.closeImagePreview = function () {
    imagePreviewModal.classList.remove('active');
    selectedImage = null;
    imageInput.value = '';
};

// Product Modal
async function openProductModal() {
    console.log('Opening product modal...');
    productModal.style.display = 'block';

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .limit(20);

    if (error) {
        console.error('Error loading products:', error);
        modalProductsGrid.innerHTML = '<div style="padding:20px; text-align:center;">خطأ في التحميل</div>';
        return;
    }

    if (!products || products.length === 0) {
        modalProductsGrid.innerHTML = '<div style="padding:20px; text-align:center;">لا توجد منتجات</div>';
        return;
    }

    modalProductsGrid.innerHTML = '';
    products.forEach(product => {
        const el = document.createElement('div');
        el.style.cssText = 'border:1px solid #eee; border-radius:8px; padding:10px; cursor:pointer; text-align:center; transition:0.2s;';
        el.innerHTML = `
            <img src="${product.image_url}" style="width:100%; height:100px; object-fit:cover; border-radius:4px; margin-bottom:8px;">
            <div style="font-weight:bold; font-size:0.9rem;">${product.title}</div>
            <div style="color:var(--primary);">${product.price} ر.س</div>
        `;
        el.onmouseover = () => el.style.background = '#f5f5f5';
        el.onmouseout = () => el.style.background = 'white';
        el.onclick = async () => {
            console.log('Product selected:', product.title);
            await sendProductMessage(product);
            productModal.style.display = 'none';
        };
        modalProductsGrid.appendChild(el);
    });
}

// Send Product Message
async function sendProductMessage(product) {
    const tempId = 'temp_' + Date.now();
    const messageData = {
        id: tempId,
        user_id: currentUser?.id || null,
        session_id: currentSessionId,
        sender_type: 'user',
        content: JSON.stringify(product),
        message_type: 'product',
        status: 'sent',
        created_at: new Date().toISOString()
    };

    // Optimistic UI
    appendMessage(messageData, true);
    scrollToBottom();

    // Send to server
    const { data, error } = await supabase
        .from('chat_messages')
        .insert({
            user_id: currentUser?.id || null,
            session_id: currentSessionId,
            sender_type: 'user',
            content: JSON.stringify(product),
            message_type: 'product',
            status: 'sent'
        })
        .select()
        .single();

    if (error) {
        console.error('Send error:', error);
        const tempMsg = document.querySelector(`[data-msg-id="${tempId}"]`);
        if (tempMsg) tempMsg.remove();
    } else {
        const tempMsg = document.querySelector(`[data-msg-id="${tempId}"]`);
        if (tempMsg) {
            tempMsg.setAttribute('data-msg-id', data.id);
        }
    }
}

// Utilities
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function playNotificationSound() {
    // Optional: Add notification sound
    // const audio = new Audio('/sounds/notification.mp3');
    // audio.play();
}

// Start
init();
