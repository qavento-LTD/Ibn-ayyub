import { getProductById, addToCart, getCurrentUser } from '../../js/supabase-client.js';

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

const loading = document.getElementById('loading');
const content = document.getElementById('productContent');

async function loadProduct() {
    if (!productId) {
        loading.textContent = 'لم يتم العثور على المنتج.';
        return;
    }

    const { data: product, error } = await getProductById(productId);

    if (error) {
        loading.textContent = `حدث خطأ: ${error.message}`;
        return;
    }

    if (!product) {
        loading.textContent = 'المنتج غير موجود.';
        return;
    }

    // Render Content
    document.getElementById('productTitle').textContent = product.title;
    document.getElementById('productPrice').textContent = `${product.price} ر.س`;
    document.getElementById('productDescription').textContent = product.description || 'لا يوجد وصف لهذا المنتج.';
    document.getElementById('productCategory').textContent = product.category || 'عام';

    const imgContainer = document.getElementById('productImageContainer');
    if (product.image_url && product.image_url.startsWith('http')) {
        imgContainer.innerHTML = `<img src="${product.image_url}" alt="${product.title}">`;
    } else {
        imgContainer.innerHTML = `<i class="fas fa-gift"></i>`;
    }

    // Setup Add to Cart
    const addToCartBtn = document.getElementById('addToCartBtn');
    addToCartBtn.addEventListener('click', async () => {
        const user = await getCurrentUser();
        if (!user) {
            alert('يرجى تسجيل الدخول لإضافة منتجات للسلة');
            window.location.href = 'login.html';
            return;
        }

        const qty = parseInt(document.getElementById('qtyInput').value);

        addToCartBtn.textContent = 'جاري الإضافة...';
        addToCartBtn.disabled = true;

        const { error: addError } = await addToCart(user.id, product.id, qty);

        if (addError) {
            alert('حدث خطأ: ' + addError.message);
        } else {
            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.innerHTML = '<i class="fas fa-check-circle"></i> <span>تمت الإضافة إلى السلة بنجاح</span>';
            document.body.appendChild(toast);

            toast.querySelector('span').textContent = `تمت إضافة ${qty}x "${product.title}" إلى السلة`;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                toast.remove();
            }, 3000);
        }

        addToCartBtn.textContent = 'أضف إلى السلة';
        addToCartBtn.disabled = false;
    });

    loading.style.display = 'none';
    content.style.display = 'grid';
}

document.addEventListener('DOMContentLoaded', loadProduct);
