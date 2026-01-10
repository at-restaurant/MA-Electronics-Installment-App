// src/lib/translations.ts - Complete Translation System

export type Language = 'en' | 'ur';

export const translations = {
    en: {
        // Navigation
        customers: 'Customers',
        daily: 'Daily',
        pending: 'Pending',
        dashboard: 'Dashboard',
        settings: 'Settings',

        // Customer Page
        addCustomer: 'Add New Customer',
        searchCustomers: 'Search customers...',
        all: 'All',
        active: 'Active',
        completed: 'Completed',
        noCustomers: 'No customers yet',
        totalCustomers: 'total',
        activeCustomers: 'active',
        completedCustomers: 'completed',

        // Customer Details
        customerDetails: 'Customer Details',
        edit: 'Edit',
        delete: 'Delete',
        addPayment: 'Add Payment',
        sendReminder: 'Send Reminder',
        progress: 'Payment Progress',
        total: 'Total',
        paid: 'Paid',
        remaining: 'Remaining',
        installmentDetails: 'Installment Details',
        installmentAmount: 'Installment Amount',
        frequency: 'Frequency',
        lastPayment: 'Last Payment',
        daysSince: 'Days Since',
        paymentHistory: 'Payment History',
        noPayments: 'No payments yet',

        // Add Customer Form
        fullName: 'Full Name',
        phoneNumber: 'Phone Number',
        category: 'Category',
        address: 'Address',
        cnicNumber: 'CNIC Number',
        totalAmount: 'Total Amount',
        paymentFrequency: 'Payment Frequency',
        startDate: 'Start Date',
        notes: 'Notes',
        saveCustomer: 'Save Customer',
        cancel: 'Cancel',
        required: 'required',

        // Frequencies
        freqDaily: 'Daily',
        freqWeekly: 'Weekly',
        freqMonthly: 'Monthly',

        // Daily Collection
        dailyCollection: 'Daily Collection',
        collectedToday: 'Collected Today',
        customersPaid: 'Customers Paid',

        // Pending Payments
        pendingPayments: 'Pending Payments',
        overdue: 'Overdue',
        warning: 'Warning',
        totalPending: 'Total Pending Amount',
        viewDetails: 'View Details',
        sendAlert: 'Send Alert',

        // Settings
        profileManagement: 'Profile Management',
        manageProfiles: 'Manage Profiles',
        appearance: 'Appearance',
        light: 'Light',
        dark: 'Dark',
        auto: 'Auto',
        language: 'Language',
        customerCategories: 'Customer Categories',
        addCategory: 'Add',
        dataManagement: 'Data Management',
        exportData: 'Export Data',
        importData: 'Import Data',
        clearAllData: 'Clear All Data',

        // Common
        search: 'Search',
        save: 'Save',
        loading: 'Loading...',
        confirm: 'Confirm',
        yes: 'Yes',
        no: 'No',
    },

    ur: {
        // Navigation
        customers: 'گاہک',
        daily: 'روزانہ',
        pending: 'باقی',
        dashboard: 'ڈیش بورڈ',
        settings: 'ترتیبات',

        // Customer Page
        addCustomer: 'نیا گاہک شامل کریں',
        searchCustomers: 'گاہک تلاش کریں...',
        all: 'تمام',
        active: 'فعال',
        completed: 'مکمل',
        noCustomers: 'ابھی کوئی گاہک نہیں',
        totalCustomers: 'کل',
        activeCustomers: 'فعال',
        completedCustomers: 'مکمل',

        // Customer Details
        customerDetails: 'گاہک کی تفصیلات',
        edit: 'تبدیل کریں',
        delete: 'حذف کریں',
        addPayment: 'ادائیگی شامل کریں',
        sendReminder: 'یاد دہانی بھیجیں',
        progress: 'ادائیگی کی پیش رفت',
        total: 'کل',
        paid: 'ادا شدہ',
        remaining: 'باقی',
        installmentDetails: 'قسط کی تفصیلات',
        installmentAmount: 'قسط کی رقم',
        frequency: 'تعدد',
        lastPayment: 'آخری ادائیگی',
        daysSince: 'دن گزرے',
        paymentHistory: 'ادائیگی کی تاریخ',
        noPayments: 'ابھی کوئی ادائیگی نہیں',

        // Add Customer Form
        fullName: 'پورا نام',
        phoneNumber: 'فون نمبر',
        category: 'زمرہ',
        address: 'پتہ',
        cnicNumber: 'شناختی کارڈ نمبر',
        totalAmount: 'کل رقم',
        paymentFrequency: 'ادائیگی کا دورانیہ',
        startDate: 'شروع کرنے کی تاریخ',
        notes: 'نوٹس',
        saveCustomer: 'گاہک محفوظ کریں',
        cancel: 'منسوخ کریں',
        required: 'ضروری',

        // Frequencies
        freqDaily: 'روزانہ',
        freqWeekly: 'ہفتہ وار',
        freqMonthly: 'ماہانہ',

        // Daily Collection
        dailyCollection: 'روزانہ وصولی',
        collectedToday: 'آج وصول شدہ',
        customersPaid: 'گاہکوں نے ادا کیا',

        // Pending Payments
        pendingPayments: 'باقی ادائیگیاں',
        overdue: 'مقررہ وقت سے زیادہ',
        warning: 'انتباہ',
        totalPending: 'کل باقی رقم',
        viewDetails: 'تفصیلات دیکھیں',
        sendAlert: 'الرٹ بھیجیں',

        // Settings
        profileManagement: 'پروفائل کا انتظام',
        manageProfiles: 'پروفائلز کا انتظام کریں',
        appearance: 'ظاہری شکل',
        light: 'روشن',
        dark: 'تاریک',
        auto: 'خودکار',
        language: 'زبان',
        customerCategories: 'گاہک کے زمرے',
        addCategory: 'شامل کریں',
        dataManagement: 'ڈیٹا کا انتظام',
        exportData: 'ڈیٹا برآمد کریں',
        importData: 'ڈیٹا درآمد کریں',
        clearAllData: 'تمام ڈیٹا صاف کریں',

        // Common
        search: 'تلاش کریں',
        save: 'محفوظ کریں',
        loading: 'لوڈ ہو رہا ہے...',
        confirm: 'تصدیق کریں',
        yes: 'ہاں',
        no: 'نہیں',
    }
};

// Translation hook
export function useTranslation(lang: Language = 'en') {
    return (key: keyof typeof translations.en): string => {
        return translations[lang][key] || translations.en[key] || key;
    };
}

// Get translation function (non-hook)
export function t(key: keyof typeof translations.en, lang: Language = 'en'): string {
    return translations[lang][key] || translations.en[key] || key;
}