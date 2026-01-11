// src/lib/whatsappQueue.ts - Production Ready (FIXED)

import type { Customer } from '@/types';
import { db } from './db';
import { formatCurrency, formatDate } from './utils';

const MessageTemplates = {
    welcome: (customer: Customer) => `
*Assalam-o-Alaikum ${customer.name} Sahab!* 🙏

Aap ka *MA Electronics* mein bohot bohot shukria! 

📋 *Aap ki Qist ki Tafseel: *
━━━━━━━━━━━━━━━━
💰 Kul Raqam: *${formatCurrency(customer.totalAmount)}*
📅 Qist: *${formatCurrency(customer.installmentAmount)}*
📆 Shuru: ${formatDate(customer.startDate)}

_MA Electronics - Aap ka Bharosa_
  `.trim(),

    payment: (customer: Customer, amount: number, remaining: number) => `
✅ *Qist Wusool Ho Gayi! *

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

    overdue: (customer:  Customer, days: number, remaining: number) => `
⚠️ *Yaad Dehani* ⚠️

*${customer.name} Sahab*,
Qist *${days} din* takheer mein hai. 
💰 Baaqi: *${formatCurrency(remaining)}*

🙏 Jald ada karen
_MA Electronics_
  `.trim(),

    completion: (customer:  Customer) => `
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
     * Initialize WhatsApp queue service
     */
    static init(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', () => {
            if (navigator.onLine) {
                WhatsAppQueueService.processQueue();
            }
        });

        // Try to process immediately if online
        if (navigator.onLine) {
            WhatsAppQueueService.processQueue();
        }
    }

    /**
     * Add message to queue (works offline)
     */
    static async queueMessage(
        customer: Customer,
        type: 'welcome' | 'payment' | 'reminder' | 'overdue' | 'completion',
        metadata?: { amount?:  number; days?: number }
    ): Promise<void> {
        if (! customer.autoMessaging) return;

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
                message = MessageTemplates. overdue(customer, metadata?.days || 0, remaining);
                break;
            case 'completion':
                message = MessageTemplates.completion(customer);
                break;
        }

        await db.addToWhatsAppQueue({
            phone:  customer.phone,
            message,
            customerId: customer.id,
            type,
        });
    }

    /**
     * Format phone number to WhatsApp format
     */
    private static formatPhone(phone: string): string {
        let cleanPhone = phone.replace(/\D/g, '');
        if (! cleanPhone. startsWith('92')) {
            if (cleanPhone.startsWith('0')) {
                cleanPhone = `92${cleanPhone.substring(1)}`;
            } else {
                cleanPhone = `92${cleanPhone}`;
            }
        }
        return cleanPhone;
    }

    /**
     * Get queue status
     */
    static async getQueueStatus(): Promise<{ count: number; items: any[] }> {
        try {
            const queue = await db.getWhatsAppQueue();
            return { count: queue.length, items: queue };
        } catch (error) {
            console.error('Failed to get queue status:', error);
            return { count: 0, items: [] };
        }
    }

    /**
     * Process the queue
     */
    static async processQueue(): Promise<void> {
        if (WhatsAppQueueService.processingQueue || !navigator.onLine) return;

        WhatsAppQueueService.processingQueue = true;

        try {
            const queue = await db.getWhatsAppQueue();
            for (const item of queue) {
                try {
                    const formattedPhone = WhatsAppQueueService.formatPhone(item.phone);
                    await WhatsAppQueueService.sendMessage(formattedPhone, item.message);

                    // Remove from queue only when id exists
                    if (item.id != null) {
                        await db. removeFromWhatsAppQueue(item. id);
                    }

                    console.log(`✅ Sent queued message to ${item.phone. substring(0, 5)}***`);

                    // Notify admin
                    WhatsAppQueueService.notifyAdmin(`Message sent to customer`, 'success');

                    // Wait 2 seconds between messages
                    await WhatsAppQueueService.delay(2000);
                } catch (error) {
                    console. error(`Failed to send message to ${item.phone}:`, error);
                    // increment attempts only if id exists
                    if (item.id != null) {
                        await db.incrementQueueAttempts(item.id);
                    }
                }
            }
        } finally {
            WhatsAppQueueService.processingQueue = false;
        }
    }

    /**
     * Clear failed messages
     */
    static async clearFailedMessages(): Promise<number> {
        try {
            const queue = await db.whatsappQueue. where('attempts').aboveOrEqual(3).toArray();
            const count = queue.length;

            for (const item of queue) {
                if (item.id != null) {
                    await db.removeFromWhatsAppQueue(item.id);
                }
            }

            return count;
        } catch (error) {
            console.error('Failed to clear failed messages:', error);
            return 0;
        }
    }

    /**
     * Send WhatsApp message
     */
    static async sendMessage(phone: string, message: string): Promise<void> {
        // Format phone
        const formattedPhone = WhatsAppQueueService.formatPhone(phone);

        // WhatsApp Web URL
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

        // Check if we're in browser and can open window
        if (typeof window !== 'undefined') {
            try {
                window.open(url, '_blank');
            } catch (error) {
                console.error('Failed to open WhatsApp:', error);
            }
        }
    }

    /**
     * Notify admin about queue status
     */
    static notifyAdmin(message: string, level: 'success' | 'error' | 'info'): void {
        const levelIcon = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
        };

        console.log(`[ADMIN ${level. toUpperCase()}] ${levelIcon[level]} ${message}`);

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('MA Electronics Admin', {
                    body: message,
                    icon: '/icon-192x192.png',
                    tag: `admin-${Date.now()}`,
                });
            } catch (error) {               console.error('Failed to send admin notification:', error);
            }
        }
    }

    /**
     * Delay utility
     */
    static delay(ms: number): Promise<void> {
        return new Promise((res) => setTimeout(res, ms));
    }
}

// Auto-initialize once module loaded
if (typeof window !== 'undefined') {
    WhatsAppQueueService.init();
}