// src/lib/autoMessageScheduler.ts - Auto WhatsApp Scheduler

import { db } from './db';
import { WhatsAppService } from './whatsapp';
import { calculateDaysOverdue } from './utils';

export class AutoMessageScheduler {
    private static instance: AutoMessageScheduler;
    private schedulerInterval: NodeJS.Timeout | null = null;

    private constructor() {}

    static getInstance(): AutoMessageScheduler {
        if (!AutoMessageScheduler.instance) {
            AutoMessageScheduler.instance = new AutoMessageScheduler();
        }
        return AutoMessageScheduler.instance;
    }

    /**
     * Start auto-message scheduler (runs daily at 9 AM)
     */
    start() {
        if (this.schedulerInterval) return;

        // Check immediately on start
        this.checkAndSendMessages();

        // Then schedule daily checks at 9 AM
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(9, 0, 0, 0);

        // If 9 AM has passed today, schedule for tomorrow
        if (now > scheduledTime) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const timeUntilFirstRun = scheduledTime.getTime() - now.getTime();

        setTimeout(() => {
            this.checkAndSendMessages();

            // Then run every 24 hours
            this.schedulerInterval = setInterval(() => {
                this.checkAndSendMessages();
            }, 24 * 60 * 60 * 1000);
        }, timeUntilFirstRun);

        console.log('✅ Auto-message scheduler started');
    }

    /**
     * Stop scheduler
     */
    stop() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
            console.log('⏹️ Auto-message scheduler stopped');
        }
    }

    /**
     * Check customers and send auto-messages
     */
    private async checkAndSendMessages() {
        try {
            // Get all active customers with autoMessaging enabled
            const customers = await db.customers
                .where('status')
                .equals('active')
                .filter(c => c.autoMessaging === true)
                .toArray();

            console.log(`📨 Checking ${customers.length} customers for auto-messages...`);

            const today = new Date().toISOString().split('T')[0];
            let sentCount = 0;

            for (const customer of customers) {
                const daysOverdue = calculateDaysOverdue(customer.lastPayment);

                // Send reminder based on frequency and overdue days
                let shouldSend = false;

                switch (customer.frequency) {
                    case 'daily':
                        shouldSend = daysOverdue >= 1; // Send if 1+ day late
                        break;
                    case 'weekly':
                        shouldSend = daysOverdue >= 7; // Send if 7+ days late
                        break;
                    case 'monthly':
                        shouldSend = daysOverdue >= 30; // Send if 30+ days late
                        break;
                }

                if (shouldSend) {
                    // Check if already sent today
                    const lastMessageKey = `last_auto_message_${customer.id}`;
                    const lastSent = localStorage.getItem(lastMessageKey);

                    if (lastSent !== today) {
                        // Send appropriate message
                        if (daysOverdue > 7) {
                            WhatsAppService.sendOverdueAlert(customer, daysOverdue);
                        } else {
                            WhatsAppService.sendPaymentReminder(customer);
                        }

                        // Mark as sent today
                        localStorage.setItem(lastMessageKey, today);
                        sentCount++;

                        console.log(`✅ Sent auto-message to ${customer.name} (${daysOverdue} days overdue)`);
                    }
                }
            }

            console.log(`📊 Auto-message summary: ${sentCount} messages sent`);
        } catch (error) {
            console.error('❌ Auto-message scheduler error:', error);
        }
    }

    /**
     * Force run scheduler now (for testing)
     */
    async runNow() {
        console.log('🔄 Running scheduler manually...');
        await this.checkAndSendMessages();
    }
}

// Export singleton instance
export const autoMessageScheduler = AutoMessageScheduler.getInstance();

// ✅ Auto-start when imported (client-side only)
if (typeof window !== 'undefined') {
    autoMessageScheduler.start();
}