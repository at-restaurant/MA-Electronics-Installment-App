// src/types/index.ts - UPDATED WITH INVESTMENT TYPES

export interface Profile {
    id: number;
    name: string;
    description: string;
    gradient: string;
    createdAt: string;
    totalInvestment: number;
    investmentHistory: InvestmentEntry[];
}

export interface InvestmentEntry {
    id: number;
    amount: number;
    date: string;
    note?: string;
    type: 'INVESTED' | 'RECEIVED'; // ✅ ADDED
    customerId?: number; // ✅ ADDED
}

export interface Guarantor {
    id: number;
    name: string;
    phone: string;
    cnic: string;
    photos: string[];
    photo?: string | null;
    relation?: string;
}

export interface Customer {
    id: number;
    profileId: number;
    name: string;
    phone: string;
    address: string;
    cnic: string;
    photo: string | null;
    cnicPhotos: string[];
    cnicPhoto?: string | null;
    document: string | null;
    totalAmount: number;
    installmentAmount: number;
    frequency: 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate: string;
    notes: string;
    paidAmount: number;
    lastPayment: string;
    status: 'active' | 'completed';
    createdAt: string;
    autoMessaging: boolean;
    guarantors: Guarantor[];
    category?: string;
    tags?: string[];
    autoSchedule?: boolean;
}

export interface Payment {
    id: number;
    customerId: number;
    amount: number;
    date: string;
    createdAt: string;
    scheduleId?: number;
    investmentAmount?: number;
    paymentSource?: 'online' | 'offline';
    isAdvanced?: boolean;
}

export interface NotificationSettings {
    enableNotifications: boolean;
    paymentReminders: boolean;
    overdueAlerts: boolean;
    dailySummary: boolean;
    reminderTime: string;
    soundEnabled: boolean;
}

export interface AppSettings {
    theme: 'light' | 'dark' | 'auto';
    notifications: NotificationSettings;
    language: 'en' | 'ur';
    currency: 'PKR';
    defaultCategory?: string;
    categories?: string[];
}

export interface Statistics {
    totalReceived: number;
    totalExpected: number;
    totalCustomers: number;
    activeCustomers: number;
    completedCustomers: number;
    overdueCustomers: number;
    collectionRate: number;
    totalInvestment?: number;
    onlinePayments?: number;
    offlinePayments?: number;
}

export interface WhatsAppQueue {
    id?: number;
    phone: string;
    message: string;
    customerId: number;
    type: 'welcome' | 'payment' | 'reminder' | 'overdue' | 'completion';
    attempts: number;
    scheduledFor?: string;
    createdAt?: string;
}