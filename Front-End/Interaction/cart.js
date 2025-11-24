import { getCartItems, updateCartQuantity, removeFromCart, getCurrentUser } from '../../js/supabase-client.js';

const cartContainer = document.getElementById('cartItemsContainer');
const subtotalEl = document.getElementById('subtotal');
const totalEl = document.getElementById('total');

async function loadCart() {
    const user = await getCurrentUser();

    if (!user) {
        cartContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-lock" style="font-size: 3rem; color: #ddd; margin-bottom: 20px;"></i>
                <h3>يرجى تسجيل الدخول لعرض السلة</h3>
                <a href="login.html" class="btn" style="display: inline-block; margin-top: 20px;">تسجيل الدخول</a>
            </div>
        `;
        return;
    }

    const { data: items, error } = await getCartItems(user.id);

    if (error) {
        cartContainer.innerHTML = `<div class="error-msg">حدث خطأ: ${error.message}</div>`;
        return;
    }

    if (!items || items.length === 0) {
        cartContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; color: #ddd; margin-bottom: 20px;"></i>
                <h3>السلة فارغة</h3>
                <a href="products.html" class="btn" style="display: inline-block; margin-top: 20px;">تصفح المنتجات</a>
            </div>
        `;
        updateSummary(0);
        return;
    }

    renderCartItems(items);
}

function renderCartItems(items) {
    let total = 0;

    cartContainer.innerHTML = items.map(item => {
        const product = item.product;
        const itemTotal = product.price * item.quantity;
        total += itemTotal;

        return `
            <div class="cart-item" id="item-${item.id}">
                <div class="cart-item-img">
                    ${product.image_url && product.image_url.startsWith('http')
                ? `<img src="${product.image_url}" alt="${product.title}">`
                : `<i class="fas fa-gift" style="font-size: 2rem; color: #ddd;"></i>`
            }
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${product.title}</div>
                    <div class="cart-item-price">${product.price} ر.س</div>
                </div>
                <div class="cart-item-actions">
                    <div class="qty-control">
                        <button onclick="window.updateItemQty(${item.id}, ${item.quantity - 1})">-</button>
                        <input type="text" value="${item.quantity}" readonly>
                        <button onclick="window.updateItemQty(${item.id}, ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-btn" onclick="window.removeItem(${item.id})">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `;
    }).join('');

    updateSummary(total);
}

function updateSummary(total) {
    subtotalEl.textContent = `${total} ر.س`;
    totalEl.textContent = `${total} ر.س`;
}

// Expose functions to window for onclick events
window.updateItemQty = async (itemId, newQty) => {
    if (newQty < 1) return;

    const { error } = await updateCartQuantity(itemId, newQty);
    if (!error) {
        loadCart(); // Reload to reflect changes
    } else {
        alert('حدث خطأ أثناء تحديث الكمية');
    }
};

window.removeItem = async (itemId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    const { error } = await removeFromCart(itemId);
    if (!error) {
        loadCart();
    } else {
        alert('حدث خطأ أثناء الحذف');
    }
};

document.addEventListener('DOMContentLoaded', loadCart);
