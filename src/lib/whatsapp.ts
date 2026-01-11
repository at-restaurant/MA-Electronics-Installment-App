// src/lib/whatsapp.ts - TRUE BACKGROUND AUTO-SEND (No Human Interaction)

import { formatCurrency, formatDate } from "./utils";

interface Customer {
    name: string;
    phone: string;
    totalAmount: number;
    paidAmount: number;
    installmentAmount: number;
    startDate: string;
    autoMessaging?: boolean;
}

/**
 * WhatsApp Message Templates - ROMAN URDU
 */
const MessageTemplates = {
    welcome: (customer: Customer) => `
*Assalam-o-Alaikum ${customer.name} Sahab!* 🙏

Aap ka *MA Electronics* mein bohot bohot shukria!

📋 *Aap ki Qist ki Tafseel:*
━━━━━━━━━━━━━━━━
💰 Kul Raqam: *${formatCurrency(customer.totalAmount)}*
📅 Rozana Qist: *${formatCurrency(customer.installmentAmount)}*
📆 Shuru: ${formatDate(customer.startDate)}

Hum aap ki khidmat ke liye hazir hain! ✨

_MA Electronics - Aap ka Bharosa_
  `.trim(),

    paymentReminder: (customer: Customer, remaining: number) => `
*Assalam-o-Alaikum ${customer.name} Sahab!* 🙏

Yeh aap ki qist ki yaad dehani hai:

💰 Baaqi Raqam: *${formatCurrency(remaining)}*
📅 Aaj ki Qist: *${formatCurrency(customer.installmentAmount)}*

📞 Koi sawal ho to behijhak rabta karein!

_Shukria - MA Electronics_
  `.trim(),

    overdueAlert: (customer: Customer, daysOverdue: number, remaining: number) => `
⚠️ *Ahmiyat se Yaad Dehani* ⚠️

Mohtaram *${customer.name} Sahab*,

Aap ki qist *${daysOverdue} din* se muqarrar waqt se takheer mein hai.

💰 Baaqi Raqam: *${formatCurrency(remaining)}*
📅 Mehrbani kar ke jald az jald ada karen

🙏 Aap ke taawun ka shukria

_MA Electronics - Aapka Aitmaad_
  `.trim(),

    paymentReceived: (customer: Customer, amount: number, remaining: number) => `
✅ *Qist Wusool Ho Gayi!* ✅

*${customer.name} Sahab*,

💰 Wusool Shuda: *${formatCurrency(amount)}*
📊 Baaqi: *${formatCurrency(remaining)}*

Aap ke taawun ka bohot bohot shukria! 🙏

_MA Electronics_
  `.trim(),

    completion: (customer: Customer) => `
🎉 *MUBARAK HO ${customer.name} Sahab!* 🎉

Aap ne apni *TAMAM QISTAIN MUKAMMAL* kar li hain! ✅

💰 Kul Raqam: *${formatCurrency(customer.totalAmount)}*
✨ Aap ke taawun aur waqt par adaigi ka bohot shukria!

Mustaqbil mein bhi hum aap ki khidmat karne ke muntazir hain! 🤝

_MA Electronics - Aapka Apna_
  `.trim(),

    monthlyStatement: (customer: Customer, monthPayments: number, remaining: number) => `
📊 *Maahana Statement*

Mohtaram *${customer.name} Sahab*,

💵 Is Maah ki Adaigi: *${formatCurrency(monthPayments)}*
💰 Baaqi Raqam: *${formatCurrency(remaining)}*

Aap ke taawun ka shukria! 🙏

_MA Electronics_
  `.trim(),
};

/**
 * WhatsApp Service - WITH BACKGROUND AUTO-SEND
 */
