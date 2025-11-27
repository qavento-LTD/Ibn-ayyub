import { supabase } from './supabase-client.js';

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const shareProductBtn = document.getElementById('shareProductBtn');
const productModal = document.getElementById('productModal');
const closeModalBtn = document.getElementById('closeModal');
const modalProductsGrid = document.getElementById('modalProductsGrid');

// State
let currentUser = null;
let currentSessionId = localStorage.getItem('chat_session_id');

if (!currentSessionId) {
    currentSessionId = 'guest_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chat_session_id', currentSessionId);
}

// Bot Knowledge Base
const botResponses = {
    'مرحبا': 'أهلاً بك في هديتي! كيف يمكنني مساعدتك؟',
    'السلام': 'وعليكم السلام! كيف يمكنني خدمتك؟',
    'طلب': 'يمكنك تتبع طلبك من خلال صفحة "تتبع الطلب" في القائمة العلوية.',
    'توصيل': 'نقوم بالتوصيل لجميع مناطق المملكة خلال 3-5 أيام عمل.',
    'دفع': 'نوفر طرق دفع متعددة: مدى، فيزا، ماستركارد، والدفع عند الاستلام.',
    'استرجاع': 'يمكنك استرجاع المنتج خلال 14 يوماً من تاريخ الاستلام بشرط أن يكون بحالته الأصلية.',
    'موقع': 'مقرنا الرئيسي في الرياض، ونخدم جميع مناطق المملكة إلكترونياً.',
    'شكرا': 'العفو! نحن في خدمتك دائماً.',
    'default': 'عذراً، لم أفهم سؤالك تماماً. هل يمكنك توضيح المزيد؟ أو يمكنك اختيار منتج للاستفسار عنه.'
};

// Initialize
async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;

    // Load initial messages
    await loadMessages();

    // Subscribe to realtime changes
    subscribeToMessages();

    // Event Listeners
    sendMessageBtn.addEventListener('click', () => sendMessage());
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    shareProductBtn.addEventListener('click', openProductModal);
    closeModalBtn.addEventListener('click', () => productModal.classList.remove('active'));

    // Close modal on outside click
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) productModal.classList.remove('active');
    });
}

// Load Messages
async function loadMessages() {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`user_id.eq.${currentUser?.id || '00000000-0000-0000-0000-000000000000'},session_id.eq.${currentSessionId}`)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error loading messages:', error);
        return;
    }

    // Clear existing (except welcome) if needed, but here we append
    // For simplicity, let's clear and rebuild to avoid dupes on reload
    chatMessages.innerHTML = '';

    // Add welcome message if empty
    if (!data || data.length === 0) {
        appendMessage({
            content: 'مرحباً بك! 👋<br>أنا المساعد الذكي لموقع هديتي. كيف يمكنني مساعدتك اليوم؟',
            sender_type: 'bot',
            created_at: new Date().toISOString()
        });
    } else {
        data.forEach(msg => appendMessage(msg));
    }

    scrollToBottom();
}

// Subscribe to Realtime
function subscribeToMessages() {
    supabase
        .channel('chat_room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
            const msg = payload.new;
            // Only append if it belongs to this session/user and wasn't just added by us optimistically
            if (msg.session_id === currentSessionId || (currentUser && msg.user_id === currentUser.id)) {
                // Check if already exists to avoid dupes (simple check)
                const existing = document.querySelector(`[data-id="${msg.id}"]`);
                if (!existing) {
                    appendMessage(msg);
                    scrollToBottom();

                    // Trigger Bot Response if user sent it
                    if (msg.sender_type === 'user') {
                        setTimeout(() => handleBotResponse(msg), 1000);
                    }
                }
            }
        })
        .subscribe();
}

// Send Message
async function sendMessage(content = null, type = 'text', productId = null) {
    const text = content || messageInput.value.trim();
    if (!text && type === 'text') return;

    const messageData = {
        user_id: currentUser?.id || null,
        session_id: currentSessionId,
        sender_type: 'user',
        content: text,
        message_type: type,
        product_id: productId
    };

    // Optimistic UI update
    // appendMessage({ ...messageData, created_at: new Date().toISOString() }); // Let realtime handle it to avoid complexity

    if (type === 'text') messageInput.value = '';

    const { error } = await supabase.from('chat_messages').insert(messageData);

    if (error) {
        console.error('Error sending message:', error);
        alert('حدث خطأ أثناء إرسال الرسالة');
    }
}

// Append Message to UI
function appendMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.sender_type}`;
    div.dataset.id = msg.id || Date.now(); // Fallback ID

    let contentHtml = '';

    if (msg.message_type === 'product' && msg.product_id) {
        // We need to fetch product details if not available. 
        // For simplicity, we'll assume content has JSON or we fetch.
        // Actually, let's store the product JSON in content for this simple chat, 
        // OR fetch it. Let's try to parse content as JSON first, if it fails, treat as text.
        try {
            const product = JSON.parse(msg.content);
            contentHtml = `
                <div class="chat-product-card">
                    <img src="${product.image_url}" class="chat-product-img" alt="${product.title}">
                    <div class="chat-product-info">
                        <div class="chat-product-title">${product.title}</div>
                        <div class="chat-product-price">${product.price} ر.س</div>
                        <a href="product.html?id=${product.id}" style="font-size:0.8rem; color:var(--primary);">عرض المنتج</a>
                    </div>
                </div>
            `;
        } catch (e) {
            contentHtml = msg.content;
        }
    } else {
        contentHtml = msg.content;
    }

    const time = new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
        ${contentHtml}
        <div class="message-time">${time}</div>
    `;

    chatMessages.appendChild(div);
}

// Bot Logic
async function handleBotResponse(userMsg) {
    let reply = botResponses['default'];
    const text = userMsg.content.toLowerCase();

    if (userMsg.message_type === 'product') {
        reply = 'اختيار رائع! هذا المنتج من الأكثر مبيعاً لدينا. هل تود إضافته للسلة؟';
    } else {
        for (const key in botResponses) {
            if (text.includes(key)) {
                reply = botResponses[key];
                break;
            }
        }
    }

    // Simulate typing delay? No, just send.
    await supabase.from('chat_messages').insert({
        user_id: null, // Bot has no user_id
        session_id: currentSessionId, // Reply to this session
        sender_type: 'bot',
        content: reply,
        message_type: 'text'
    });
}

// Product Modal Logic
async function openProductModal() {
    productModal.classList.add('active');

    if (modalProductsGrid.children.length <= 1) { // Only load if not loaded
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .limit(20);

        if (error) {
            modalProductsGrid.innerHTML = '<div>حدث خطأ في تحميل المنتجات</div>';
            return;
        }

        modalProductsGrid.innerHTML = '';
        products.forEach(product => {
            const el = document.createElement('div');
            el.className = 'modal-product-item';
            el.innerHTML = `
                <img src="${product.image_url}" class="modal-product-img">
                <div style="font-weight:bold; font-size:0.9rem;">${product.title}</div>
                <div style="color:var(--primary);">${product.price} ر.س</div>
            `;
            el.onclick = () => {
                // Send product as message
                // We store product details in content for easier rendering without extra fetches
                sendMessage(JSON.stringify(product), 'product', product.id);
                productModal.classList.remove('active');
            };
            modalProductsGrid.appendChild(el);
        });
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Start
init();
