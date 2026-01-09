import { formatCurrency, formatDate } from "./utils";

interface Customer {
  name: string;
  phone: string;
  totalAmount: number;
  paidAmount: number;
  installmentAmount: number;
  startDate: string;
}

export const WhatsAppService = {
  sendPaymentReminder: (customer: Customer) => {
    const remaining = customer.totalAmount - customer.paidAmount;
    const message = `
سلام ${customer.name}! 🙏

یہ آپ کی ادائیگی کی یاد دہانی ہے:

💰 باقی رقم: ${formatCurrency(remaining)}
📅 اگلی قسط: ${formatCurrency(customer.installmentAmount)}
📞 کوئی سوال؟ ہم سے رابطہ کریں!

شکریہ! 
MA Installment Management
    `.trim();

    const phone = customer.phone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  },

  sendOverdueAlert: (customer: Customer, daysOverdue: number) => {
    const remaining = customer.totalAmount - customer.paidAmount;
    const message = `
⚠️ ادائیگی کی اہم یاد دہانی

محترم ${customer.name},

آپ کی ادائیگی ${daysOverdue} دن سے التوا میں ہے۔

💰 باقی رقم: ${formatCurrency(remaining)}
📅 برائے مہربانی جلد از جلد ادا کریں

شکریہ
MA Installment Management
    `.trim();

    const phone = customer.phone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  },

  sendCompletionMessage: (customer: Customer) => {
    const message = `
🎉 مبارک ہو ${customer.name}!

آپ نے اپنی تمام قسطیں مکمل کر لی ہیں! ✅

💰 کل رقم: ${formatCurrency(customer.totalAmount)}
✨ آپ کے تعاون کا شکریہ!

MA Installment Management
    `.trim();

    const phone = customer.phone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  },

  sendWelcomeMessage: (customer: Customer) => {
    const message = `
خوش آمدید ${customer.name}! 👋

آپ کی قسط کی تفصیلات:

💰 کل رقم: ${formatCurrency(customer.totalAmount)}
📅 روزانہ قسط: ${formatCurrency(customer.installmentAmount)}
📆 شروعات: ${formatDate(customer.startDate)}

ہم آپ کی خدمت کے لیے حاضر ہیں!

MA Installment Management
    `.trim();

    const phone = customer.phone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  },
};
