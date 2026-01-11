// src/lib/db/schema.ts - Enhanced IndexedDB Schema
import Dexie, { Table } from 'dexie';
import type { Customer, Payment, Profile } from '@/types';

export interface WhatsAppQueue {
    id?: number;
    phone: string;
    message: string;
    customerId: number;
    type: 'welcome' | 'payment' | 'reminder' | 'overdue' | 'completion';
    attempts: number;
    createdAt: string;
    scheduledFor?: string;
}

export class MADatabase extends Dexie {
    profiles!: Table<Profile, number>;
    customers!: Table<Customer, number>;
    payments!: Table<Payment, number>;
    whatsappQueue!: Table<WhatsAppQueue, number>;
    metadata!: Table<{ key: string; value: any; updatedAt: string }, string>;

    constructor() {
        super('MAInstallmentDB');

        // Version 2 - Added WhatsApp queue & better indexes
        this.version(2).stores({
            profiles: 'id, name, createdAt',
            customers: 'id, profileId, status, [profileId+status], [status+lastPayment], [profileId+frequency]',
            payments: 'id, customerId, date, [customerId+date]',
            whatsappQueue: '++id, customerId, scheduledFor, attempts',
            metadata: 'key, updatedAt',
        }).upgrade(async tx => {
            // Migration from v1 to v2
            console.log('Upgrading to v2: Adding WhatsApp queue');
        });

        this.customers.hook('creating', (primKey, obj) => {
            if (!obj.createdAt) obj.createdAt = new Date().toISOString();
        });

        this.payments.hook('creating', (primKey, obj) => {
            if (!obj.createdAt) obj.createdAt = new Date().toISOString();
        });

        this.profiles.hook('creating', (primKey, obj) => {
            if (!obj.createdAt) obj.createdAt = new Date().toISOString();
        });
    }

    // Query helpers
    async getCustomersByProfile(profileId: number): Promise<Customer[]> {
        return this.customers.where('profileId').equals(profileId).toArray();
    }

    async getActiveCustomersByProfile(profileId: number): Promise<Customer[]> {
        return this.customers.where('[profileId+status]').equals([profileId, 'active']).toArray();
    }

    async getPaymentsByCustomer(customerId: number): Promise<Payment[]> {
        return this.payments.where('customerId').equals(customerId).reverse().sortBy('date');
    }

    async getPaymentsByDateRange(startDate: string, endDate: string): Promise<Payment[]> {
        return this.payments.where('date').between(startDate, endDate, true, true).toArray();
    }

    async getDailyCustomers(profileId: number): Promise<Customer[]> {
        return this.customers
            .where('[profileId+status]')
            .equals([profileId, 'active'])
            .filter(c => c.frequency === 'daily')
            .toArray();
    }

    async getOverdueCustomers(profileId: number, days: number = 7): Promise<Customer[]> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        return this.customers
            .where('[profileId+status]')
            .equals([profileId, 'active'])
            .filter(c => c.lastPayment < cutoffStr)
            .toArray();
    }

    async searchCustomers(profileId: number, query: string): Promise<Customer[]> {
        const lowerQuery = query.toLowerCase();
        return this.customers
            .where('profileId')
            .equals(profileId)
            .filter(c => c.name.toLowerCase().includes(lowerQuery) || c.phone.includes(query))
            .toArray();
    }

    // WhatsApp queue management
    async addToWhatsAppQueue(item: Omit<WhatsAppQueue, 'id' | 'attempts' | 'createdAt'>): Promise<number> {
        return this.whatsappQueue.add({
            ...item,
            attempts: 0,
            createdAt: new Date().toISOString(),
        });
    }

    async getWhatsAppQueue(): Promise<WhatsAppQueue[]> {
        return this.whatsappQueue.where('attempts').below(3).toArray();
    }

    async removeFromWhatsAppQueue(id: number): Promise<void> {
        await this.whatsappQueue.delete(id);
    }

    async incrementQueueAttempts(id: number): Promise<void> {
        const item = await this.whatsappQueue.get(id);
        if (item) {
            await this.whatsappQueue.update(id, { attempts: item.attempts + 1 });
        }
    }

    // Storage size estimation
    async getStorageSize(): Promise<number> {
        const [customers, payments] = await Promise.all([
            this.customers.toArray(),
            this.payments.toArray(),
        ]);

        // Calculate actual size
        const customersSize = new Blob([JSON.stringify(customers)]).size;
        const paymentsSize = new Blob([JSON.stringify(payments)]).size;

        return customersSize + paymentsSize;
    }

    // Cleanup
    async clearAll(): Promise<void> {
        await this.transaction('rw', [this.profiles, this.customers, this.payments, this.whatsappQueue, this.metadata], async () => {
            await this.profiles.clear();
            await this.customers.clear();
            await this.payments.clear();
            await this.whatsappQueue.clear();
            await this.metadata.clear();
        });
    }

    // Export/Import
    async exportAll() {
        const [profiles, customers, payments, metadata, queue] = await Promise.all([
            this.profiles.toArray(),
            this.customers.toArray(),
            this.payments.toArray(),
            this.metadata.toArray(),
            this.whatsappQueue.toArray(),
        ]);

        return {
            version: '2.0.0',
            exportDate: new Date().toISOString(),
            profiles,
            customers,
            payments,
            whatsappQueue: queue,
            metadata: metadata.reduce((acc, m) => ({ ...acc, [m.key]: m.value }), {}),
        };
    }

    async importAll(data: any): Promise<boolean> {
        try {
            if (!data.version || !data.profiles || !data.customers || !data.payments) {
                throw new Error('Invalid backup format');
            }

            await this.clearAll();

            await this.transaction('rw', this.profiles, this.customers, this.payments, this.whatsappQueue, this.metadata, async () => {
                await this.profiles.bulkAdd(data.profiles);
                await this.customers.bulkAdd(data.customers);
                await this.payments.bulkAdd(data.payments);

                if (data.whatsappQueue) {
                    await this.whatsappQueue.bulkAdd(data.whatsappQueue);
                }

                if (data.metadata) {
                    const metadataEntries = Object.entries(data.metadata).map(([key, value]) => ({
                        key,
                        value,
                        updatedAt: new Date().toISOString(),
                    }));
                    await this.metadata.bulkAdd(metadataEntries);
                }
            });

            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    async cleanup(): Promise<number> {
        const completed = await this.customers.where('status').equals('completed').reverse().sortBy('lastPayment');

        if (completed.length > 100) {
            const toDelete = completed.slice(100);
            const customerIds = toDelete.map(c => c.id);

            await this.transaction('rw', this.customers, this.payments, async () => {
                await this.customers.bulkDelete(customerIds);
                await this.payments.where('customerId').anyOf(customerIds).delete();
            });

            return toDelete.length;
        }

        return 0;
    }

    async getMeta<T>(key: string, defaultValue?: T): Promise<T | undefined> {
        const item = await this.metadata.get(key);
        return item ? item.value : defaultValue;
    }

    async setMeta(key: string, value: any): Promise<void> {
        await this.metadata.put({
            key,
            value,
            updatedAt: new Date().toISOString(),
        });
    }
}

export const db = new MADatabase();

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).db = db;
    console.log('💾 IndexedDB v2 initialized:', db.name);
}