// src/types/index.ts

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
    address?: string;
    cnic?: string;
    photo?: string | null;
    document?: string | null;
    totalAmount: number;
    paidAmount: number;
    installmentAmount: number;
    frequency: 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate?: string;
    lastPayment: string;
    notes?: string;
    status: 'active' | 'completed' | 'overdue';
    createdAt: string;
}

export interface Payment {
    id: number;
    customerId: number;
    amount: number;
    date: string;
    createdAt: string;
    notes?: string;
}

export interface NotificationSettings {
    paymentReminders: boolean;
    overdueAlerts: boolean;
    dailySummary: boolean;
}

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    currency: string;
    language: 'en' | 'ur';
    notifications: NotificationSettings;
}

export interface DashboardStats {
    totalReceived: number;
    totalExpected: number;
    totalCustomers: number;
    activeCustomers: number;
    completedCustomers: number;
    overdueCustomers: number;
    collectionRate: number;
    pendingAmount: number;
}

export interface PendingCustomer extends Customer {
    daysOverdue: number;
    remaining: number;
    riskLevel: 'low' | 'medium' | 'high';
}