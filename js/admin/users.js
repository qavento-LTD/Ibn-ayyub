import { supabase } from '../supabase-client.js';
import { isAdmin } from '../utils.js';
import { showError, showSuccess, showLoading } from '../toast.js';

let allUsers = [];
let currentUserToEdit = null;

// Check Admin Access
async function checkAccess() {
    const adminStatus = await isAdmin(supabase);
    if (!adminStatus) {
        showError('ليس لديك صلاحية للوصول لهذه الصفحة');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 2000);
        return false;
    }
    return true;
}

// Fetch Users
async function loadUsers() {
    const loadingEl = document.getElementById('loading');
    const tableBody = document.getElementById('usersTableBody');
    const noResults = document.getElementById('noResults');

    try {
        const { data: users, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allUsers = users || [];
        renderUsers(allUsers);
        loadingEl.style.display = 'none';

    } catch (error) {
        console.error('Error loading users:', error);
        loadingEl.style.display = 'none';
        showError('حدث خطأ في تحميل المستخدمين');
    }
}

// Render Users Table
function renderUsers(users) {
    const tableBody = document.getElementById('usersTableBody');
    const noResults = document.getElementById('noResults');

    tableBody.innerHTML = '';

    if (users.length === 0) {
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    users.forEach(user => {
        const row = document.createElement('tr');
        const roleClass = user.role === 'admin' ? 'badge-danger' : 'badge-info';
        const roleText = user.role === 'admin' ? 'مسؤول' : 'عميل';
        const joinedDate = new Date(user.created_at).toLocaleDateString('ar-SA');

        row.innerHTML = `
            <td>${user.full_name || 'غير محدد'}</td>
            <td>${user.email || 'غير متوفر'}</td>
            <td>${user.phone || '-'}</td>
            <td><span class="badge ${roleClass}">${roleText}</span></td>
            <td>${joinedDate}</td>
            <td>
                <button class="action-btn edit-role-btn" data-id="${user.id}" data-role="${user.role}" data-name="${user.full_name}">
                    <i class="fas fa-user-edit"></i> تعديل الصلاحية
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Attach event listeners to buttons
    document.querySelectorAll('.edit-role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openEditModal(btn.dataset.id, btn.dataset.role, btn.dataset.name);
        });
    });
}

// Search Functionality
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allUsers.filter(user =>
            (user.full_name && user.full_name.toLowerCase().includes(term)) ||
            (user.email && user.email.toLowerCase().includes(term)) ||
            (user.phone && user.phone.includes(term))
        );
        renderUsers(filtered);
    });
}

// Modal Logic
function openEditModal(userId, currentRole, userName) {
    currentUserToEdit = userId;
    document.getElementById('modalUserName').textContent = `المستخدم: ${userName}`;
    document.getElementById('roleSelect').value = currentRole;
    document.getElementById('editRoleModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editRoleModal').style.display = 'none';
    currentUserToEdit = null;
}

async function saveRoleChange() {
    if (!currentUserToEdit) return;

    const newRole = document.getElementById('roleSelect').value;
    const loadingToast = showLoading('جاري تحديث الصلاحيات...');

    try {
        const { error } = await supabase
            .from('user_profiles')
            .update({ role: newRole })
            .eq('id', currentUserToEdit);

        if (error) throw error;

        loadingToast.remove();
        showSuccess('تم تحديث صلاحيات المستخدم بنجاح');
        closeEditModal();
        loadUsers(); // Reload list

    } catch (error) {
        loadingToast.remove();
        console.error('Error updating role:', error);
        showError('حدث خطأ أثناء تحديث الصلاحيات');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await checkAccess();
    if (hasAccess) {
        loadUsers();
        initSearch();

        // Modal Events
        document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
        document.getElementById('saveRole').addEventListener('click', saveRoleChange);

        // Close modal on outside click
        document.getElementById('editRoleModal').addEventListener('click', (e) => {
            if (e.target.id === 'editRoleModal') closeEditModal();
        });
    }
});
