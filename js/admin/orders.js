import { supabase } from '../supabase-client.js';
import { isAdmin, formatPrice } from '../utils.js';
import { showError, showSuccess, showLoading } from '../toast.js';

let allOrders = [];
let currentOrderId = null;

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

// Fetch Orders
async function loadOrders() {
    const loadingEl = document.getElementById('loading');

    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*, user_profiles(full_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allOrders = orders || [];
        renderOrders(allOrders);
        loadingEl.style.display = 'none';

    } catch (error) {
        console.error('Error loading orders:', error);
        loadingEl.style.display = 'none';
        showError('حدث خطأ في تحميل الطلبات');
    }
}

// Render Orders Table
function renderOrders(orders) {
    const tableBody = document.getElementById('ordersTableBody');
    const noResults = document.getElementById('noResults');

    tableBody.innerHTML = '';

    if (orders.length === 0) {
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    orders.forEach(order => {
        const row = document.createElement('tr');
        const date = new Date(order.created_at).toLocaleDateString('ar-SA');
        const statusClass = `status-${order.status}`;

        const statusText = {
            'pending': 'قيد الانتظار',
            'processing': 'قيد التنفيذ',
            'shipped': 'تم الشحن',
            'delivered': 'تم التوصيل',
            'cancelled': 'ملغي'
        }[order.status] || order.status;

        row.innerHTML = `
            <td>#${order.id.slice(0, 8)}</td>
            <td>${order.user_profiles?.full_name || 'مستخدم'}</td>
            <td style="font-weight: 700; color: var(--primary);">${formatPrice(order.total_amount)}</td>
            <td>${date}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="action-btn view-btn" data-id="${order.id}">
                    <i class="fas fa-eye"></i> عرض
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Attach event listeners
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openOrderModal(btn.dataset.id);
        });
    });
}

// Filter Functionality
function initFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const status = btn.dataset.status;
            if (status === 'all') {
                renderOrders(allOrders);
            } else {
                const filtered = allOrders.filter(order => order.status === status);
                renderOrders(filtered);
            }
        });
    });
}

// Modal Logic
async function openOrderModal(orderId) {
    const loadingToast = showLoading('جاري تحميل التفاصيل...');
    currentOrderId = orderId;

    try {
        // Fetch order details with items
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                user_profiles(full_name, email, phone),
                order_items(
                    quantity,
                    price,
                    products(title)
                )
            `)
            .eq('id', orderId)
            .single();

        if (error) throw error;

        // Populate Modal
        document.getElementById('modalOrderId').textContent = order.id.slice(0, 8);
        document.getElementById('modalCustomerName').textContent = order.user_profiles?.full_name || 'غير معروف';
        document.getElementById('modalPhone').textContent = order.phone || order.user_profiles?.phone || '-';
        document.getElementById('modalAddress').textContent = order.shipping_address || '-';
        document.getElementById('modalPayment').textContent = order.payment_method || 'غير محدد';
        document.getElementById('modalDate').textContent = new Date(order.created_at).toLocaleString('ar-SA');
        document.getElementById('modalTotal').textContent = formatPrice(order.total_amount);
        document.getElementById('modalStatusSelect').value = order.status;

        // Populate Products
        const productsList = document.getElementById('modalProductsList');
        productsList.innerHTML = order.order_items.map(item => `
            <div class="product-item">
                <span>${item.products?.title || 'منتج محذوف'} (x${item.quantity})</span>
                <span>${formatPrice(item.price * item.quantity)}</span>
            </div>
        `).join('');

        loadingToast.remove();
        document.getElementById('orderModal').style.display = 'flex';

    } catch (error) {
        loadingToast.remove();
        console.error('Error fetching order details:', error);
        showError('حدث خطأ في تحميل تفاصيل الطلب');
    }
}

function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
    currentOrderId = null;
}

async function saveStatusChange() {
    if (!currentOrderId) return;

    const newStatus = document.getElementById('modalStatusSelect').value;
    const loadingToast = showLoading('جاري تحديث الحالة...');

    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', currentOrderId);

        if (error) throw error;

        loadingToast.remove();
        showSuccess('تم تحديث حالة الطلب بنجاح');
        closeModal();
        loadOrders(); // Reload list

    } catch (error) {
        loadingToast.remove();
        console.error('Error updating status:', error);
        showError('حدث خطأ أثناء تحديث الحالة');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await checkAccess();
    if (hasAccess) {
        loadOrders();
        initFilters();

        // Modal Events
        document.getElementById('closeModal').addEventListener('click', closeModal);
        document.getElementById('saveStatusBtn').addEventListener('click', saveStatusChange);

        // Close modal on outside click
        document.getElementById('orderModal').addEventListener('click', (e) => {
            if (e.target.id === 'orderModal') closeModal();
        });
    }
});
