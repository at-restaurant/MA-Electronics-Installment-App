// src/lib/installmentGenerator.ts - Auto-generate installment schedules

import { Storage } from './storage';
import type { Customer } from '@/types';

export interface InstallmentSchedule {
    id: number;
    customerId: number;
    installmentNumber: number;
    dueDate: string;
    amount: number;
    status: 'pending' | 'paid' | 'overdue';
    paidDate?: string;
    createdAt: string;
}

export class InstallmentGenerator {
    /**
     * Generate installment schedule for a customer
     */
    static generateSchedule(customer: Customer): InstallmentSchedule[] {
        const schedules: InstallmentSchedule[] = [];
        const totalInstallments = Math.ceil(customer.totalAmount / customer.installmentAmount);

        let currentDate = new Date(customer.startDate);

        for (let i = 1; i <= totalInstallments; i++) {
            // Calculate due date based on frequency
            const dueDate = new Date(currentDate);

            switch (customer.frequency) {
                case 'daily':
                    dueDate.setDate(dueDate.getDate() + (i - 1));
                    break;
                case 'weekly':
                    dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
                    break;
                case 'monthly':
                    dueDate.setMonth(dueDate.getMonth() + (i - 1));
                    break;
            }

            // Last installment might be different amount
            const isLastInstallment = i === totalInstallments;
            const remainingAmount = customer.totalAmount - (customer.installmentAmount * (i - 1));
            const installmentAmount = isLastInstallment
                ? Math.min(remainingAmount, customer.installmentAmount)
                : customer.installmentAmount;

            schedules.push({
                id: Date.now() + i,
                customerId: customer.id,
                installmentNumber: i,
                dueDate: dueDate.toISOString().split('T')[0],
                amount: installmentAmount,
                status: 'pending',
                createdAt: new Date().toISOString(),
            });
        }

        return schedules;
    }

    /**
     * Save installment schedule to storage
     */
    static saveSchedule(customerId: number, schedules: InstallmentSchedule[]): void {
        const allSchedules = Storage.get<InstallmentSchedule[]>('installment_schedules', []);

        // Remove existing schedules for this customer
        const filteredSchedules = allSchedules.filter(s => s.customerId !== customerId);

        // Add new schedules
        const updatedSchedules = [...filteredSchedules, ...schedules];

        Storage.save('installment_schedules', updatedSchedules);
    }

    /**
     * Get schedule for a customer
     */
    static getSchedule(customerId: number): InstallmentSchedule[] {
        const allSchedules = Storage.get<InstallmentSchedule[]>('installment_schedules', []);
        return allSchedules
            .filter(s => s.customerId === customerId)
            .sort((a, b) => a.installmentNumber - b.installmentNumber);
    }

    /**
     * Mark installment as paid
     */
    static markAsPaid(scheduleId: number, paidDate: string): void {
        const allSchedules = Storage.get<InstallmentSchedule[]>('installment_schedules', []);
        const scheduleIndex = allSchedules.findIndex(s => s.id === scheduleId);

        if (scheduleIndex !== -1) {
            allSchedules[scheduleIndex].status = 'paid';
            allSchedules[scheduleIndex].paidDate = paidDate;
            Storage.save('installment_schedules', allSchedules);
        }
    }

    /**
     * Update overdue statuses
     */
    static updateOverdueStatus(): void {
        const allSchedules = Storage.get<InstallmentSchedule[]>('installment_schedules', []);
        const today = new Date().toISOString().split('T')[0];
        let updated = false;

        allSchedules.forEach(schedule => {
            if (schedule.status === 'pending' && schedule.dueDate < today) {
                schedule.status = 'overdue';
                updated = true;
            }
        });

        if (updated) {
            Storage.save('installment_schedules', allSchedules);
        }
    }

    /**
     * Get upcoming installments (next 7 days)
     */
    static getUpcoming(customerId?: number): InstallmentSchedule[] {
        const allSchedules = Storage.get<InstallmentSchedule[]>('installment_schedules', []);
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const todayStr = today.toISOString().split('T')[0];
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        let filtered = allSchedules.filter(
            s => s.status === 'pending' && s.dueDate >= todayStr && s.dueDate <= nextWeekStr
        );

        if (customerId) {
            filtered = filtered.filter(s => s.customerId === customerId);
        }

        return filtered.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }

    /**
     * Get payment statistics
     */
    static getStatistics(customerId: number) {
        const schedules = this.getSchedule(customerId);

        const total = schedules.length;
        const paid = schedules.filter(s => s.status === 'paid').length;
        const pending = schedules.filter(s => s.status === 'pending').length;
        const overdue = schedules.filter(s => s.status === 'overdue').length;

        const paidAmount = schedules
            .filter(s => s.status === 'paid')
            .reduce((sum, s) => sum + s.amount, 0);

        const pendingAmount = schedules
            .filter(s => s.status === 'pending' || s.status === 'overdue')
            .reduce((sum, s) => sum + s.amount, 0);

        return {
            total,
            paid,
            pending,
            overdue,
            paidAmount,
            pendingAmount,
            completionRate: total > 0 ? Math.round((paid / total) * 100) : 0,
        };
    }
}