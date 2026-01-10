// src/types/index.ts - COMPLETE with all required types

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

    // Optional new fields
    autoMessaging?: boolean;
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
}

export interface NotificationSettings {
    enableNotifications: boolean;
    paymentReminders: boolean;
    overdueAlerts: boolean;
    dailySummary: boolean;
    reminderTime: string;        // e.g., "09:00"
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

export interface InstallmentSchedule {
    id: number;
    customerId: number;
    installmentNumber: number;
    dueDate: string;
    amount: number;
    status: 'pending' | 'paid' | 'overdue';
    paidDate?: string;
    createdAt: string;
}

export interface Statistics {
    totalReceived: number;
    totalExpected: number;
    totalCustomers: number;
    activeCustomers: number;
    completedCustomers: number;
    overdueCustomers: number;
    collectionRate: number;
    byCategory?: Record<string, {
        customers: number;
        totalAmount: number;
        paidAmount: number;
    }>;
}

export interface ExportData {
    profiles: Profile[];
    customers: Customer[];
    payments: Payment[];
    schedules?: InstallmentSchedule[];
    settings?: AppSettings;
    exportDate: string;
    appVersion: string;
}

export interface FilterState {
    search: string;
    status: 'all' | 'active' | 'completed' | 'overdue';
    category: string;
    frequency: 'all' | 'daily' | 'weekly' | 'monthly';
    tags: string[];
    dateRange?: {
        start: string;
        end: string;
    };
}

// Installment interface (for future use)
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