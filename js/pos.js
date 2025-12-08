import { supabase } from './supabase-client.js';
import { formatPrice, showError, showSuccess } from './utils.js';

export class POSSystem {
    constructor() {
        this.cart = [];
        this.currentShift = null;
    }

    // Initialize POS
    async init() {
        await this.checkOpenShift();
        this.renderCart();
    }

    // Check for open shift
    async checkOpenShift() {
        const { data: shift, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('status', 'open')
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking shift:', error);
            return;
        }

        this.currentShift = shift;
        return shift;
    }

    // Search product by barcode or name
    async searchProduct(query) {
        if (!query) return [];
        const cleanQuery = query.trim();

        try {
            // 1. Try exact barcode match first
            const { data: barcodeMatch, error: barcodeError } = await supabase
                .from('products')
                .select('*')
                .eq('barcode', cleanQuery)
                .single();

            // If found by barcode, return immediately
            if (!barcodeError && barcodeMatch) {
                return [barcodeMatch];
            }

            // 2. Fallback to name search (ilike)
            const { data: products, error: searchError } = await supabase
                .from('products')
                .select('*')
                .ilike('title', `%${cleanQuery}%`)
                .limit(10);

            if (searchError) {
                console.error('Search error:', searchError);
                return [];
            }

            return products || [];

        } catch (err) {
            console.error('Unexpected search error:', err);
            return [];
        }
    }

