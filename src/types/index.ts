export interface Profile {
    id: number;
    name: string;
    description: string;
    gradient: string;
    createdAt: string;
}

// ✅ NEW: Guarantor/Reference Type
export interface Guarantor {
    id: number;
    name: string;
    phone: string;
    cnic: string;
    photo: string | null;
    relation?: string; // e.g., "Brother", "Friend"
}

export interface Customer {
    id: number;
    profileId: number;
    name: string;
    phone: string;
    address: string;
    cnic: string;
    photo: string | null;
    cnicPhoto: string | null;  // ✅ NEW: CNIC image
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

    autoMessaging: boolean;     // ✅ NEW: Auto WhatsApp toggle
    guarantors: Guarantor[];    // ✅ NEW: References
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
    byCategory?: Record<string, {
        customers: number;
        totalAmount: number;
        paidAmount: number;
    }>;
}