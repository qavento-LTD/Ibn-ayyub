import { supabase } from '../js/supabase-client.js';
import { showError, showSuccess } from '../js/utils.js';

export class ShiftManager {
    constructor() {
        this.currentShift = null;
    }

    async init() {
        return await this.checkOpenShift();
    }

    async checkOpenShift() {
        const { data: shift, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('status', 'open')
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking shift:', error);
            return null;
        }

        this.currentShift = shift;
        return shift;
    }

    async startShift(startCash) {
        if (this.currentShift) {
            showError('يوجد وردية مفتوحة بالفعل');
            return;
        }

        const user = await supabase.auth.getUser();

        const { data: shift, error } = await supabase
            .from('shifts')
            .insert({
                user_id: user.data.user?.id,
                start_cash: parseFloat(startCash),
                status: 'open'
            })
            .select()
            .single();

        if (error) {
            console.error('Start shift error:', error);
            showError('فشل فتح الوردية');
            return null;
        }

        this.currentShift = shift;
        showSuccess('تم فتح الوردية بنجاح');
        return shift;
    }

    async endShift(endCash) {
        if (!this.currentShift) {
            showError('لا يوجد وردية مفتوحة');
            return;
        }

        const { error } = await supabase
            .from('shifts')
            .update({
                end_cash: parseFloat(endCash),
                end_time: new Date().toISOString(),
                status: 'closed'
            })
            .eq('id', this.currentShift.id);

        if (error) {
            console.error('End shift error:', error);
            showError('فشل إغلاق الوردية');
            return false;
        }

        this.currentShift = null;
        showSuccess('تم إغلاق الوردية بنجاح');
        return true;
    }

    async addExpense(amount, description) {
        if (!this.currentShift) {
            showError('لا يوجد وردية مفتوحة');
            return;
        }

        const { error } = await supabase
            .from('expenses')
            .insert({
                shift_id: this.currentShift.id,
                amount: parseFloat(amount),
                description: description
            });

        if (error) {
            console.error('Add expense error:', error);
            showError('فشل إضافة المصروف');
            return false;
        }

        showSuccess('تم إضافة المصروف');
        return true;
    }

    async getShiftSummary(shiftId) {
        // Get sales
        const { data: sales } = await supabase
            .from('invoices')
            .select('total_amount')
            .eq('shift_id', shiftId)
            .eq('type', 'sale');

        const totalSales = sales?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

        // Get returns
        const { data: returns } = await supabase
            .from('invoices')
            .select('total_amount')
            .eq('shift_id', shiftId)
            .eq('type', 'return');

        const totalReturns = returns?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

        // Get expenses
        const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('shift_id', shiftId);

        const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

        return {
            totalSales,
            totalReturns,
            totalExpenses,
            netCash: totalSales - totalReturns - totalExpenses
        };
    }
    async showShiftModal() {
        const modal = document.getElementById('shift-modal');
        const body = document.getElementById('shift-modal-body');
        
        if (!modal || !body) {
            console.error('Shift modal elements not found');
            return;
        }

        // Refresh shift status
        await this.checkOpenShift();

        if (this.currentShift) {
            // Show Open Shift Details
            const summary = await this.getShiftSummary(this.currentShift.id);
            const startTime = new Date(this.currentShift.created_at).toLocaleString('ar-EG');
            
            body.innerHTML = `
                <div class="text-center mb-2" style="background: #f8f9fa; padding: 15px; border-radius: 12px;">
                    <div class="badge badge-success" style="font-size: 1.1rem; padding: 8px 24px; margin-bottom: 10px;">
                        <i class="fas fa-clock"></i> الوردية مفتوحة
                    </div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">
                        <div>وقت البدء: <span style="color: var(--text-main); font-weight: 600;">${startTime}</span></div>
                        <div>المستخدم: <span style="color: var(--text-main); font-weight: 600;">Admin</span></div>
                    </div>
                </div>
                
                <div class="grid-2 gap-2 mb-2">
                    <div class="card p-2 text-center" style="background: #e3f9f5; border: 1px solid #b2f2bb;">
                        <div class="text-secondary" style="font-size: 0.85rem;">المبيعات</div>
                        <div class="font-bold text-success" style="font-size: 1.2rem;">${summary.totalSales.toFixed(2)}</div>
                    </div>
                    <div class="card p-2 text-center" style="background: #ffe3e3; border: 1px solid #ffc9c9;">
                        <div class="text-secondary" style="font-size: 0.85rem;">المرتجعات</div>
                        <div class="font-bold text-danger" style="font-size: 1.2rem;">${summary.totalReturns.toFixed(2)}</div>
                    </div>
                    <div class="card p-2 text-center" style="background: #fff3bf; border: 1px solid #ffec99;">
                        <div class="text-secondary" style="font-size: 0.85rem;">المصروفات</div>
                        <div class="font-bold text-warning" style="font-size: 1.2rem;">${summary.totalExpenses.toFixed(2)}</div>
                    </div>
                    <div class="card p-2 text-center" style="background: #e7f5ff; border: 1px solid #a5d8ff;">
                        <div class="text-secondary" style="font-size: 0.85rem;">صافي النقدية المتوقع</div>
                        <div class="font-bold text-primary" style="font-size: 1.2rem;">${summary.netCash.toFixed(2)}</div>
                    </div>
                </div>

                <div class="form-group" style="background: #f8f9fa; padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <label class="form-label" style="color: var(--text-main);">
                        <i class="fas fa-money-bill-wave"></i> النقدية الفعلية في الدرج
                    </label>
                    <input type="number" id="end-shift-cash" class="form-input" placeholder="أدخل المبلغ الموجود فعلياً..." style="font-size: 1.2rem; font-weight: 700; text-align: center;">
                    <div style="text-align: center; margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                        سيتم حساب العجز/الزيادة تلقائياً
                    </div>
                </div>

                <button onclick="window.shiftManager.handleEndShift()" class="btn btn-danger w-100" style="padding: 12px; font-size: 1.1rem;">
                    <i class="fas fa-lock"></i> إغلاق الوردية وطباعة التقرير
                </button>
            `;
        } else {
            // Show Start Shift Form
            body.innerHTML = `
                <div class="text-center mb-2" style="padding: 30px 0;">
                    <div style="font-size: 4rem; color: var(--text-secondary); margin-bottom: 20px; opacity: 0.2;">
                        <i class="fas fa-store-slash"></i>
                    </div>
                    <h3 style="margin-bottom: 10px;">الوردية مغلقة</h3>
                    <p class="text-secondary">قم بفتح وردية جديدة لبدء عمليات البيع</p>
                </div>

                <div class="form-group">
                    <label class="form-label">نقدية البداية (العهدة)</label>
                    <div style="position: relative;">
                        <input type="number" id="start-shift-cash" class="form-input" value="0" style="padding-left: 40px;">
                        <span style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);">ج.م</span>
                    </div>
                </div>

                <button onclick="window.shiftManager.handleStartShift()" class="btn btn-primary w-100" style="padding: 12px; font-size: 1.1rem;">
                    <i class="fas fa-play"></i> فتح وردية جديدة
                </button>
            `;
        }

        modal.classList.add('active');
    }

