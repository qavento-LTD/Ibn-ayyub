async function loadComponents() {
    const components = ["header", "footer"];
    
    for (let name of components) {
        const tag = document.querySelector(name);
        if (!tag) continue;
        
        const res = await fetch(`/components/${name}.html`);
        if (!res.ok) continue;
        
        tag.innerHTML = await res.text();
    }
    
    initCartToggle();
    initMenu();
}

loadComponents();

function initMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const nav = document.querySelector('.nav');
    
    if (!menuBtn || !nav) return;
    
    function toggleMenu() {
        const active = menuBtn.classList.toggle('active');
        active ? nav.classList.add('open') : nav.classList.remove('open');
    }
    
    menuBtn.addEventListener('click', toggleMenu);
    
    menuBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleMenu();
        }
    });
}

// وظيفة سلة الشراء
function initCart() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productName = productCard.querySelector('.product-title').textContent;
            
            // إضافة إلى السلة (وهمي)
            this.textContent = 'تمت الإضافة!';
            this.style.backgroundColor = '#27ae60';
            
            setTimeout(() => {
                this.textContent = 'أضف إلى السلة';
                this.style.backgroundColor = '';
            }, 2000);
            
            // عرض رسالة في الكونسول
            console.log(`تمت إضافة "${productName}" إلى السلة`);
        });
    });
    
    // وظائف كمية المنتجات
    const quantityBtns = document.querySelectorAll('.quantity-btn');
    quantityBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const container = this.closest('.cart-actions');
            const countElement = container.querySelector('span');
            let count = parseInt(countElement.textContent);
            
            if (this.textContent === '+') {
                count++;
            } else {
                count = Math.max(1, count - 1);
            }
            
            countElement.textContent = count;
        });
    });
    
    // حذف العناصر من السلة
    const removeBtns = document.querySelectorAll('.remove-btn');
    removeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.closest('.cart-item');
            item.style.opacity = '0';
            setTimeout(() => {
                item.remove();
            }, 300);
        });
    });
}

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    initMenu();
    initCart();
    initCartToggle();
});

function initCartToggle() {
    const cartBtn = document.getElementById('cart');
    const shops = document.querySelector('.cart-container');

    cartBtn.addEventListener('click', () => {
        if (shops.style.display === 'none') {
            shops.style.display = 'flex'
        }else{
            shops.style.display = 'none'
        }
    });
}


// <div class="cart-item">
// 				<div class="cart-item-info">
// 					<div class="cart-item-img">
// 						<i class="fas fa-gem"></i>
// 					</div>
// 					<div>
// 						<h3>هدية مميزة للزفاف</h3>
// 						<button class="remove-btn">حذف</button>
// 					</div>
// 				</div>
// 				<div>129 ر.س</div>
// 				<div class="cart-actions">
// 					<button class="quantity-btn">-</button>
// 					<span>1</span>
// 					<button class="quantity-btn">+</button>
// 				</div>
// 				<div>129 ر.س</div>
// 			</div>