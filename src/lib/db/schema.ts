// src/lib/db/schema.ts - IndexedDB Schema Definition
import Dexie, { Table } from 'dexie';
import type { Customer, Payment, Profile } from '@/types';

// ============================================
// DATABASE CLASS
// ============================================

export class MADatabase extends Dexie {
    // Tables
    profiles!: Table<Profile, number>;
    customers!: Table<Customer, number>;
    payments!: Table<Payment, number>;

    // Metadata table for app state
    metadata!: Table<{
        key: string;
        value: any;
        updatedAt: string;
    }, string>;

    constructor() {
        super('MAInstallmentDB');

        // Schema version 1
        this.version(1).stores({
            profiles: 'id, name, createdAt',
            customers: 'id, profileId, status, name, phone, lastPayment, [profileId+status]',
            payments: 'id, customerId, date, [customerId+date]',
            metadata: 'key, updatedAt',
        });

        // Hooks - Auto-update timestamps
        this.customers.hook('creating', (primKey, obj) => {
            if (!obj.createdAt) {
                obj.createdAt = new Date().toISOString();
            }
        });

        this.payments.hook('creating', (primKey, obj) => {
            if (!obj.createdAt) {
                obj.createdAt = new Date().toISOString();
            }
        });

        this.profiles.hook('creating', (primKey, obj) => {
            if (!obj.createdAt) {
                obj.createdAt = new Date().toISOString();
            }
        });
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Get customers by profile ID
     */
    async getCustomersByProfile(profileId: number): Promise<Customer[]> {
        return this.customers
            .where('profileId')
            .equals(profileId)
            .toArray();
    }

    /**
     * Get active customers by profile ID
     */
    async getActiveCustomersByProfile(profileId: number): Promise<Customer[]> {
        return this.customers
            .where('[profileId+status]')
            .equals([profileId, 'active'])
            .toArray();
    }

    /**
     * Get payments for a customer
     */
    async getPaymentsByCustomer(customerId: number): Promise<Payment[]> {
        return this.payments
            .where('customerId')
            .equals(customerId)
            .reverse()
            .sortBy('date');
    }

    /**
     * Get payments for a date range
     */
    async getPaymentsByDateRange(startDate: string, endDate: string): Promise<Payment[]> {
        return this.payments
            .where('date')
            .between(startDate, endDate, true, true)
            .toArray();
    }

    /**
     * Get daily collection customers
     */
    async getDailyCustomers(profileId: number): Promise<Customer[]> {
        return this.customers
            .where('[profileId+status]')
            .equals([profileId, 'active'])
            .filter(c => c.frequency === 'daily')
            .toArray();
    }

    /**
     * Get overdue customers
     */
    async getOverdueCustomers(profileId: number, days: number = 7): Promise<Customer[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        return this.customers
            .where('[profileId+status]')
            .equals([profileId, 'active'])
            .filter(c => c.lastPayment < cutoffStr)
            .toArray();
    }

    /**
     * Search customers by name or phone
     */
    async searchCustomers(profileId: number, query: string): Promise<Customer[]> {
        const lowerQuery = query.toLowerCase();

        return this.customers
            .where('profileId')
            .equals(profileId)
            .filter(c =>
                c.name.toLowerCase().includes(lowerQuery) ||
                c.phone.includes(query)
            )
            .toArray();
    }

    /**
     * Get database size estimate
     */
    async getStorageSize(): Promise<number> {
        const tables = await Promise.all([
            this.profiles.count(),
            this.customers.count(),
            this.payments.count(),
        ]);

        // Rough estimate: avg 2KB per customer, 0.5KB per payment
        return (tables[1] * 2 + tables[2] * 0.5) * 1024;
    }

    /**
     * Clear all data (for reset)
     */
    async clearAll(): Promise<void> {
        await this.transaction('rw', this.profiles, this.customers, this.payments, this.metadata, async () => {
            await this.profiles.clear();
            await this.customers.clear();
            await this.payments.clear();
            await this.metadata.clear();
        });
    }

    /**
     * Export all data
     */
    async exportAll() {
        const [profiles, customers, payments, metadata] = await Promise.all([
            this.profiles.toArray(),
            this.customers.toArray(),
            this.payments.toArray(),
            this.metadata.toArray(),
        ]);

        return {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            profiles,
            customers,
            payments,
            metadata: metadata.reduce((acc, m) => ({ ...acc, [m.key]: m.value }), {}),
        };
    }

    /**
     * Import data (with validation)
     */
    async importAll(data: any): Promise<boolean> {
        try {
            // Validate structure
            if (!data.version || !data.profiles || !data.customers || !data.payments) {
                throw new Error('Invalid backup format');
            }

            // Clear existing data
            await this.clearAll();

            // Import in transaction
            await this.transaction('rw', this.profiles, this.customers, this.payments, this.metadata, async () => {
                await this.profiles.bulkAdd(data.profiles);
                await this.customers.bulkAdd(data.customers);
                await this.payments.bulkAdd(data.payments);

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

    /**
     * Cleanup old data
     */
    async cleanup(): Promise<number> {
        // Keep only last 100 completed customers
        const completed = await this.customers
            .where('status')
            .equals('completed')
            .reverse()
            .sortBy('lastPayment');

        if (completed.length > 100) {
            const toDelete = completed.slice(100);
            const customerIds = toDelete.map(c => c.id);

            await this.transaction('rw', this.customers, this.payments, async () => {
                // Delete old customers
                await this.customers.bulkDelete(customerIds);

                // Delete their payments
                await this.payments
                    .where('customerId')
                    .anyOf(customerIds)
                    .delete();
            });

            return toDelete.length;
        }

        return 0;
    }

    /**
     * Get metadata value
     */
    async getMeta<T>(key: string, defaultValue?: T): Promise<T | undefined> {
        const item = await this.metadata.get(key);
        return item ? item.value : defaultValue;
    }

    /**
     * Set metadata value
     */
    async setMeta(key: string, value: any): Promise<void> {
        await this.metadata.put({
            key,
            value,
            updatedAt: new Date().toISOString(),
        });
    }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const db = new MADatabase();

// Enable for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).db = db;
    console.log('💾 IndexedDB initialized:', db.name);
}