    // Add product to cart
    addToCart(product) {
        const existingItem = this.cart.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                ...product,
                quantity: 1
            });
        }

        this.renderCart();
        showSuccess('تم إضافة المنتج للسلة');
    }

    // Remove from cart
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.renderCart();
    }

    // Update quantity
    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity = parseInt(quantity);
            if (item.quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                this.renderCart();
            }
        }
    }

    // Clear cart
    clearCart() {
        this.cart = [];
        this.renderCart();
    }

    // Calculate totals
    getTotals() {
        return this.cart.reduce((acc, item) => {
            return acc + (item.price * item.quantity);
        }, 0);
    }

    // Checkout
    async checkout(customerName = 'Guest', paymentMethod = 'cash') {
        if (this.cart.length === 0) {
            showError('السلة فارغة');
            return;
        }

        if (!this.currentShift) {
            showError('لا يوجد وردية مفتوحة. الرجاء فتح وردية أولاً.');
            return;
        }

        try {
            const totalAmount = this.getTotals();
            const user = await supabase.auth.getUser();

            // 1. Create Invoice
            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                    shift_id: this.currentShift.id,
                    user_id: user.data.user?.id,
                    customer_name: customerName,
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    type: 'sale'
                })
                .select()
                .single();

            if (invoiceError) throw invoiceError;

            // 2. Create Invoice Items
            const invoiceItems = this.cart.map(item => ({
                invoice_id: invoice.id,
                product_id: item.id,
                quantity: item.quantity,
                price: item.price,
                cost: item.cost_price || 0 // Assuming cost_price exists
            }));

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(invoiceItems);

            if (itemsError) throw itemsError;

            // 3. Update Stock
            for (const item of this.cart) {
                const { error: stockError } = await supabase.rpc('decrement_stock', {
                    product_id: item.id,
                    quantity: item.quantity
                });

                // If RPC fails (maybe not created), try direct update (less safe for concurrency but works for simple cases)
                if (stockError) {
                    const { data: currentProduct } = await supabase
                        .from('products')
                        .select('stock')
                        .eq('id', item.id)
                        .single();

                    if (currentProduct) {
                        await supabase
                            .from('products')
                            .update({ stock: currentProduct.stock - item.quantity })
                            .eq('id', item.id);
                    }
                }
            }

            showSuccess('تمت العملية بنجاح');
            showSuccess('تمت العملية بنجاح');
            // Don't print here, return data for UI to handle print options
            const result = { invoice, items: [...this.cart] };

            this.cart = [];
            this.renderCart();
            return result;

        } catch (error) {
            console.error('Checkout error:', error);
            showError('حدث خطأ أثناء الدفع');
            return false;
        }
    }

    // Get Sales History
    async getSalesHistory() {
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('*, invoice_items(*)')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Get sales history error:', error);
            return [];
        }

        return invoices.map(inv => ({
            id: inv.id,
            timestamp: inv.created_at,
            customerName: inv.customer_name,
            total: inv.total_amount,
            items: inv.invoice_items
        }));
    }

    // Print Invoice (Thermal or Standard)
    printInvoice(invoiceOrId, items = [], type = 'thermal') {
        let invoice = invoiceOrId;
        const date = new Date().toLocaleString('ar-SA');
        const invoiceNum = invoice.id.slice(0, 8);

        const printWindow = window.open('', '_blank');
        let html = '';

        if (type === 'thermal') {
            // --- THERMAL RECEIPT (80mm) ---
            html = `
                <html dir="rtl">
                <head>
                    <title>فاتورة #${invoiceNum}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
                        body { 
                            font-family: 'Tajawal', sans-serif; 
                            margin: 0; padding: 10px; 
                            width: 80mm; 
                            color: #000;
                        }
                        .header { text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                        .logo { font-size: 1.5rem; font-weight: 800; margin-bottom: 5px; }
                        .info { font-size: 0.8rem; margin-bottom: 5px; }
                        .table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 0.85rem; }
                        .table th { text-align: right; border-bottom: 1px solid #000; padding: 5px 0; }
                        .table td { padding: 5px 0; border-bottom: 1px dashed #ccc; }
                        .totals { margin-top: 10px; border-top: 2px solid #000; padding-top: 10px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: 700; }
                        .footer { text-align: center; margin-top: 20px; font-size: 0.8rem; border-top: 1px dashed #000; padding-top: 10px; }
                        .barcode { text-align: center; margin-top: 10px; font-family: 'Courier New', monospace; letter-spacing: 2px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">هديتي</div>
                        <div class="info">متجر الهدايا المميز</div>
                        <div class="info">التاريخ: ${date}</div>
                        <div class="info">رقم الفاتورة: #${invoiceNum}</div>
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th style="width: 30px">الكمية</th>
                                <th style="width: 50px">السعر</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${item.title}</td>
                                    <td>${item.quantity}</td>
                                    <td>${formatPrice(item.price * item.quantity)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="totals">
                        <div class="row">
                            <span>الإجمالي</span>
                            <span>${formatPrice(invoice.total_amount)}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <p>شكراً لتسوقكم معنا!</p>
                        <p>سياسة الاسترجاع: 3 أيام مع الفاتورة</p>
                        <div class="barcode">*${invoiceNum}*</div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
                </html>
            `;
        } else {
            // --- STANDARD INVOICE (A4) ---
            html = `
                <html dir="rtl">
                <head>
                    <title>فاتورة ضريبية #${invoiceNum}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');
                        body { 
                            font-family: 'Tajawal', sans-serif; 
                            margin: 0; padding: 40px; 
                            background: #fff; color: #333;
                        }
                        .header { 
                            display: flex; justify-content: space-between; align-items: center; 
                            margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #eee; 
                        }
                        .brand h1 { margin: 0; color: #ff4757; font-size: 2.5rem; }
                        .brand p { margin: 5px 0 0; color: #666; }
                        .invoice-details { text-align: left; }
                        .invoice-details h2 { margin: 0 0 10px; color: #2f3542; }
                        .meta { color: #57606f; font-size: 0.9rem; line-height: 1.6; }
                        
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th { background: #f1f2f6; color: #2f3542; padding: 15px; text-align: right; font-weight: 800; }
                        td { padding: 15px; border-bottom: 1px solid #eee; }
                        tr:last-child td { border-bottom: none; }
                        
                        .totals-section { display: flex; justify-content: flex-end; }
                        .totals-box { width: 300px; background: #f8f9fa; padding: 20px; border-radius: 8px; }
                        .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.1rem; }
                        .grand-total { font-weight: 800; color: #ff4757; font-size: 1.4rem; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 10px; }
                        
                        .footer { margin-top: 50px; text-align: center; color: #a4b0be; font-size: 0.9rem; border-top: 1px solid #eee; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="brand">
                            <h1>هديتي</h1>
                            <p>متجر الهدايا والتحف المميز</p>
                            <p>الرياض، المملكة العربية السعودية</p>
                        </div>
                        <div class="invoice-details">
                            <h2>فاتورة ضريبية</h2>
                            <div class="meta">
                                <strong>رقم الفاتورة:</strong> #${invoiceNum}<br>
                                <strong>التاريخ:</strong> ${date}<br>
                                <strong>العميل:</strong> ${invoice.customer_name || 'عميل نقدي'}
                            </div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>المنتج</th>
                                <th>سعر الوحدة</th>
                                <th>الكمية</th>
                                <th>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td style="font-weight: 700;">${item.title}</td>
                                    <td>${formatPrice(item.price)}</td>
                                    <td>${item.quantity}</td>
                                    <td>${formatPrice(item.price * item.quantity)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totals-section">
                        <div class="totals-box">
                            <div class="total-row">
                                <span>المجموع الفرعي</span>
                                <span>${formatPrice(invoice.total_amount)}</span>
                            </div>
                            <div class="total-row">
                                <span>الضريبة (0%)</span>
                                <span>0.00 ر.س</span>
                            </div>
                            <div class="total-row grand-total">
                                <span>الإجمالي النهائي</span>
                                <span>${formatPrice(invoice.total_amount)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <p>شكراً لتعاملكم معنا</p>
                        <p>info@hadity.com | +966 50 000 0000</p>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
                </html>
            `;
        }

        printWindow.document.write(html);
        printWindow.document.close();
    }

    // Render Cart UI (To be implemented by the view, but helper here)
    renderCart() {
        const container = document.getElementById('cart-items');
        const totalEl = document.getElementById('cart-total');

        if (!container || !totalEl) return;

        if (this.cart.length === 0) {
            container.innerHTML = '<div class="empty-cart">السلة فارغة</div>';
            totalEl.textContent = formatPrice(0);
            return;
        }

        container.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-title">${item.title}</div>
                    <div class="item-price">${formatPrice(item.price)}</div>
                </div>
                <div class="item-controls">
                    <button onclick="window.pos.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="window.pos.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                    <button class="delete-btn" onclick="window.pos.removeFromCart('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        totalEl.textContent = formatPrice(this.getTotals());
    }
}