    async handleStartShift() {
        const cashInput = document.getElementById('start-shift-cash');
        const cash = cashInput ? cashInput.value : 0;
        
        if (await this.startShift(cash)) {
            document.getElementById('shift-modal').classList.remove('active');
            if (window.updateShiftStatus) window.updateShiftStatus();
        }
    }

    async handleEndShift() {
        const cashInput = document.getElementById('end-shift-cash');
        if (!cashInput || !cashInput.value) {
            showError('الرجاء إدخال النقدية الفعلية');
            return;
        }
        
        const actualCash = parseFloat(cashInput.value);
        const summary = await this.getShiftSummary(this.currentShift.id);
        
        if (await this.endShift(actualCash)) {
            document.getElementById('shift-modal').classList.remove('active');
            if (window.updateShiftStatus) window.updateShiftStatus();
            
            // Print Report
            this.printShiftReport(this.currentShift, summary, actualCash);
        }
    }

    printShiftReport(shift, summary, actualCash) {
        const difference = actualCash - summary.netCash;
        const diffColor = difference >= 0 ? 'green' : 'red';
        const diffText = difference >= 0 ? 'زيادة' : 'عجز';
        
        const content = `
            <div style="direction: rtl; font-family: 'Tajawal', sans-serif; padding: 20px; max-width: 300px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 15px;">
                    <h2 style="margin: 0 0 10px 0;">تقرير إغلاق الوردية</h2>
                    <div style="font-size: 0.9rem;">${new Date().toLocaleString('ar-EG')}</div>
                    <div style="font-weight: bold; margin-top: 5px;">رقم الوردية: #${shift.id}</div>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>وقت البدء:</span>
                        <span>${new Date(shift.created_at).toLocaleTimeString('ar-EG')}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>وقت الإغلاق:</span>
                        <span>${new Date().toLocaleTimeString('ar-EG')}</span>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 5px 0;">نقدية البداية</td>
                        <td style="text-align: left; font-weight: bold;">${parseFloat(shift.start_cash).toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 5px 0;">إجمالي المبيعات</td>
                        <td style="text-align: left; font-weight: bold;">${summary.totalSales.toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 5px 0;">إجمالي المرتجعات</td>
                        <td style="text-align: left; font-weight: bold; color: red;">-${summary.totalReturns.toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 5px 0;">المصروفات</td>
                        <td style="text-align: left; font-weight: bold; color: orange;">-${summary.totalExpenses.toFixed(2)}</td>
                    </tr>
                    <tr style="border-top: 2px solid #000; font-weight: bold;">
                        <td style="padding: 10px 0;">صافي النقدية المتوقع</td>
                        <td style="text-align: left;">${summary.netCash.toFixed(2)}</td>
                    </tr>
                </table>

                <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold;">
                        <span>النقدية الفعلية:</span>
                        <span>${actualCash.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: ${diffColor}; font-weight: bold;">
                        <span>الفرق (${diffText}):</span>
                        <span>${difference.toFixed(2)}</span>
                    </div>
                </div>

                <div style="text-align: center; font-size: 0.8rem; margin-top: 30px; border-top: 1px dashed #000; padding-top: 10px;">
                    توقيع المسؤول
                    <br><br><br>
                    ........................
                </div>
            </div>
        `;

        const printWindow = window.open('', '', 'width=400,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>تقرير الوردية #${shift.id}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
                    <style>
                        body { margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; }
                        @media print {
                            @page { margin: 0; size: 80mm auto; }
                            body { margin: 0; }
                        }
                    </style>
                </head>
                <body>
                    ${content}
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
    }
}
