import { supabase } from '../supabase-client.js';

// DOM Elements
const conversationsList = document.getElementById('conversationsList');
const emptyState = document.getElementById('emptyState');
const activeChatContainer = document.getElementById('activeChatContainer');
const chatTitle = document.getElementById('chatTitle');
const messagesArea = document.getElementById('messagesArea');
const adminInput = document.getElementById('adminInput');
const adminSendBtn = document.getElementById('adminSendBtn');

// State
let conversations = new Map();
let activeSessionId = null;

// Initialize
async function init() {
    await loadConversations();
    subscribeToMessages();

    adminSendBtn.addEventListener('click', sendAdminReply);
    adminInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAdminReply();
    });
}

// Load Conversations
async function loadConversations() {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {
        conversationsList.innerHTML = '<div style="padding:20px; text-align:center;">خطأ في التحميل</div>';
        return;
    }

    conversations.clear();
    data.forEach(msg => {
        if (!conversations.has(msg.session_id)) {
            conversations.set(msg.session_id, {
                lastMessage: msg,
                messages: []
            });
        }
    });

    renderConversations();
}

// Render Conversations
function renderConversations() {
    conversationsList.innerHTML = '';

    if (conversations.size === 0) {
        conversationsList.innerHTML = '<div style="padding:40px; text-align:center; color:#999;">لا توجد محادثات</div>';
        return;
    }

    conversations.forEach((data, sessionId) => {
        const div = document.createElement('div');
        div.className = `conversation-item ${activeSessionId === sessionId ? 'active' : ''}`;

        const time = new Date(data.lastMessage.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        const preview = data.lastMessage.content.substring(0, 40);

        div.innerHTML = `
            <div class="conversation-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="conversation-info">
                <div class="conversation-name">${sessionId.substring(0, 15)}...</div>
                <div class="conversation-preview">${preview}</div>
            </div>
            <div class="conversation-meta">
                <div>${time}</div>
            </div>
        `;

        div.onclick = () => openConversation(sessionId);
        conversationsList.appendChild(div);
    });
}

// Open Conversation
async function openConversation(sessionId) {
    activeSessionId = sessionId;
    renderConversations();

    emptyState.style.display = 'none';
    activeChatContainer.style.display = 'flex';
    chatTitle.textContent = `محادثة: ${sessionId.substring(0, 20)}...`;

    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

    if (error) {
        messagesArea.innerHTML = 'خطأ في التحميل';
        return;
    }

    messagesArea.innerHTML = '';
    data.forEach(appendMessage);
    scrollToBottom();
}

// Append Message
function appendMessage(msg) {
    // Check if message already exists
    const existing = document.querySelector(`[data-msg-id="${msg.id}"]`);
    if (existing) return;

    const div = document.createElement('div');
    div.className = `admin-message ${msg.sender_type === 'admin' ? 'sent' : 'received'}`;
    div.setAttribute('data-msg-id', msg.id);

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    let content = msg.content;
    if (msg.message_type === 'product') {
        try {
            const p = JSON.parse(msg.content);
            content = `📦 ${p.title} - ${p.price} ر.س`;
        } catch (e) { }
    } else if (msg.image_url) {
        content = `<img src="${msg.image_url}" style="max-width:200px; border-radius:8px; cursor:pointer;" onclick="window.open('${msg.image_url}', '_blank')">`;
    }

    const time = new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    const sender = msg.sender_type === 'user' ? 'عميل' : (msg.sender_type === 'bot' ? 'بوت' : 'أنت');

    bubble.innerHTML = `
        <div style="font-size:0.75rem; opacity:0.7; margin-bottom:3px;">${sender}</div>
        <div class="message-text">${content}</div>
        <div class="message-time">${time}</div>
    `;

    div.appendChild(bubble);
    messagesArea.appendChild(div);
}

// Send Admin Reply
async function sendAdminReply() {
    const text = adminInput.value.trim();
    if (!text || !activeSessionId) return;

    const tempId = 'temp_' + Date.now();
    const tempMsg = {
        id: tempId,
        content: text,
        sender_type: 'admin',
        created_at: new Date().toISOString(),
        message_type: 'text'
    };

    appendMessage(tempMsg);
    adminInput.value = '';
    scrollToBottom();

    const { data, error } = await supabase.from('chat_messages').insert({
        session_id: activeSessionId,
        sender_type: 'admin',
        content: text,
        message_type: 'text',
        status: 'sent'
    }).select().single();

    if (error) {
        alert('فشل الإرسال');
        const tempEl = document.querySelector(`[data-msg-id="${tempId}"]`);
        if (tempEl) tempEl.remove();
    } else {
        // Replace temp with real ID
        const tempEl = document.querySelector(`[data-msg-id="${tempId}"]`);
        if (tempEl) tempEl.setAttribute('data-msg-id', data.id);
    }
}

// Subscribe to Realtime
function subscribeToMessages() {
    supabase
        .channel('admin_all_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
            const msg = payload.new;

            // Update conversations list
            if (!conversations.has(msg.session_id)) {
                conversations.set(msg.session_id, { lastMessage: msg, messages: [] });
                renderConversations();
            } else {
                conversations.get(msg.session_id).lastMessage = msg;
                renderConversations();
            }

            // If this is the active chat, append message
            if (activeSessionId === msg.session_id) {
                appendMessage(msg);
                scrollToBottom();
            }

            // Play notification for new user messages
            if (msg.sender_type === 'user' && msg.session_id !== activeSessionId) {
                playNotification();
                // Show browser notification if supported
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('رسالة جديدة', {
                        body: msg.content.substring(0, 50),
                        icon: '/assets/images/logo.png'
                    });
                }
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, payload => {
            const msg = payload.new;
            if (msg.deleted_at && activeSessionId === msg.session_id) {
                const msgEl = document.querySelector(`[data-msg-id="${msg.id}"]`);
                if (msgEl) msgEl.remove();
            }
        })
        .subscribe();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function playNotification() {
    // Optional notification sound
}

// Start
init();
