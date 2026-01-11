// src/lib/db/migrations.ts - Migrate from localStorage to IndexedDB

import { db } from './schema';
import type { Customer, Payment, Profile } from '@/types';

// ============================================
// MIGRATION FUNCTIONS
// ============================================

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
    if (typeof window === 'undefined') return false;

    const migrated = localStorage.getItem('migrated_to_indexeddb');
    const hasOldData = localStorage.getItem('customers') || localStorage.getItem('profiles');

    return !migrated && !!hasOldData;
}

/**
 * Get data from localStorage safely
 */
function getLocalStorageData<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;
        return JSON.parse(item);
    } catch (error) {
        console.error(`Error reading ${key} from localStorage:`, error);
        return defaultValue;
    }
}

/**
 * Migrate all data from localStorage to IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<{
    success: boolean;
    migrated: {
        profiles: number;
        customers: number;
        payments: number;
    };
    errors: string[];
}> {
    const errors: string[] = [];
    let profileCount = 0;
    let customerCount = 0;
    let paymentCount = 0;

    try {
        console.log('🔄 Starting migration from localStorage to IndexedDB...');

        // ============================================
        // STEP 1: Load data from localStorage
        // ============================================

        const profiles = getLocalStorageData<Profile[]>('profiles', []);
        const customers = getLocalStorageData<Customer[]>('customers', []);
        const payments = getLocalStorageData<Payment[]>('payments', []);

        console.log('📦 Loaded from localStorage:', {
            profiles: profiles.length,
            customers: customers.length,
            payments: payments.length,
        });

        // ============================================
        // STEP 2: Validate data
        // ============================================

        const validProfiles = profiles.filter(p => p.id && p.name);
        const validCustomers = customers.filter(c => c.id && c.name);
        const validPayments = payments.filter(p => p.id && p.customerId && p.amount);

        if (validProfiles.length < profiles.length) {
            errors.push(`${profiles.length - validProfiles.length} invalid profiles skipped`);
        }
        if (validCustomers.length < customers.length) {
            errors.push(`${customers.length - validCustomers.length} invalid customers skipped`);
        }
        if (validPayments.length < payments.length) {
            errors.push(`${payments.length - validPayments.length} invalid payments skipped`);
        }

        // ============================================
        // STEP 3: Migrate to IndexedDB
        // ============================================

        await db.transaction('rw', db.profiles, db.customers, db.payments, async () => {
            // Migrate profiles
            if (validProfiles.length > 0) {
                await db.profiles.bulkAdd(validProfiles);
                profileCount = validProfiles.length;
                console.log(`✅ Migrated ${profileCount} profiles`);
            }

            // Migrate customers
            if (validCustomers.length > 0) {
                await db.customers.bulkAdd(validCustomers);
                customerCount = validCustomers.length;
                console.log(`✅ Migrated ${customerCount} customers`);
            }

            // Migrate payments
            if (validPayments.length > 0) {
                await db.payments.bulkAdd(validPayments);
                paymentCount = validPayments.length;
                console.log(`✅ Migrated ${paymentCount} payments`);
            }
        });

        // ============================================
        // STEP 4: Migrate app settings
        // ============================================

        const appSettings = getLocalStorageData('app_settings', null);
        if (appSettings) {
            await db.setMeta('app_settings', appSettings);
            console.log('✅ Migrated app settings');
        }

        const currentProfile = getLocalStorageData<Profile | null>('currentProfile', null);
        if (currentProfile) {
            await db.setMeta('currentProfile', currentProfile);
            console.log('✅ Migrated current profile');
        }

        const notifications = getLocalStorageData('notifications', null);
        if (notifications) {
            await db.setMeta('notifications', notifications);
            console.log('✅ Migrated notifications settings');
        }

        // ============================================
        // STEP 5: Mark migration as complete
        // ============================================

        localStorage.setItem('migrated_to_indexeddb', 'true');
        localStorage.setItem('migration_date', new Date().toISOString());

        // Keep localStorage data for 7 days as backup
        const cleanupDate = new Date();
        cleanupDate.setDate(cleanupDate.getDate() + 7);
        localStorage.setItem('cleanup_old_data_after', cleanupDate.toISOString());

        console.log('✅ Migration completed successfully!');

        return {
            success: true,
            migrated: {
                profiles: profileCount,
                customers: customerCount,
                payments: paymentCount,
            },
            errors,
        };
    } catch (error) {
        console.error('❌ Migration failed:', error);
        errors.push(error instanceof Error ? error.message : 'Unknown error');

        return {
            success: false,
            migrated: {
                profiles: profileCount,
                customers: customerCount,
                payments: paymentCount,
            },
            errors,
        };
    }
}

/**
 * Cleanup old localStorage data after migration
 */
export function cleanupOldLocalStorage(): void {
    if (typeof window === 'undefined') return;

    const cleanupAfter = localStorage.getItem('cleanup_old_data_after');
    if (!cleanupAfter) return;

    const cleanupDate = new Date(cleanupAfter);
    const now = new Date();

    if (now > cleanupDate) {
        console.log('🧹 Cleaning up old localStorage data...');

        // Remove old data
        localStorage.removeItem('profiles');
        localStorage.removeItem('customers');
        localStorage.removeItem('payments');
        localStorage.removeItem('cleanup_old_data_after');

        console.log('✅ Cleanup complete');
    }
}

/**
 * Initialize default profile if none exists
 */
export async function initializeDefaultProfile(): Promise<void> {
    const profileCount = await db.profiles.count();

    if (profileCount === 0) {
        console.log('📝 Creating default profile...');

        const defaultProfile: Profile = {
            id: Date.now(),
            name: 'My Business',
            description: 'Default business account',
            gradient: 'from-blue-500 to-purple-500',
            createdAt: new Date().toISOString(),
            totalInvestment: 0,  // ✅ NEW
            investmentHistory: [],  // ✅ NEW
        };

        await db.profiles.add(defaultProfile);
        await db.setMeta('currentProfile', defaultProfile);

        console.log('✅ Default profile created');
    }
}

/**
 * Run all migrations on app startup
 */
export async function runMigrations(): Promise<void> {
    try {
        // Check if migration is needed
        if (needsMigration()) {
            const result = await migrateFromLocalStorage();

            if (result.success) {
                console.log('✅ Migration successful:', result.migrated);

                if (result.errors.length > 0) {
                    console.warn('⚠️ Migration warnings:', result.errors);
                }
            } else {
                console.error('❌ Migration failed:', result.errors);
                alert('Data migration failed! Please contact support.');
            }
        }

        // Initialize default profile if needed
        await initializeDefaultProfile();

        // Cleanup old data if time has passed
        cleanupOldLocalStorage();

    } catch (error) {
        console.error('❌ Migration error:', error);
    }
}

/**
 * Force re-migration (for development/testing)
 */
export async function forceMigration(): Promise<void> {
    localStorage.removeItem('migrated_to_indexeddb');
    await db.clearAll();
    await runMigrations();
}