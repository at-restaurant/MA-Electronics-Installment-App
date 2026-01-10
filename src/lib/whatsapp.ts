// src/lib/whatsapp.ts
import { formatCurrency, formatDate } from "./utils";

interface Customer {
    name: string;
    phone: string;
    totalAmount: number;
    paidAmount: number;
    installmentAmount: number;
    startDate: string;
}

/**
 * WhatsApp Message Templates
 * All messages centralized here for easy editing
 */
const MessageTemplates = {
    paymentReminder: (customer: Customer, remaining: number) => `
سلام ${customer.name}! 🙏

یہ آپ کی ادائیگی کی یاد دہانی ہے:

💰 باقی رقم: ${formatCurrency(remaining)}
📅 اگلی قسط: ${formatCurrency(customer.installmentAmount)}
📞 کوئی سوال؟ ہم سے رابطہ کریں!

شکریہ! 
MA Installment Management
  `.trim(),

    overdueAlert: (customer: Customer, daysOverdue: number, remaining: number) => `
⚠️ ادائیگی کی اہم یاد دہانی

محترم ${customer.name},

آپ کی ادائیگی ${daysOverdue} دن سے التوا میں ہے۔

💰 باقی رقم: ${formatCurrency(remaining)}
📅 برائے مہربانی جلد از جلد ادا کریں

شکریہ
MA Installment Management
  `.trim(),

    completion: (customer: Customer) => `
🎉 مبارک ہو ${customer.name}!

آپ نے اپنی تمام قسطیں مکمل کر لی ہیں! ✅

💰 کل رقم: ${formatCurrency(customer.totalAmount)}
✨ آپ کے تعاون کا شکریہ!

MA Installment Management
  `.trim(),

    welcome: (customer: Customer) => `
خوش آمدید ${customer.name}! 👋

آپ کی قسط کی تفصیلات:

💰 کل رقم: ${formatCurrency(customer.totalAmount)}
📅 روزانہ قسط: ${formatCurrency(customer.installmentAmount)}
📆 شروعات: ${formatDate(customer.startDate)}

ہم آپ کی خدمت کے لیے حاضر ہیں!

MA Installment Management
  `.trim(),

    paymentReceived: (customer: Customer, amount: number, remaining: number) => `
✅ ادائیگی موصول ہوئی!

محترم ${customer.name},

💰 وصول شدہ: ${formatCurrency(amount)}
📊 باقی: ${formatCurrency(remaining)}

شکریہ!
MA Installment Management
  `.trim(),

    monthlyStatement: (customer: Customer, monthPayments: number, remaining: number) => `
📊 ماہانہ سٹیٹمنٹ

محترم ${customer.name},

💵 اس ماہ کی ادائیگی: ${formatCurrency(monthPayments)}
💰 باقی رقم: ${formatCurrency(remaining)}

شکریہ!
MA Installment Management
  `.trim(),
};

/**
 * WhatsApp Service
 * Handles all WhatsApp communications
 */
export const WhatsAppService = {
    /**
     * Open WhatsApp with message
     */
    sendMessage: (phone: string, message: string) => {
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
    },

    /**
     * Send payment reminder
     */
    sendPaymentReminder: (customer: Customer) => {
        const remaining = customer.totalAmount - customer.paidAmount;
        const message = MessageTemplates.paymentReminder(customer, remaining);
        WhatsAppService.sendMessage(customer.phone, message);
    },

    /**
     * Send overdue alert
     */
    sendOverdueAlert: (customer: Customer, daysOverdue: number) => {
        const remaining = customer.totalAmount - customer.paidAmount;
        const message = MessageTemplates.overdueAlert(customer, daysOverdue, remaining);
        WhatsAppService.sendMessage(customer.phone, message);
    },

    /**
     * Send completion congratulations
     */
    sendCompletionMessage: (customer: Customer) => {
        const message = MessageTemplates.completion(customer);
        WhatsAppService.sendMessage(customer.phone, message);
    },

    /**
     * Send welcome message
     */
    sendWelcomeMessage: (customer: Customer) => {
        const message = MessageTemplates.welcome(customer);
        WhatsAppService.sendMessage(customer.phone, message);
    },

    /**
     * Send payment received confirmation
     */
    sendPaymentReceivedMessage: (customer: Customer, amount: number) => {
        const remaining = customer.totalAmount - customer.paidAmount;
        const message = MessageTemplates.paymentReceived(customer, amount, remaining);
        WhatsAppService.sendMessage(customer.phone, message);
    },

    /**
     * Send monthly statement
     */
    sendMonthlyStatement: (customer: Customer, monthPayments: number) => {
        const remaining = customer.totalAmount - customer.paidAmount;
        const message = MessageTemplates.monthlyStatement(customer, monthPayments, remaining);
        WhatsAppService.sendMessage(customer.phone, message);
    },
};