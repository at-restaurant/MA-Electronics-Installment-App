// src/lib/notificationManager.ts - Integrated notification system

import { Storage } from './storage';
import { formatCurrency, calculateDaysOverdue } from './utils';
import type { Customer, NotificationSettings } from '@/types';

export class NotificationManager {
    private static instance: NotificationManager;
    private permission: NotificationPermission = 'default';
    private settings: NotificationSettings;

    private constructor() {
        this.settings = Storage.get<NotificationSettings>('notifications', {
            enableNotifications: true,
            paymentReminders: true,
            overdueAlerts: true,
            dailySummary: false,
        });

        if (typeof window !== 'undefined' && 'Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }

    async requestPermission(): Promise<boolean> {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            console.warn('Notifications not supported');
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
            return this.permission === 'granted';
        }

        return false;
    }

    updateSettings(settings: NotificationSettings): void {
        this.settings = settings;
        Storage.save('notifications', settings);
    }

    getSettings(): NotificationSettings {
        return this.settings;
    }

    private canSendNotification(): boolean {
        return (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            this.permission === 'granted' &&
            this.settings.enableNotifications
        );
    }

    async sendNotification(title: string, options?: NotificationOptions): Promise<void> {
        if (!this.canSendNotification()) {
            return;
        }

        try {
            const notification = new Notification(title, {
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                ...options,
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    }

    async checkDailyReminders(): Promise<void> {
        if (!this.settings.paymentReminders) return;

        const customers = Storage.get<Customer[]>('customers', []);
        const today = new Date().toISOString().split('T')[0];

        for (const customer of customers) {
            if (customer.status === 'completed') continue;

            const daysOverdue = calculateDaysOverdue(customer.lastPayment);

            // Check if payment is due today (for daily frequency)
            if (customer.frequency === 'daily' && daysOverdue >= 1) {
                await this.sendNotification(
                    `Payment Due: ${customer.name}`,
                    {
                        body: `Daily installment of ${formatCurrency(customer.installmentAmount)} is due.`,
                        tag: `reminder-${customer.id}`,
                        requireInteraction: false,
                    }
                );
            }
        }
    }

    async checkOverdueAlerts(): Promise<void> {
        if (!this.settings.overdueAlerts) return;

        const customers = Storage.get<Customer[]>('customers', []);

        for (const customer of customers) {
            if (customer.status === 'completed') continue;

            const daysOverdue = calculateDaysOverdue(customer.lastPayment);

            // Alert for customers overdue by more than 7 days
            if (daysOverdue > 7) {
                await this.sendNotification(
                    `⚠️ Overdue Payment: ${customer.name}`,
                    {
                        body: `Payment is ${daysOverdue} days overdue. Amount: ${formatCurrency(customer.installmentAmount)}`,
                        tag: `overdue-${customer.id}`,
                        requireInteraction: true,
                        vibrate: [200, 100, 200],
                    }
                );
            }
        }
    }

    async sendDailySummary(): Promise<void> {
        if (!this.settings.dailySummary) return;

        const customers = Storage.get<Customer[]>('customers', []);
        const payments = Storage.get('payments', []);

        const today = new Date().toISOString().split('T')[0];
        const todayPayments = payments.filter((p: any) => p.date === today);

        const totalCollected = todayPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const activeCustomers = customers.filter(c => c.status === 'active').length;

        await this.sendNotification(
            '📊 Daily Summary',
            {
                body: `Collected: ${formatCurrency(totalCollected)} | Active: ${activeCustomers} customers`,
                tag: 'daily-summary',
                requireInteraction: false,
            }
        );
    }

    async scheduleDailyChecks(): Promise<void> {
        if (typeof window === 'undefined') return;

        // Check reminders every hour
        setInterval(() => {
            this.checkDailyReminders();
        }, 60 * 60 * 1000);

        // Check overdue alerts twice daily
        setInterval(() => {
            this.checkOverdueAlerts();
        }, 12 * 60 * 60 * 1000);

        // Send daily summary at 8 PM
        const now = new Date();
        const summaryTime = new Date();
        summaryTime.setHours(20, 0, 0, 0);

        if (now > summaryTime) {
            summaryTime.setDate(summaryTime.getDate() + 1);
        }

        const timeUntilSummary = summaryTime.getTime() - now.getTime();

        setTimeout(() => {
            this.sendDailySummary();
            // Repeat daily
            setInterval(() => {
                this.sendDailySummary();
            }, 24 * 60 * 60 * 1000);
        }, timeUntilSummary);
    }

    // Trigger specific notification types
    async notifyPaymentReceived(customerName: string, amount: number): Promise<void> {
        await this.sendNotification(
            '✅ Payment Received',
            {
                body: `${customerName} paid ${formatCurrency(amount)}`,
                tag: 'payment-received',
            }
        );
    }

    async notifyPaymentCompleted(customerName: string): Promise<void> {
        await this.sendNotification(
            '🎉 Installment Completed!',
            {
                body: `${customerName} has completed all payments!`,
                tag: 'payment-completed',
                requireInteraction: true,
            }
        );
    }

    async notifyLowStorage(): Promise<void> {
        await this.sendNotification(
            '⚠️ Storage Warning',
            {
                body: 'Your app storage is running low. Consider cleaning up old records.',
                tag: 'storage-warning',
                requireInteraction: true,
            }
        );
    }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();