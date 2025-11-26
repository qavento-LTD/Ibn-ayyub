import { supabase } from '../supabase-client.js';
import { isPublisher, formatPrice } from '../utils.js';
import { showError, showSuccess, showLoading } from '../toast.js';

// Check Publisher Access
async function checkAccess() {
    const publisherStatus = await isPublisher(supabase);
    if (!publisherStatus) {
        showError('ليس لديك صلاحية للوصول لهذه الصفحة');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 2000);
        return false;
    }
    // Verify login via local storage flag
    const loggedIn = localStorage.getItem('adminAuthenticated') === 'true';
    const role = localStorage.getItem('userRole');

    if (!loggedIn || role !== 'publisher') {
        window.location.href = './login.html';
        return false;
    }
    return true;
}

// Load Publisher's Products
async function loadProducts() {
    // const loadingToast = showLoading('جاري تحميل المنتجات...'); // Optional: silent load or spinner in div
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const gridContainer = document.getElementById('products-grid');
        gridContainer.innerHTML = '';

        if (products.length === 0) {
            gridContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-dark);">
                    <i class="fas fa-box-open fa-3x" style="margin-bottom:16px; opacity:0.5;"></i>
                    <p>لا توجد منتجات مضافة بعد. ابدأ بإضافة منتجك الأول!</p>
                </div>
            `;
        } else {
            products.forEach(product => {
                const item = document.createElement('div');
                item.className = 'product-card';

                // Image handling
                const imageUrl = product.image_url || '../../assets/images/placeholder.png'; // Fallback
                const featuredBadge = product.featured ? '<span style="position:absolute; top:10px; right:10px; background:var(--primary); color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem;">مميز</span>' : '';

                item.innerHTML = `
                    <div style="position:relative;">
                        <img src="${imageUrl}" class="product-image" alt="${product.title}" onerror="this.src='../../assets/images/placeholder.png'">
                        ${featuredBadge}
                    </div>
                    <div class="product-details">
                        <h4 class="product-title" title="${product.title}">${product.title}</h4>
                        <div class="product-meta">
                            <span>${product.category}</span>
                            <span>المخزون: ${product.stock}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                            <span class="product-price">${formatPrice(product.price)}</span>
                            <button class="btn btn-secondary" style="padding:6px 12px; font-size:0.9rem;" onclick="editProduct('${product.id}')">
                                <i class="fas fa-edit"></i> تعديل
                            </button>
                        </div>
                    </div>
                `;
                gridContainer.appendChild(item);
            });
        }
        // loadingToast.remove();
    } catch (error) {
        // loadingToast.remove();
        console.error('Error loading products:', error);
        showError('حدث خطأ في تحميل المنتجات');
        document.getElementById('products-grid').innerHTML = '<p style="color:red; text-align:center;">فشل تحميل المنتجات</p>';
    }
}

// Save Product (Create or Update)
async function saveProduct() {
    const title = document.getElementById('product-title').value.trim();
    const category = document.getElementById('product-category').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value) || 0;
    const description = document.getElementById('product-description').value.trim();
    const imageUrl = document.getElementById('product-image').value.trim();
    const featured = document.getElementById('product-featured').checked;

    const productId = document.getElementById('save-product').dataset.id;

    if (!title || !category || isNaN(price)) {
        showError('الرجاء تعبئة الحقول الأساسية (العنوان، الفئة، السعر)');
        return;
    }

    const loadingToast = showLoading('جاري حفظ المنتج...');
    try {
        const productData = {
            title,
            category,
            price,
            stock,
            description,
            image_url: imageUrl,
            featured
        };

        let error;
        if (productId) {
            // Update
            ({ error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId));
        } else {
            // Insert
            ({ error } = await supabase
                .from('products')
                .insert([productData]));
        }

        if (error) throw error;

        loadingToast.remove();
        showSuccess(productId ? 'تم تحديث المنتج' : 'تم إضافة المنتج');

        resetForm();
        loadProducts();

    } catch (error) {
        loadingToast.remove();
        console.error('Error saving product:', error);
        showError('حدث خطأ في حفظ المنتج');
    }
}

// Reset Form
function resetForm() {
    document.getElementById('product-title').value = '';
    document.getElementById('product-category').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-stock').value = '';
    document.getElementById('product-description').value = '';
    document.getElementById('product-image').value = '';
    document.getElementById('product-featured').checked = false;

    // Reset Image Preview
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = '<span>معاينة الصورة</span>';

    // Reset Buttons
    const saveBtn = document.getElementById('save-product');
    delete saveBtn.dataset.id;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج';

    document.getElementById('cancel-edit').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Edit Product
window.editProduct = async (id) => {
    const loadingToast = showLoading('جاري تحميل بيانات المنتج...');
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('product-title').value = product.title;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-image').value = product.image_url || '';
        document.getElementById('product-featured').checked = product.featured;

        // Trigger image preview update
        if (product.image_url) {
            updateImagePreview(product.image_url);
        }

        const saveBtn = document.getElementById('save-product');
        saveBtn.dataset.id = id;
        saveBtn.innerHTML = '<i class="fas fa-sync-alt"></i> تحديث المنتج';

        document.getElementById('cancel-edit').style.display = 'inline-block';

        loadingToast.remove();
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        loadingToast.remove();
        console.error('Error fetching product:', error);
        showError('حدث خطأ في تحميل المنتج');
    }
};

// Image Preview Logic
function updateImagePreview(url) {
    const previewContainer = document.getElementById('image-preview');
    if (url) {
        previewContainer.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:contain;" onerror="this.parentElement.innerHTML='<span style=\\'color:red\\'>رابط غير صالح</span>'">`;
    } else {
        previewContainer.innerHTML = '<span>معاينة الصورة</span>';
    }
}

// Logout
function handleLogout() {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('userRole');
    window.location.href = './login.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await checkAccess();
    if (hasAccess) {
        loadProducts();

        document.getElementById('save-product').addEventListener('click', saveProduct);
        document.getElementById('cancel-edit').addEventListener('click', resetForm);

        document.getElementById('product-image').addEventListener('input', (e) => {
            updateImagePreview(e.target.value);
        });

        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
});
