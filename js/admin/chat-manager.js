import { supabase } from '../supabase-client.js';

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
        conversationsWrapper.innerHTML = '<div style="padding:20px; text-align:center;">خطأ في التحميل</div>';
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
        conversationsWrapper.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">لا توجد محادثات نشطة</div>';
        return;
    }

    conversations.forEach((data, sessionId) => {
        const div = document.createElement('div');
        div.className = `conversation-item ${activeSessionId === sessionId ? 'active' : ''}`;
        div.style.padding = '15px';
        div.style.borderBottom = '1px solid #eee';
        div.style.cursor = 'pointer';
        div.style.background = activeSessionId === sessionId ? '#e6f7ff' : 'transparent';
        div.style.transition = '0.2s';

        const time = new Date(data.lastMessage.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        const preview = data.lastMessage.message_type === 'product' ? '📎 منتج مشترك' : data.lastMessage.content.substring(0, 30) + '...';

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="font-weight:bold; font-size:0.9rem;">${sessionId.substring(0, 10)}...</span>
                <span style="font-size:0.7rem; color:#999;">${time}</span>
            </div>
            <div style="font-size:0.85rem; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${data.lastMessage.sender_type === 'admin' ? 'أنت: ' : ''}${preview}
            </div>
        `;

        div.onclick = () => loadConversation(sessionId);
        div.onmouseover = () => { if (activeSessionId !== sessionId) div.style.background = '#f1f1f1'; };
        div.onmouseout = () => { if (activeSessionId !== sessionId) div.style.background = 'transparent'; };

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
    adminChatMessages.innerHTML = '<div style="text-align:center; padding:20px;">جاري تحميل الرسائل...</div>';

    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    if (error) {
        adminChatMessages.innerHTML = 'خطأ في تحميل الرسائل';
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

    div.style.maxWidth = '80%';
    div.style.padding = '10px 15px';
    div.style.borderRadius = '12px';
    div.style.marginBottom = '10px';
    div.style.alignSelf = isAdmin ? 'flex-end' : 'flex-start';
    div.style.background = isAdmin ? (msg.sender_type === 'bot' ? '#eee' : 'var(--primary)') : 'white';
    div.style.color = isAdmin ? (msg.sender_type === 'bot' ? '#333' : 'white') : '#333';
    div.style.border = isAdmin ? 'none' : '1px solid #eee';
    div.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';

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

    div.innerHTML = `
        <div style="font-size:0.75rem; margin-bottom:4px; opacity:0.8;">${msg.sender_type === 'user' ? 'مستخدم' : (msg.sender_type === 'bot' ? 'بوت' : 'أنت')}</div>
        <div>${content}</div>
        <div style="font-size:0.65rem; margin-top:4px; opacity:0.7; text-align:${isAdmin ? 'left' : 'right'};">
            ${new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
        </div>
    `;

    adminChatMessages.appendChild(div);
}

// Send Admin Message
async function sendAdminMessage() {
    const text = adminMessageInput.value.trim();
    if (!text || !activeSessionId) return;

    // Optimistic UI
    // appendAdminMessage({
    //     content: text,
    //     sender_type: 'admin',
    //     created_at: new Date().toISOString(),
    //     message_type: 'text'
    // });

    adminMessageInput.value = '';

    const { error } = await supabase.from('chat_messages').insert({
        session_id: activeSessionId,
        sender_type: 'admin',
        content: text,
        message_type: 'text'
    });

    if (error) {
        alert('فشل الإرسال');
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
