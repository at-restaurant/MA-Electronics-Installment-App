// src/lib/db/migrations.ts - COMPLETE UPDATED VERSION

import { db } from './schema';
import type { Customer, Payment, Profile, InvestmentEntry } from '@/types';

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
 * ✅ NEW: Migrate investment types from RECEIVED to WITHDRAWN
 */
async function migrateInvestmentTypes(): Promise<void> {
    try {
        console.log('🔄 Checking investment type migration...');

        const profiles = await db.profiles.toArray();
        let migratedCount = 0;

        for (const profile of profiles) {
            if (profile.investmentHistory && profile.investmentHistory.length > 0) {
                let needsMigration = false;

                const updatedHistory = profile.investmentHistory.map((entry: any) => {
                    if (entry.type === 'RECEIVED') {
                        needsMigration = true;
                        return {
                            ...entry,
                            type: 'WITHDRAWN'
                        };
                    }
                    return entry;
                });

                if (needsMigration) {
                    await db.profiles.update(profile.id, {
                        investmentHistory: updatedHistory
                    });
                    migratedCount++;
                    console.log(`✅ Migrated investment types for profile: ${profile.name}`);
                }
            }
        }

        if (migratedCount > 0) {
            console.log(`✅ Successfully migrated ${migratedCount} profiles with investment entries`);
        } else {
            console.log('✅ No investment type migration needed');
        }
    } catch (error) {
        console.error('❌ Investment migration failed:', error);
    }
}

/**
 * ✅ NEW: Ensure investmentHistory exists on all profiles
 */
async function ensureInvestmentHistory(): Promise<void> {
    try {
        console.log('🔄 Ensuring investment history exists...');

        const profiles = await db.profiles.toArray();
        let updatedCount = 0;

        for (const profile of profiles) {
            let needsUpdate = false;
            const updates: any = {};

            // Ensure investmentHistory array exists
            if (!profile.investmentHistory) {
                updates.investmentHistory = [];
                needsUpdate = true;
            }

            // Ensure totalInvestment exists
            if (profile.totalInvestment === undefined) {
                // Calculate from history if exists
                if (profile.investmentHistory && profile.investmentHistory.length > 0) {
                    const totalInvested = profile.investmentHistory
                        .filter((e: InvestmentEntry) => e.type === 'INVESTED')
                        .reduce((sum: number, e: InvestmentEntry) => sum + e.amount, 0);

                    const totalWithdrawn = profile.investmentHistory
                        .filter((e: InvestmentEntry) => e.type === 'WITHDRAWN')
                        .reduce((sum: number, e: InvestmentEntry) => sum + e.amount, 0);

                    updates.totalInvestment = totalInvested - totalWithdrawn;
                } else {
                    updates.totalInvestment = 0;
                }
                needsUpdate = true;
            }

            if (needsUpdate) {
                await db.profiles.update(profile.id, updates);
                updatedCount++;
                console.log(`✅ Updated profile: ${profile.name}`);
            }
        }

        if (updatedCount > 0) {
            console.log(`✅ Ensured investment data for ${updatedCount} profiles`);
        }
    } catch (error) {
        console.error('❌ Failed to ensure investment history:', error);
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
        // STEP 2: Validate and fix data
        // ============================================

        const validProfiles = profiles.map(p => ({
            ...p,
            totalInvestment: p.totalInvestment || 0,
            investmentHistory: p.investmentHistory || []
        })).filter(p => p.id && p.name);

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
            // Fix the profile data before saving
            const fixedProfile = {
                ...currentProfile,
                totalInvestment: currentProfile.totalInvestment || 0,
                investmentHistory: currentProfile.investmentHistory || []
            };
            await db.setMeta('currentProfile', fixedProfile);
            console.log('✅ Migrated current profile');
        }

        const notifications = getLocalStorageData('notifications', null);
        if (notifications) {
            await db.setMeta('notifications', notifications);
            console.log('✅ Migrated notifications settings');
        }

        // ============================================
        // STEP 5: Run investment data migrations
        // ============================================

        await migrateInvestmentTypes();
        await ensureInvestmentHistory();

        // ============================================
        // STEP 6: Mark migration as complete
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
            totalInvestment: 0,
            investmentHistory: [],
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
        console.log('🚀 Starting database migrations...');

        // Check if migration is needed from localStorage
        if (needsMigration()) {
            console.log('📥 Migrating from localStorage...');
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
        } else {
            console.log('✅ No localStorage migration needed');
        }

        // Initialize default profile if needed
        await initializeDefaultProfile();

        // ✅ Run investment-specific migrations
        await migrateInvestmentTypes();
        await ensureInvestmentHistory();

        // Cleanup old data if time has passed
        cleanupOldLocalStorage();

        console.log('✅ All migrations completed!');

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