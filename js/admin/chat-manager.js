import { supabase } from '../supabase-client.js';
import { showError, showSuccess } from '../toast.js';

// DOM Elements
const conversationsWrapper = document.getElementById('conversations-wrapper');
const activeChatHeader = document.getElementById('active-chat-header');
const adminChatMessages = document.getElementById('admin-chat-messages');
const adminMessageInput = document.getElementById('admin-message-input');
const adminSendBtn = document.getElementById('admin-send-btn');

// State
let activeSessionId = null;
let conversations = new Map(); // sessionId -> { lastMessage, unreadCount }

// Initialize
export async function initChatManager() {
    // Check if we are on the settings page and chat tab is active (or just init listeners)
    // We'll rely on the tab click to load data if needed, but for now load on init
    await fetchConversations();
    subscribeToAllMessages();

    // Event Listeners
    adminSendBtn.addEventListener('click', sendAdminMessage);
    adminMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAdminMessage();
    });
}

// Fetch active conversations (distinct session_ids)
async function fetchConversations() {
    // Supabase doesn't support DISTINCT ON easily with JS client for this specific case without a view or RPC.
    // For MVP, we'll fetch the last 100 messages and group them by session_id client-side.
    // A better approach for production would be a 'chat_sessions' table or a Postgres View.

    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {
        console.error('Error fetching conversations:', error);
        conversationsWrapper.innerHTML = '<div style="padding:20px; text-align:center; color: var(--text-secondary);">خطأ في التحميل</div>';
        showError('حدث خطأ في تحميل المحادثات');
        return;
    }

    conversations.clear();
    data.forEach(msg => {
        if (!conversations.has(msg.session_id)) {
            conversations.set(msg.session_id, {
                lastMessage: msg,
                unreadCount: 0 // We'd need a read status to track this properly
            });
        }
    });

    renderConversationsList();
}

// Render Conversations List
function renderConversationsList() {
    conversationsWrapper.innerHTML = '';

    if (conversations.size === 0) {
        conversationsWrapper.innerHTML = '<div style="padding:20px; text-align:center; color: var(--text-secondary);">لا توجد محادثات نشطة</div>';
        return;
    }

    conversations.forEach((data, sessionId) => {
        const div = document.createElement('div');
        div.className = `conversation-item ${activeSessionId === sessionId ? 'active' : ''}`;

        const time = new Date(data.lastMessage.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        const preview = data.lastMessage.message_type === 'product' ? '📎 منتج مشترك' : data.lastMessage.content.substring(0, 30) + '...';

        div.innerHTML = `
            <div class="user-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="user-info">
                <div class="user-name">${sessionId.substring(0, 15)}...</div>
                <div class="last-message">${data.lastMessage.sender_type === 'admin' ? 'أنت: ' : ''}${preview}</div>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">${time}</div>
        `;

        div.onclick = () => loadConversation(sessionId);

        conversationsWrapper.appendChild(div);
    });
}

// Load specific conversation
async function loadConversation(sessionId) {
    activeSessionId = sessionId;
    renderConversationsList(); // Update active state styling

    activeChatHeader.textContent = `المحادثة: ${sessionId}`;
    adminMessageInput.disabled = false;
    adminSendBtn.disabled = false;
    adminChatMessages.innerHTML = '<div style="text-align:center; padding:20px; color: var(--text-secondary);">جاري تحميل الرسائل...</div>';

    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    if (error) {
        adminChatMessages.innerHTML = '<div style="text-align:center; padding:20px; color: var(--danger);">خطأ في تحميل الرسائل</div>';
        showError('حدث خطأ في تحميل الرسائل');
        return;
    }

    adminChatMessages.innerHTML = '';
    data.forEach(appendAdminMessage);
    scrollToBottom();
}

// Append message to chat area
function appendAdminMessage(msg) {
    const div = document.createElement('div');
    const isAdmin = msg.sender_type === 'admin' || msg.sender_type === 'bot';

    div.className = `message ${isAdmin ? 'sent' : 'received'}`;
    div.setAttribute('data-msg-id', msg.id);

    let content = msg.content;
    if (msg.message_type === 'product') {
        content = `📎 شارك منتجاً (ID: ${msg.product_id})`;
        try {
            const p = JSON.parse(msg.content);
            content = `
                <div style="display:flex; gap:10px; align-items:center; background:rgba(255,255,255,0.9); padding:5px; border-radius:8px; color:#333;">
                    <img src="${p.image_url}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                    <div>
                        <div style="font-weight:bold; font-size:0.8rem;">${p.title}</div>
                        <div style="font-size:0.8rem;">${p.price} ر.س</div>
                    </div>
                </div>
            `;
        } catch (e) { }
    }

    const time = new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
        ${content}
        <div class="message-time">${time}</div>
    `;

    adminChatMessages.appendChild(div);
}

// Send Admin Message
async function sendAdminMessage() {
    const text = adminMessageInput.value.trim();
    if (!text || !activeSessionId) return;

    adminMessageInput.value = '';

    const { error } = await supabase.from('chat_messages').insert({
        session_id: activeSessionId,
        sender_type: 'admin',
        content: text,
        message_type: 'text'
    });

    if (error) {
        showError('فشل إرسال الرسالة');
    }
}

// Realtime Subscription
function subscribeToAllMessages() {
    supabase
        .channel('admin_chat_room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
            const msg = payload.new;

            // Update conversation list
            conversations.set(msg.session_id, {
                lastMessage: msg,
                unreadCount: 0
            });
            renderConversationsList();

            // If this is the active chat, append message
            if (activeSessionId === msg.session_id) {
                appendAdminMessage(msg);
                scrollToBottom();
            }
        })
        .subscribe();
}

function scrollToBottom() {
    adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
}

// Start
document.addEventListener('DOMContentLoaded', initChatManager);
