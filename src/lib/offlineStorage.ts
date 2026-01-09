import localforage from 'localforage';
import type { Customer, Installment, Payment } from '@/types';

const STORAGE_KEYS = {
  CUSTOMERS:  'customers',
  INSTALLMENTS: 'installments',
  PAYMENTS: 'payments',
  SYNC_QUEUE: 'sync_queue',
  LAST_SYNC: 'last_sync',
};

interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  table: 'customers' | 'installments' | 'payments';
  data: any;
  timestamp: number;
}

export const offlineStorage = {
  // Customers
  async saveCustomers(customers: Customer[]) {
    await localforage.setItem(STORAGE_KEYS.CUSTOMERS, customers);
  },

  async getCustomers(): Promise<Customer[]> {
    const data = await localforage.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS);
    return data || [];
  },

  async addCustomer(customer: Customer) {
    const customers = await this.getCustomers();
    customers.push(customer);
    await this.saveCustomers(customers);
    await this.addToSyncQueue('create', 'customers', customer);
  },

  async updateCustomer(id: string, updates: Partial<Customer>) {
    const customers = await this.getCustomers();
    const index = customers.findIndex((c) => c.id === id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...updates };
      await this. saveCustomers(customers);
      await this.addToSyncQueue('update', 'customers', customers[index]);
    }
  },

  async deleteCustomer(id: string) {
    const customers = await this.getCustomers();
    const filtered = customers.filter((c) => c.id !== id);
    await this.saveCustomers(filtered);
    await this.addToSyncQueue('delete', 'customers', { id });
  },

  // Installments
  async saveInstallments(installments: Installment[]) {
    await localforage.setItem(STORAGE_KEYS.INSTALLMENTS, installments);
  },

  async getInstallments(): Promise<Installment[]> {
    const data = await localforage. getItem<Installment[]>(STORAGE_KEYS.INSTALLMENTS);
    return data || [];
  },

  async addInstallment(installment: Installment) {
    const installments = await this.getInstallments();
    installments.push(installment);
    await this.saveInstallments(installments);
    await this.addToSyncQueue('create', 'installments', installment);
  },

  async updateInstallment(id: string, updates: Partial<Installment>) {
    const installments = await this.getInstallments();
    const index = installments.findIndex((i) => i.id === id);
    if (index !== -1) {
      installments[index] = { ...installments[index], ...updates };
      await this.saveInstallments(installments);
      await this.addToSyncQueue('update', 'installments', installments[index]);
    }
  },

  // Payments
  async savePayments(payments: Payment[]) {
    await localforage.setItem(STORAGE_KEYS. PAYMENTS, payments);
  },

  async getPayments(): Promise<Payment[]> {
    const data = await localforage.getItem<Payment[]>(STORAGE_KEYS.PAYMENTS);
    return data || [];
  },

  async addPayment(payment: Payment) {
    const payments = await this.getPayments();
    payments.push(payment);
    await this.savePayments(payments);
    await this.addToSyncQueue('create', 'payments', payment);
  },

  // Sync Queue Management
  async addToSyncQueue(action: 'create' | 'update' | 'delete', table: string, data: any) {
    const queue = await localforage.getItem<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE);
    const items = queue || [];
    items.push({
      id: `${Date.now()}_${Math.random()}`,
      action,
      table:  table as any,
      data,
      timestamp: Date.now(),
    });
    await localforage.setItem(STORAGE_KEYS. SYNC_QUEUE, items);
  },

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const data = await localforage.getItem<SyncQueueItem[]>(STORAGE_KEYS. SYNC_QUEUE);
    return data || [];
  },

  async clearSyncQueue() {
    await localforage.setItem(STORAGE_KEYS. SYNC_QUEUE, []);
  },

  async removeSyncQueueItem(id: string) {
    const queue = await this. getSyncQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await localforage.setItem(STORAGE_KEYS.SYNC_QUEUE, filtered);
  },

  async setLastSync(timestamp: number) {
    await localforage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
  },

  async getLastSync(): Promise<number> {
    const data = await localforage.getItem<number>(STORAGE_KEYS. LAST_SYNC);
    return data || 0;
  },

  async clearAllData() {
    await localforage.clear();
  },
};