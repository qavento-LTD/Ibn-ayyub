// =============================================
// Track Order JavaScript
// =============================================

import { supabase, getCurrentUser } from '../../js/supabase-client.js';
import { showSuccess, showError, showLoading } from '../../js/toast.js';
import { formatPrice, formatDate } from '../../js/utils.js';

// =============================================
// Track Order Function
// =============================================
async function trackOrder() {
    const orderIdInput = document.getElementById('orderIdInput');
    const orderId = orderIdInput.value.trim();
    const resultDiv = document.getElementById('orderResult');

    if (!orderId) {
        showError('يرجى إدخال رقم الطلب');
        return;
    }

    const loadingToast = showLoading('جاري البحث عن الطلب...');
    resultDiv.style.display = 'none';

    try {
        // Try to fetch order
        // Note: RLS policies might restrict this to the order owner
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    product:products(*)
                )
            `)
            .eq('id', orderId)
            .single();

        if (error) throw error;

        if (!order) {
            showError('الطلب غير موجود');
            loadingToast.remove();
            return;
        }

        // Display Result
        displayOrderResult(order);
        loadingToast.remove();

    } catch (error) {
        loadingToast.remove();
        console.error('Track order error:', error);
        if (error.code === 'PGRST116') {
            showError('الطلب غير موجود أو ليس لديك صلاحية لعرضه');
        } else {
            showError('حدث خطأ أثناء البحث عن الطلب');
        }
    }
}

// =============================================
// Display Order Result
// =============================================
function displayOrderResult(order) {
    const resultDiv = document.getElementById('orderResult');
    const idDisplay = document.getElementById('orderIdDisplay');
    const dateDisplay = document.getElementById('orderDateDisplay');
    const totalDisplay = document.getElementById('orderTotal');
    const detailsDiv = document.getElementById('orderDetails');

    idDisplay.textContent = `طلب #${order.id}`;
    dateDisplay.textContent = formatDate(order.created_at);
    totalDisplay.textContent = formatPrice(order.total_amount);

    // Update Steps
    updateSteps(order.status);

    // Order Items
    const itemsHtml = order.order_items.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #eee;">
            <span>${item.product.title} (x${item.quantity})</span>
            <span>${formatPrice(item.price * item.quantity)}</span>
        </div>
    `).join('');

    detailsDiv.innerHTML = itemsHtml;

    resultDiv.style.display = 'block';

    // Scroll to result
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

// =============================================
// Update Status Steps
// =============================================
function updateSteps(status) {
    const steps = ['pending', 'processing', 'shipped', 'delivered'];
    const currentStepIndex = steps.indexOf(status);

    steps.forEach((step, index) => {
        const stepEl = document.getElementById(`step-${step}`);
        stepEl.className = 'step'; // Reset

        if (index < currentStepIndex) {
            stepEl.classList.add('completed');
        } else if (index === currentStepIndex) {
            stepEl.classList.add('active');
        }
    });

    // Handle cancelled
    if (status === 'cancelled') {
        // Reset all and maybe show red?
        steps.forEach(step => {
            document.getElementById(`step-${step}`).className = 'step';
        });
        showError('هذا الطلب ملغي');
    }
}

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    const trackBtn = document.getElementById('trackBtn');
    if (trackBtn) {
        trackBtn.addEventListener('click', trackOrder);
    }

    // Allow Enter key
    const input = document.getElementById('orderIdInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') trackOrder();
        });
    }

    // Check for URL param
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        if (input) input.value = id;
        trackOrder();
    }
});
