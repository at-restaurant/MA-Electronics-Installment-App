// src/lib/whatsapp-unified.ts - Roman Urdu WITHOUT EMOJIS

import { formatCurrency, formatDate } from './utils';
import { db } from './db';
import type { Customer, WhatsAppQueue } from '@/types';

// ============================================
// MESSAGE TEMPLATES (Roman Urdu - NO EMOJIS)
// ============================================

const Templates = {
    welcome: (customer: Pick<Customer, 'name' | 'totalAmount' | 'installmentAmount' | 'startDate'>) => `
Assalam-o-Alaikum ${customer.name} Sahab!

Aap ka MA Electronics mein bohot bohot shukria!

Aap ki Qist ki Tafseel:
Kul Raqam: ${formatCurrency(customer.totalAmount)}
Qist: ${formatCurrency(customer.installmentAmount)}
Shuru: ${formatDate(customer.startDate)}

MA Electronics - Aap ka Bharosa
  `.trim(),

    payment: (customer: Pick<Customer, 'name'>, amount: number, remaining: number) => `
Qist Wusool Ho Gayi!

${customer.name} Sahab,
Wusool: ${formatCurrency(amount)}
Baaqi: ${formatCurrency(remaining)}

Shukria!
MA Electronics
  `.trim(),

    reminder: (customer: Pick<Customer, 'name' | 'installmentAmount'>, remaining: number) => `
Assalam-o-Alaikum ${customer.name} Sahab!

Baaqi: ${formatCurrency(remaining)}
Qist: ${formatCurrency(customer.installmentAmount)}

MA Electronics
  `.trim(),

    overdue: (customer: Pick<Customer, 'name'>, days: number, remaining: number) => `
Yaad Dehani

${customer.name} Sahab,
Qist ${days} din takheer mein hai.
Baaqi: ${formatCurrency(remaining)}

Jald ada karen
MA Electronics
  `.trim(),

    completion: (customer: Pick<Customer, 'name' | 'totalAmount'>) => `
MUBARAK HO!

${customer.name} Sahab ne tamam qistain mukammal kar lein!
${formatCurrency(customer.totalAmount)}

Bohot shukria!
MA Electronics
  `.trim(),
};

// ============================================
// UNIFIED WHATSAPP SERVICE
// ============================================

export class WhatsAppService {
    /**
     * Format phone number (92XXXXXXXXXX)
     */
    private static formatPhone(phone: string): string {
        let clean = phone.replace(/\D/g, '');
        if (!clean.startsWith('92')) {
            if (clean.startsWith('0')) {
                clean = `92${clean.substring(1)}`;
            } else {
                clean = `92${clean}`;
            }
        }
        return clean;
    }

    /**
     * Open WhatsApp (Manual - opens in new tab)
     */
    static openWhatsApp(phone: string, message: string): void {
        const formatted = this.formatPhone(phone);
        const url = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }

    /**
     * Queue message for background sending (offline support)
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
                message = Templates.welcome(customer);
                break;
            case 'payment':
                message = Templates.payment(customer, metadata?.amount || 0, remaining);
                break;
            case 'reminder':
                message = Templates.reminder(customer, remaining);
                break;
            case 'overdue':
                message = Templates.overdue(customer, metadata?.days || 0, remaining);
                break;
            case 'completion':
                message = Templates.completion(customer);
                break;
        }

        await db.addToWhatsAppQueue({
            phone: customer.phone,
            message,
            customerId: customer.id,
            type,
        });

        // If online, process immediately
        if (navigator.onLine) {
            this.processQueue();
        }
    }

    /**
     * Process message queue
     */
    static async processQueue(): Promise<void> {
        const queue = await db.getWhatsAppQueuePending();

        for (const item of queue) {
            try {
                this.openWhatsApp(item.phone, item.message);

                // Wait 2 seconds between messages
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Remove from queue
                if (item.id != null) {
                    await db.removeFromWhatsAppQueue(item.id);
                }

                console.log(`Sent queued message to ${item.phone.substring(0, 5)}***`);
            } catch (error) {
                console.error(`Failed to send message:`, error);
                // Increment attempts
                if (item.id != null) {
                    await db.incrementQueueAttempts(item.id);
                }
            }
        }
    }

    /**
     * Send welcome message
     */
    static sendWelcome(customer: Pick<Customer, 'name' | 'phone' | 'totalAmount' | 'installmentAmount' | 'startDate'>): void {
        const message = Templates.welcome(customer);
        this.openWhatsApp(customer.phone, message);
    }

    /**
     * Send payment reminder
     */
    static sendReminder(customer: Pick<Customer, 'name' | 'phone' | 'totalAmount' | 'paidAmount' | 'installmentAmount'>): void {
        const remaining = customer.totalAmount - customer.paidAmount;
        const message = Templates.reminder(customer, remaining);
        this.openWhatsApp(customer.phone, message);
    }

    /**
     * Send overdue alert
     */
    static sendOverdue(customer: Pick<Customer, 'name' | 'phone' | 'totalAmount' | 'paidAmount'>, days: number): void {
        const remaining = customer.totalAmount - customer.paidAmount;
        const message = Templates.overdue(customer, days, remaining);
        this.openWhatsApp(customer.phone, message);
    }

    /**
     * Send completion message
     */
    static sendCompletion(customer: Pick<Customer, 'name' | 'phone' | 'totalAmount'>): void {
        const message = Templates.completion(customer);
        this.openWhatsApp(customer.phone, message);
    }

    /**
     * Auto-send after payment (queued)
     */
    static async autoSendPaymentReceipt(customer: Customer, amount: number): Promise<void> {
        if (!customer.autoMessaging) return;
        await this.queueMessage(customer, 'payment', { amount });
    }

    /**
     * Get queue status
     */
    static async getQueueStatus(): Promise<{ count: number; items: WhatsAppQueue[] }> {
        const items = await db.getWhatsAppQueuePending();
        return { count: items.length, items };
    }

    /**
     * Clear failed messages (3+ attempts)
     */
    static async clearFailed(): Promise<number> {
        const failed = await db.whatsappQueue.where('attempts').aboveOrEqual(3).toArray();
        const count = failed.length;

        for (const item of failed) {
            if (item.id != null) {
                await db.removeFromWhatsAppQueue(item.id);
            }
        }

        return count;
    }
}

// Auto-initialize: Process queue when online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        WhatsAppService.processQueue();
    });
}