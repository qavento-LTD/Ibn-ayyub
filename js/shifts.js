import { supabase } from './supabase-client.js';
import { showError, showSuccess } from './utils.js';

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
}
