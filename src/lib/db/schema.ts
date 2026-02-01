// src/lib/db/schema. ts - Complete Database Schema (FIXED - Production Ready)

import Dexie, { type Table } from 'dexie';
import type { Customer, Payment, Profile, NotificationSettings, AppSettings, WhatsAppQueue } from '@/types';

export interface Metadata {
    key: string;
    value: any;
    updatedAt: string;
}

export class MADatabase extends Dexie {
    profiles!: Table<Profile>;
    customers!: Table<Customer>;
    payments!: Table<Payment>;
    whatsappQueue!: Table<WhatsAppQueue>;
    metadata!: Table<Metadata>;

    constructor() {
        super('MA-Electronics-App');

        // ✅ UPDATE TO VERSION 3 FOR INVESTMENT TYPE CHANGE
        this.version(3).stores({
            profiles: 'id, createdAt',
            customers: 'id, profileId, [profileId+status]',
            payments: 'id, customerId, date, [customerId+date]',
            whatsappQueue: '++id, customerId, scheduledFor, attempts',
            metadata: 'key, updatedAt',
        }).upgrade(trans => {
            // ✅ MIGRATION: Convert old RECEIVED to WITHDRAWN
            return trans.table('profiles').toCollection().modify(profile => {
                if (profile.investmentHistory) {
                    profile.investmentHistory = profile.investmentHistory.map((entry: any) => {
                        if (entry.type === 'RECEIVED') {
                            entry.type = 'WITHDRAWN';
                        }
                        return entry;
                    });
                }
            });
        });

        // Add hooks for timestamps
        this.customers.hook('creating', (primKey, obj) => {
            if (! obj.createdAt) obj.createdAt = new Date().toISOString();
        });

        this.payments.hook('creating', (primKey, obj) => {
            if (!obj.createdAt) obj.createdAt = new Date().toISOString();
        });

        this.profiles. hook('creating', (primKey, obj) => {
            if (!obj.createdAt) obj.createdAt = new Date().toISOString();
        });
    }


    async getCustomersByProfile(profileId: number): Promise<Customer[]> {
        return this.customers. where('profileId').equals(profileId).toArray();
    }

    async getActiveCustomersByProfile(profileId:  number): Promise<Customer[]> {
        return this.customers
            .where('[profileId+status]')
            .equals([profileId, 'active'])
            .toArray();
    }

    async searchCustomers(profileId: number, query: string): Promise<Customer[]> {
        const lowerQuery = query.toLowerCase();
        return this.customers
            .where('profileId')
            .equals(profileId)
            .toArray()
            .then(customers =>
                customers.filter(c =>
                    c.name.toLowerCase().includes(lowerQuery) ||
                    c.phone.includes(query) ||
                    c.cnic.includes(query) ||
                    (c.category && c.category.toLowerCase().includes(lowerQuery))
                )
            );
    }

    // ============================================
    // PAYMENT QUERIES
    // ============================================

    async getPaymentsByCustomer(customerId: number): Promise<Payment[]> {
        return this.payments
            .where('customerId')
            .equals(customerId)
            .reverse()
            .sortBy('date');
    }

    async getPaymentsByDateRange(startDate: string, endDate: string): Promise<Payment[]> {
        return this.payments. where('date').between(startDate, endDate, true, true).toArray();
    }

    async getPaymentsByProfile(profileId: number): Promise<Payment[]> {
        const customers = await this.getCustomersByProfile(profileId);
        const customerIds = customers.map((c) => c.id);

        return this.payments
            . where('customerId')
            .anyOf(customerIds)
            .toArray();
    }

    // ============================================
    // STATISTICS QUERIES
    // ============================================

    async getDailyCustomers(profileId: number): Promise<Customer[]> {
        return this. customers
            .where('[profileId+status]')
            .equals([profileId, 'active'])
            .filter((c) => c.frequency === 'daily')
            .toArray();
    }

    async getOverdueCustomers(profileId: number, minDays: number = 0): Promise<Customer[]> {
        const cutoff = new Date();
        cutoff.setDate(cutoff. getDate() - minDays);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        return this.customers
            . where('[profileId+status]')
            .equals([profileId, 'active'])
            .filter((c) => c.lastPayment < cutoffStr)
            .toArray();
    }