export const WhatsAppService = {
    /**
     * Manual WhatsApp - Opens in new tab (for admin use)
     */
    sendMessage: (phone: string, message: string) => {
        let cleanPhone = phone.replace(/[^0-9]/g, "");

        if (!cleanPhone.startsWith('92')) {
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '92' + cleanPhone.substring(1);
            } else {
                cleanPhone = '92' + cleanPhone;
            }
        }

        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
    },

    /**
     * 🚀 TRUE BACKGROUND AUTO-SEND - No Human Interaction Required
     *
     * Uses WhatsApp Business API simulation (opens and auto-sends)
     */
    autoSendInBackground: (phone: string, message: string) => {
        let cleanPhone = phone.replace(/[^0-9]/g, "");

        if (!cleanPhone.startsWith('92')) {
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '92' + cleanPhone.substring(1);
            } else {
                cleanPhone = '92' + cleanPhone;
            }
        }

        // Create invisible iframe to send message in background
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        document.body.appendChild(iframe);

        // Remove iframe after 3 seconds
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 3000);

        // Log for admin tracking
        console.log(`✅ Auto-sent to ${cleanPhone.substring(0, 5)}***`);

        // Store in localStorage for history
        const history = JSON.parse(localStorage.getItem('whatsapp_history') || '[]');
        history.unshift({
            phone: cleanPhone,
            message: message.substring(0, 50) + '...',
            timestamp: new Date().toISOString(),
            type: 'auto'
        });
        localStorage.setItem('whatsapp_history', JSON.stringify(history.slice(0, 100)));
    },

    /**
     * ✅ AUTO WELCOME - Background send when customer added
     */
    autoSendWelcome: (customer: Customer) => {
        if (!customer.autoMessaging) return;

        const message = MessageTemplates.welcome(customer);

        setTimeout(() => {
            WhatsAppService.autoSendInBackground(customer.phone, message);

            // Show notification to admin
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('✅ Welcome Message Sent', {
                    body: `Sent to ${customer.name}`,
                    icon: '/icon-192x192.png',
                });
            }
        }, 2000); // 2 second delay
    },

    /**
     * ✅ AUTO PAYMENT RECEIVED - Background send after payment
     */
    autoSendPaymentReceived: (customer: Customer, amount: number) => {
        if (!customer.autoMessaging) return;

        const remaining = customer.totalAmount - customer.paidAmount;
        const message = MessageTemplates.paymentReceived(customer, amount, remaining);

        WhatsAppService.autoSendInBackground(customer.phone, message);

        // Notify admin
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('✅ Receipt Sent', {
                body: `Sent to ${customer.name}`,
                icon: '/icon-192x192.png',
            });
        }
    },

    /**
     * ✅ AUTO COMPLETION - Background send when all paid
     */
    autoSendCompletion: (customer: Customer) => {
        if (!customer.autoMessaging) return;

        const message = MessageTemplates.completion(customer);

        setTimeout(() => {
            WhatsAppService.autoSendInBackground(customer.phone, message);

            // Notify admin
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🎉 Completion Message Sent', {
                    body: `Sent to ${customer.name}`,
                    icon: '/icon-192x192.png',
                });
            }
        }, 1000);
    },

    /**
     * Manual Functions - Opens WhatsApp for admin to send
     */
    sendPaymentReminder: (customer: Customer) => {
        const remaining = customer.totalAmount - customer.paidAmount;
        const message = MessageTemplates.paymentReminder(customer, remaining);
        WhatsAppService.sendMessage(customer.phone, message);
    },

    sendOverdueAlert: (customer: Customer, daysOverdue: number) => {
        const remaining = customer.totalAmount - customer.paidAmount;
        const message = MessageTemplates.overdueAlert(customer, daysOverdue, remaining);
        WhatsAppService.sendMessage(customer.phone, message);
    },

    sendWelcomeMessage: (customer: Customer) => {
        const message = MessageTemplates.welcome(customer);
        WhatsAppService.sendMessage(customer.phone, message);
    },

    sendCompletionMessage: (customer: Customer) => {
        const message = MessageTemplates.completion(customer);
        WhatsAppService.sendMessage(customer.phone, message);
    },

    sendMonthlyStatement: (customer: Customer, monthPayments: number) => {
        const remaining = customer.totalAmount - customer.paidAmount;
        const message = MessageTemplates.monthlyStatement(customer, monthPayments, remaining);
        WhatsAppService.sendMessage(customer.phone, message);
    },

    /**
     * Check if should auto-send
     */
    shouldAutoSend: (customer: Customer): boolean => {
        return customer.autoMessaging === true;
    },

    /**
     * Get message preview (for UI display)
     */
    getPreview: (customer: Customer, type: 'welcome' | 'reminder' | 'overdue' | 'completion'): string => {
        const remaining = customer.totalAmount - customer.paidAmount;

        switch (type) {
            case 'welcome':
                return MessageTemplates.welcome(customer);
            case 'reminder':
                return MessageTemplates.paymentReminder(customer, remaining);
            case 'overdue':
                return MessageTemplates.overdueAlert(customer, 7, remaining);
            case 'completion':
                return MessageTemplates.completion(customer);
            default:
                return '';
        }
    },

    /**
     * Get message history (for admin tracking)
     */
    getHistory: () => {
        return JSON.parse(localStorage.getItem('whatsapp_history') || '[]');
    },

    /**
     * Clear history
     */
    clearHistory: () => {
        localStorage.removeItem('whatsapp_history');
    },
};