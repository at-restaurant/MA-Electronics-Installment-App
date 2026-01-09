export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Installment {
  id: string;
  customerId: string;
  productName: string;
  totalAmount: number;
  installmentCount: number;
  paymentType: 'weekly' | 'bi-weekly' | 'monthly';
  installmentAmount: number;
  startDate: string;
  dueDate: string;
  paidAmount: number;
  status: 'active' | 'completed' | 'overdue' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  installmentId: string;
  customerId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'card' | 'transfer';
  status: 'completed' | 'pending';
  createdAt: string;
}

export interface NotificationSettings {
  enableNotifications: boolean;
  notificationTiming: 'before' | 'on' | 'after'; // before, on, or after due date
  reminderDays: number;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  notificationSettings: NotificationSettings;
  offlineSyncPending: boolean;
}