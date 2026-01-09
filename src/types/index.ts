// src/types/index.ts - Fixed and aligned with actual usage

export interface Profile {
    id: number;
    name: string;
    description: string;
    gradient: string;
    createdAt: string;
}

export interface Customer {
    id: number;
    profileId: number;
    name: string;
    phone: string;
    address: string;
    cnic: string;
    photo: string | null;
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
}

export interface Payment {
    id: number;
    customerId: number;
    amount: number;
    date: string;
    createdAt: string;
}

export interface NotificationSettings {
    enableNotifications: boolean;
    paymentReminders: boolean;
    overdueAlerts: boolean;
    dailySummary: boolean;
}

export interface AppSettings {
    theme: 'light' | 'dark';
    notifications: NotificationSettings;
    language: 'en' | 'ur';
    currency: 'PKR';
}

// Installment interface for future use
export interface Installment {
    id: string;
    customerId: number;
    productName: string;
    totalAmount: number;
    installmentCount: number;
    paymentType: 'daily' | 'weekly' | 'monthly';
    installmentAmount: number;
    startDate: string;
    dueDate: string;
    paidAmount: number;
    status: 'active' | 'completed' | 'overdue' | 'pending';
    createdAt: string;
    updatedAt: string;
}

// Statistics interface
export interface Statistics {
    totalReceived: number;
    totalExpected: number;
    totalCustomers: number;
    activeCustomers: number;
    completedCustomers: number;
    overdueCustomers: number;
    collectionRate: number;
}

// Export data structure
export interface ExportData {
    profiles: Profile[];
    customers: Customer[];
    payments: Payment[];
    exportDate: string;
    appVersion: string;
}