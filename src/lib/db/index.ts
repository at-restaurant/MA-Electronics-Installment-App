// src/lib/db/index.ts - Database Exports & Utilities

export { db, MADatabase } from './schema';

// Re-export types for convenience
export type { Customer, Payment, Profile } from '@/types';

// ============================================
// DATABASE UTILITIES
// ============================================

/**
 * Check if IndexedDB is supported
 */
export function isIndexedDBSupported(): boolean {
    if (typeof window === 'undefined') return false;

    try {
        return 'indexedDB' in window && window.indexedDB !== null;
    } catch {
        return false;
    }
}

/**
 * Get database version
 */
export async function getDatabaseVersion(): Promise<number> {
    if (!isIndexedDBSupported()) return 0;

    try {
        const { db } = await import('./schema');
        return db.verno;
    } catch {
        return 0;
    }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
    healthy: boolean;
    size: number;
    counts: {
        profiles: number;
        customers: number;
        payments: number;
    };
}> {
    try {
        const { db } = await import('./schema');

        const [profileCount, customerCount, paymentCount, size] = await Promise.all([
            db.profiles.count(),
            db.customers.count(),
            db.payments.count(),
            db.getStorageSize(),
        ]);

        return {
            healthy: true,
            size,
            counts: {
                profiles: profileCount,
                customers: customerCount,
                payments: paymentCount,
            },
        };
    } catch (error) {
        console.error('Database health check failed:', error);
        return {
            healthy: false,
            size: 0,
            counts: { profiles: 0, customers: 0, payments: 0 },
        };
    }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Initialize database on app load
 */
export async function initDatabase(): Promise<boolean> {
    if (!isIndexedDBSupported()) {
        console.error('IndexedDB not supported');
        return false;
    }

    try {
        const { db } = await import('./schema');

        // Open database connection
        await db.open();

        console.log('✅ Database initialized');
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        return false;
    }
}