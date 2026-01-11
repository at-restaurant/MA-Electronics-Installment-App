// src/lib/whatsappQueue.ts - Offline WhatsApp Message Queue

import { db } from './db';
import { formatCurrency, formatDate } from './utils';
import type { Customer } from '@/types';

const MessageTemplates = {
    welcome: (customer: Customer) => `
*Assalam-o-Alaikum ${customer.name} Sahab!* 🙏

Aap ka *MA Electronics* mein bohot bohot shukria!

📋 *Aap ki Qist ki Tafseel:*
━━━━━━━━━━━━━━━━
💰 Kul Raqam: *${formatCurrency(customer.totalAmount)}*
📅 Qist: *${formatCurrency(customer.installmentAmount)}*
📆 Shuru: ${formatDate(customer.startDate)}

_MA Electronics - Aap ka Bharosa_
  `.trim(),

    payment: (customer: Customer, amount: number, remaining: number) => `
✅ *Qist Wusool Ho Gayi!*

*${customer.name} Sahab*,
💰 Wusool: *${formatCurrency(amount)}*
📊 Baaqi: *${formatCurrency(remaining)}*

🙏 Shukria!
_MA Electronics_
  `.trim(),

    reminder: (customer: Customer, remaining: number) => `
*Assalam-o-Alaikum ${customer.name} Sahab!* 🙏

💰 Baaqi: *${formatCurrency(remaining)}*
📅 Qist: *${formatCurrency(customer.installmentAmount)}*

_MA Electronics_
  `.trim(),

    overdue: (customer: Customer, days: number, remaining: number) => `
⚠️ *Yaad Dehani* ⚠️

*${customer.name} Sahab*,
Qist *${days} din* takheer mein hai.
💰 Baaqi: *${formatCurrency(remaining)}*

🙏 Jald ada karen
_MA Electronics_
  `.trim(),

    completion: (customer: Customer) => `
🎉 *MUBARAK HO!* 🎉

*${customer.name} Sahab* ne tamam qistain mukammal kar lein!
💰 ${formatCurrency(customer.totalAmount)}

✨ Bohot shukria!
_MA Electronics_
  `.trim(),
};

export class WhatsAppQueueService {
    private static processingQueue = false;

    /**
     * Add message to queue (works offline)
     */
    static async queueMessage(
        customer: Customer,
        type: 'welcome' | 'payment' | 'reminder' | 'overdue' | 'completion',
        metadata?: { amount?: number; days?: number }
    ): Promise<void> {
        if (!customer.autoMessaging) return;

        const remaining = customer.totalAmount - customer.paidAmount;
        let message = '';

        switch (type) {
            case 'welcome':
                message = MessageTemplates.welcome(customer);
                break;
            case 'payment':
                message = MessageTemplates.payment(customer, metadata?.amount || 0, remaining);
                break;
            case 'reminder':
                message = MessageTemplates.reminder(customer, remaining);
                break;
            case 'overdue':
                message = MessageTemplates.overdue(customer, metadata?.days || 0, remaining);
                break;
            case 'completion':
                message = MessageTemplates.completion(customer);
                break;
        }

        await db.addToWhatsAppQueue({
            phone: customer.phone,
            message,
            customerId: customer.id,
            type,
        });

        console.log(`📝 Queued ${type} message for ${customer.name}`);

        // Try to process immediately if online
        if (navigator.onLine) {
            this.processQueue();
        }
    }

    /**
     * Process queued messages (when online)
     */
    static async processQueue(): Promise<void> {
        if (this.processingQueue || !navigator.onLine) return;

        this.processingQueue = true;

        try {
            const queue = await db.getWhatsAppQueue();

            for (const item of queue) {
                try {
                    await this.sendMessage(item.phone, item.message);
                    await db.removeFromWhatsAppQueue(item.id!);

                    console.log(`✅ Sent queued message to ${item.phone.substring(0, 5)}***`);

                    // Notify admin
                    this.notifyAdmin(`Message sent to customer`, 'success');

                    // Wait 2 seconds between messages
                    await this.delay(2000);
                } catch (error) {
                    console.error(`Failed to send message to ${item.phone}:`, error);
                    await db.incrementQueueAttempts(item.id!);
                }
            }
        } finally {
            this.processingQueue = false;
        }
    }

    /**
     * Send WhatsApp message (opens in new tab)
     */
    private static async sendMessage(phone: string, message: string): Promise<void> {
        let cleanPhone = phone.replace(/[^0-9]/g, '');

        if (!cleanPhone.startsWith('92')) {
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '92' + cleanPhone.substring(1);
            } else {
                cleanPhone = '92' + cleanPhone;
            }
        }

        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

        // Open in new tab
        window.open(url, '_blank');

        // Store in history
        this.addToHistory(cleanPhone, message);
    }

    /**
     * Add to history
     */
    private static addToHistory(phone: string, message: string): void {
        const history = JSON.parse(localStorage.getItem('whatsapp_history') || '[]');
        history.unshift({
            phone,
            message: message.substring(0, 50) + '...',
            timestamp: new Date().toISOString(),
            type: 'auto',
        });
        localStorage.setItem('whatsapp_history', JSON.stringify(history.slice(0, 100)));
    }

    /**
     * Get queue status
     */
    static async getQueueStatus(): Promise<{ count: number; items: any[] }> {
        const items = await db.getWhatsAppQueue();
        return { count: items.length, items };
    }

    /**
     * Clear failed messages
     */
    static async clearFailedMessages(): Promise<number> {
        const items = await db.whatsappQueue.where('attempts').aboveOrEqual(3).toArray();
        const ids = items.map(i => i.id!);
        await db.whatsappQueue.bulkDelete(ids);
        return ids.length;
    }

    /**
     * Notify admin
     */
    private static notifyAdmin(message: string, type: 'success' | 'error'): void {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(type === 'success' ? '✅ Message Sent' : '❌ Send Failed', {
                body: message,
                icon: '/icon-192x192.png',
                silent: type === 'success',
            });
        }
    }

    /**
     * Delay helper
     */
    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Initialize queue processor (call on app load)
     */
    static initialize(): void {
        // Process queue on page load
        if (navigator.onLine) {
            setTimeout(() => this.processQueue(), 3000);
        }

        // Process queue when coming online
        window.addEventListener('online', () => {
            console.log('🌐 Back online - processing queue...');
            this.processQueue();
        });

        // Check queue every 5 minutes
        setInterval(() => {
            if (navigator.onLine) {
                this.processQueue();
            }
        }, 5 * 60 * 1000);
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    WhatsAppQueueService.initialize();
}