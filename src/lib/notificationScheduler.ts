// src/lib/notificationScheduler.ts - AUTO NOTIFICATION SYSTEM

import { getNotificationManager } from './notificationManager';
import { db } from './db';
import { formatCurrency, calculateDaysOverdue } from './utils';

export class NotificationScheduler {
    private static intervalId: NodeJS.Timeout | null = null;
    private static isRunning = false;

    /**
     * Start the notification scheduler
     */
    static start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log('📢 Notification Scheduler Started');

        // Check immediately
        this.checkNotifications();

        // Then check every hour
        this.intervalId = setInterval(() => {
            this.checkNotifications();
        }, 60 * 60 * 1000); // Every 1 hour
    }

    /**
     * Stop the scheduler
     */
    static stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('📢 Notification Scheduler Stopped');
    }

    /**
     * Check and send notifications
     */
    static async checkNotifications(): Promise<void> {
        const manager = getNotificationManager();
        const settings = manager.getSettings();

        if (!settings.enableNotifications) return;

        try {
            const customers = await db.customers.toArray();
            const now = new Date();
            const currentHour = now.getHours();

            // Only send between 9 AM - 8 PM
            if (currentHour < 9 || currentHour > 20) return;

            // Check daily reminders
            if (settings.paymentReminders) {
                await this.checkDailyReminders(customers);
            }

            // Check overdue alerts
            if (settings.overdueAlerts) {
                await this.checkOverdueAlerts(customers);
            }

            console.log('✅ Notification check completed');
        } catch (error) {
            console.error('❌ Notification check failed:', error);
        }
    }

    /**
     * Check daily payment reminders
     */
    private static async checkDailyReminders(customers: any[]): Promise<void> {
        const manager = getNotificationManager();

        for (const customer of customers) {
            if (customer.status === 'completed') continue;

            const daysOverdue = calculateDaysOverdue(customer.lastPayment);

            // Send reminder if payment due today (daily frequency)
            if (customer.frequency === 'daily' && daysOverdue >= 1 && daysOverdue < 7) {
                await manager.sendNotification(`Payment Due: ${customer.name}`, {
                    body: `Daily installment of ${formatCurrency(customer.installmentAmount)} is due.`,
                    tag: `reminder-${customer.id}`,
                    requireInteraction: false,
                });

                console.log(`📢 Sent reminder to ${customer.name}`);

                // Wait 2 seconds between notifications
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Check overdue alerts
     */
    private static async checkOverdueAlerts(customers: any[]): Promise<void> {
        const manager = getNotificationManager();

        for (const customer of customers) {
            if (customer.status === 'completed') continue;

            const daysOverdue = calculateDaysOverdue(customer.lastPayment);

            // Send alert if overdue by 7+ days
            if (daysOverdue >= 7) {
                await manager.sendNotification(`⚠️ Payment Overdue: ${customer.name}`, {
                    body: `Payment is ${daysOverdue} days overdue. Amount: ${formatCurrency(
                        customer.totalAmount - customer.paidAmount
                    )}`,
                    tag: `overdue-${customer.id}`,
                    requireInteraction: true,
                });

                console.log(`⚠️ Sent overdue alert to ${customer.name}`);

                // Wait 2 seconds between notifications
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Send daily summary
     */
    static async sendDailySummary(): Promise<void> {
        const manager = getNotificationManager();
        const settings = manager.getSettings();

        if (!settings.dailySummary) return;

        try {
            const profile = await db.getMeta<any>('currentProfile');
            if (!profile) return;

            const stats = await db.calculateStatistics(profile.id);

            await manager.sendDailySummary(profile.name, stats);
            console.log('📊 Daily summary sent');
        } catch (error) {
            console.error('Failed to send daily summary:', error);
        }
    }

    /**
     * Send payment received notification
     */
    static async notifyPaymentReceived(customerName: string, amount: number): Promise<void> {
        const manager = getNotificationManager();

        await manager.sendNotification('✅ Payment Received', {
            body: `${customerName} paid ${formatCurrency(amount)}`,
            tag: 'payment',
            requireInteraction: false,
        });
    }

    /**
     * Send completion notification
     */
    static async notifyCompletion(customerName: string): Promise<void> {
        const manager = getNotificationManager();

        await manager.sendNotification('🎉 Installment Complete!', {
            body: `${customerName} completed all payments!`,
            tag: 'completion',
            requireInteraction: true,
        });
    }
}

// Auto-start when module loads
if (typeof window !== 'undefined') {
    // Start after 10 seconds
    setTimeout(() => {
        NotificationScheduler.start();
    }, 10000);

    // Send daily summary at 8 PM
    const checkDailySummary = () => {
        const now = new Date();
        if (now.getHours() === 20 && now.getMinutes() === 0) {
            NotificationScheduler.sendDailySummary();
        }
    };

    setInterval(checkDailySummary, 60 * 1000); // Check every minute
}