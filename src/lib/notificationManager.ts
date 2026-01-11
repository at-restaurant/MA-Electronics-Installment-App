// src/lib/notificationManager. ts - Production Ready (FIXED)

import { db } from './db';
import { formatCurrency, calculateDaysOverdue } from './utils';
import type { Customer, NotificationSettings } from '@/types';

// Default notification settings
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    enableNotifications: true,
    paymentReminders:  true,
    overdueAlerts: true,
    dailySummary: false,
    reminderTime: '09:00',
    soundEnabled:  true,
};

export class NotificationManager {
    private static instance: NotificationManager;
    private permission: NotificationPermission = 'default';
    private settings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };

    private constructor() {
        this.loadSettings();
        if (typeof window !== 'undefined' && 'Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    private async loadSettings(): Promise<void> {
        try {
            const saved = await db.getMeta<NotificationSettings>('notifications');
            this.settings = saved ??  { ...DEFAULT_NOTIFICATION_SETTINGS };
        } catch (error) {
            console.error('Failed to load notification settings:', error);
            this.settings = { ... DEFAULT_NOTIFICATION_SETTINGS };
        }
    }

    static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager. instance;
    }

    async requestPermission(): Promise<boolean> {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        if (this. permission === 'default') {
            this.permission = await Notification.requestPermission();
            return this.permission === 'granted';
        }

        return false;
    }

    async updateSettings(settings: NotificationSettings): Promise<void> {
        this.settings = settings;
        try {
            await db.setMeta('notifications', settings);
        } catch (error) {
            console.error('Failed to save notification settings:', error);
        }
    }

    getSettings(): NotificationSettings {
        return { ...this.settings };
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
        if (!this.canSendNotification()) return;

        try {
            const notification = new Notification(title, {
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                ... options,
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

        try {
            const customers = await db.customers.toArray();

            for (const customer of customers) {
                if (customer.status === 'completed') continue;

                const daysOverdue = calculateDaysOverdue(customer. lastPayment);

                if (customer.frequency === 'daily' && daysOverdue >= 1) {
                    await this. sendNotification(`Payment Due:  ${customer.name}`, {
                        body: `Daily installment of ${formatCurrency(customer.installmentAmount)} is due. `,
                        tag: `reminder-${customer.id}`,
                        requireInteraction: false,
                    });
                }
            }
        } catch (error) {
            console.error('Failed to check daily reminders:', error);
        }
    }

    async checkOverdueAlerts(): Promise<void> {
        if (!this.settings.overdueAlerts) return;

        try {
            const customers = await db.customers.toArray();

            for (const customer of customers) {
                if (customer.status === 'completed') continue;

                const daysOverdue = calculateDaysOverdue(customer.lastPayment);

                if (daysOverdue >= 7) {
                    await this.sendNotification(`⚠️ Payment Overdue:  ${customer.name}`, {
                        body: `Payment is ${daysOverdue} days overdue.  Amount:  ${formatCurrency(
                            customer.totalAmount - customer.paidAmount
                        )}`,
                        tag: `overdue-${customer.id}`,
                        requireInteraction: true,
                    });
                }
            }
        } catch (error) {
            console.error('Failed to check overdue alerts:', error);
        }
    }

    async sendDailySummary(profileName: string, stats: any): Promise<void> {
        if (!this.settings.dailySummary) return;

        try {
            await this.sendNotification(`Daily Summary - ${profileName}`, {
                body: `Received:  ${formatCurrency(stats.totalReceived)} | Expected: ${formatCurrency(
                    stats.totalExpected
                )} | Collection:  ${stats.collectionRate. toFixed(1)}%`,
                tag: 'daily-summary',
                requireInteraction: false,
            });
        } catch (error) {
            console.error('Failed to send daily summary:', error);
        }
    }

    async testNotification(): Promise<void> {
        await this.sendNotification('MA Electronics', {
            body: 'Notification test successful!',
            tag: 'test',
        });
    }
}

// Export singleton instance getter
export function getNotificationManager(): NotificationManager {
    return NotificationManager. getInstance();
}