    async calculateStatistics(profileId: number): Promise<any> {
        const customers = await this.getCustomersByProfile(profileId);
        const payments = await this.getPaymentsByProfile(profileId);

        const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
        const totalExpected = customers.reduce((sum, c) => sum + c.totalAmount, 0);
        const activeCustomers = customers.filter((c) => c.status === 'active').length;
        const completedCustomers = customers.filter((c) => c.status === 'completed').length;

        const cutoff = new Date();
        cutoff.setDate(cutoff. getDate() - 7);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const overdueCustomers = customers.filter(
            (c) => c.status === 'active' && c. lastPayment < cutoffStr
        ).length;

        return {
            totalReceived,
            totalExpected,
            totalCustomers:  customers.length,
            activeCustomers,
            completedCustomers,
            overdueCustomers,
            collectionRate: totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0,
        };
    }

    // ============================================
    // WHATSAPP QUEUE MANAGEMENT
    // ============================================

    async addToWhatsAppQueue(
        item: Omit<WhatsAppQueue, 'id' | 'attempts' | 'createdAt'>
    ): Promise<number> {
        return this.whatsappQueue.add({
            ...item,
            attempts: 0,
            createdAt: new Date().toISOString(),
        } as WhatsAppQueue);
    }

    async getWhatsAppQueue(): Promise<WhatsAppQueue[]> {
        return this.whatsappQueue.where('attempts').below(3).toArray();
    }

    async getWhatsAppQueuePending(): Promise<WhatsAppQueue[]> {
        return this. whatsappQueue.where('attempts').below(3).toArray();
    }

    async removeFromWhatsAppQueue(id:  number): Promise<void> {
        await this.whatsappQueue.delete(id);
    }

    async incrementQueueAttempts(id:  number): Promise<void> {
        const item = await this.whatsappQueue.get(id);
        if (item) {
            await this.whatsappQueue.update(id, { attempts: item. attempts + 1 });
        }
    }

    // ============================================
    // METADATA MANAGEMENT
    // ============================================

    async getMeta<T>(key: string, defaultValue?: T): Promise<T | undefined> {
        const meta = await this.metadata.get(key);
        return meta?.value ??  defaultValue;
    }

    async setMeta<T>(key: string, value: T): Promise<void> {
        await this.metadata.put({
            key,
            value,
            updatedAt: new Date().toISOString(),
        });
    }

    async removeMeta(key: string): Promise<void> {
        await this.metadata.delete(key);
    }

    // ============================================
    // STORAGE UTILITIES
    // ============================================

    async getStorageSize(): Promise<number> {
        const profiles = await this.profiles.toArray();
        const customers = await this.customers.toArray();
        const payments = await this.payments. toArray();
        const metadata = await this.metadata.toArray();

        const combined = { profiles, customers, payments, metadata };
        const json = JSON.stringify(combined);
        return new Blob([json]).size;
    }

    async clearAll(): Promise<void> {
        await this.profiles.clear();
        await this.customers.clear();
        await this.payments.clear();
        await this.whatsappQueue.clear();
        await this.metadata.clear();
    }

    async exportAll(): Promise<any> {
        const profiles = await this.profiles.toArray();
        const customers = await this.customers.toArray();
        const payments = await this.payments. toArray();
        const metadata = await this.metadata.toArray();

        return { profiles, customers, payments, metadata };
    }

    async importAll(data: any): Promise<boolean> {
        try {
            await this.transaction('rw', this.profiles, this.customers, this.payments, this.metadata, async () => {
                if (data.profiles?. length) await this.profiles.bulkAdd(data.profiles);
                if (data.customers?.length) await this.customers.bulkAdd(data.customers);
                if (data.payments?.length) await this.payments.bulkAdd(data. payments);
                if (data.metadata?.length) await this.metadata.bulkAdd(data.metadata);
            });

            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }
}

// Create singleton instance
export const db = new MADatabase();