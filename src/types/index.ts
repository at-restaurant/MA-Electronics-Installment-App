// src/types/index.ts - Updated Types with Multiple Images

export interface Profile {
    id: number;
    name: string;
    description: string;
    gradient: string;
    createdAt: string;
}

export interface Guarantor {
    id: number;
    name: string;
    phone: string;
    cnic: string;
    photos: string[]; // Multiple photos
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
    cnicPhotos: string[]; // Multiple CNIC images
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
}