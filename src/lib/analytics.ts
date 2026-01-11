// src/lib/analytics.ts - FIXED
import type { Customer, Payment } from '@/types';

export interface DailyData {
    date: string;
    amount: number;
    count: number;
}

export interface MonthlyData {
    month: string;
    amount: number;
    count: number;
}

export interface CustomerGrowth {
    month: string;
    total: number;
    active: number;
    completed: number;
}

export const AnalyticsService = {
    /**
     * Get daily revenue for last N days
     */
    getDailyRevenue: (payments: Payment[], days: number = 30): DailyData[] => {
        const result: { [key: string]: DailyData } = {};
        const now = new Date();

        // Initialize last N days
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            result[dateStr] = { date: dateStr, amount: 0, count: 0 };
        }

        // Aggregate payments
        payments.forEach(payment => {
            const dateStr = payment.date;
            if (result[dateStr]) {
                result[dateStr].amount += payment.amount;
                result[dateStr].count += 1;
            }
        });

        return Object.values(result).sort((a, b) => a.date.localeCompare(b.date));
    },

    /**
     * Get monthly revenue for last 12 months
     */
    getMonthlyRevenue: (payments: Payment[]): MonthlyData[] => {
        const result: { [key: string]: MonthlyData } = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
            result[monthKey] = { month: monthKey, amount: 0, count: 0 };
        }

        // Aggregate payments
        payments.forEach(payment => {
            const date = new Date(payment.date);
            const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
            if (result[monthKey]) {
                result[monthKey].amount += payment.amount;
                result[monthKey].count += 1;
            }
        });

        return Object.values(result);
    },

    /**
     * Get customer growth over time
     */
    getCustomerGrowth: (customers: Customer[]): CustomerGrowth[] => {
        const result: { [key: string]: CustomerGrowth } = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
            result[monthKey] = { month: monthKey, total: 0, active: 0, completed: 0 };
        }

        // Count customers
        customers.forEach(customer => {
            const startDate = new Date(customer.startDate);
            const monthKey = `${months[startDate.getMonth()]} ${startDate.getFullYear()}`;

            if (result[monthKey]) {
                result[monthKey].total += 1;
                if (customer.paidAmount >= customer.totalAmount) {
                    result[monthKey].completed += 1;
                } else {
                    result[monthKey].active += 1;
                }
            }
        });

        return Object.values(result);
    },

    /**
     * Get collection rate by frequency
     */
    getCollectionByFrequency: (customers: Customer[]): { frequency: string; amount: number; count: number }[] => {
        const frequencies = ['daily', 'weekly', 'monthly'];

        return frequencies.map(freq => {
            const filtered = customers.filter(c => c.frequency === freq);
            const amount = filtered.reduce((sum, c) => sum + c.paidAmount, 0);
            return {
                frequency: freq.charAt(0).toUpperCase() + freq.slice(1),
                amount,
                count: filtered.length,
            };
        });
    },

    /**
     * Get top paying customers
     */
    getTopCustomers: (customers: Customer[], limit: number = 10): Customer[] => {
        return [...customers]
            .sort((a, b) => b.paidAmount - a.paidAmount)
            .slice(0, limit);
    },

    /**
     * Get payment trends
     */
    getPaymentTrends: (payments: Payment[], days: number = 7) => {
        const recent = payments.filter(p => {
            const date = new Date(p.date);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            return diff <= days * 24 * 60 * 60 * 1000;
        });

        const total = recent.reduce((sum, p) => sum + p.amount, 0);
        const average = recent.length > 0 ? total / recent.length : 0;

        return {
            count: recent.length,
            total,
            average,
            trend: recent.length > 0 ? 'up' : 'stable',
        };
    },

    /**
     * Calculate collection rate
     */
    getCollectionRate: (customers: Customer[]): number => {
        if (customers.length === 0) return 0;

        const totalExpected = customers.reduce((sum, c) => sum + c.totalAmount, 0);
        const totalCollected = customers.reduce((sum, c) => sum + c.paidAmount, 0);

        return totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    },

    /**
     * Get overdue statistics
     */
    getOverdueStats: (customers: Customer[]) => {
        const now = new Date();

        const overdue = customers.filter(c => {
            if (c.paidAmount >= c.totalAmount) return false;
            const lastPayment = new Date(c.lastPayment);
            const daysSince = Math.floor((now.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24));
            return daysSince > 7;
        });

        const overdueAmount = overdue.reduce((sum, c) => sum + (c.totalAmount - c.paidAmount), 0);

        return {
            count: overdue.length,
            amount: overdueAmount,
            percentage: customers.length > 0 ? Math.round((overdue.length / customers.length) * 100) : 0,
        };
    },
};