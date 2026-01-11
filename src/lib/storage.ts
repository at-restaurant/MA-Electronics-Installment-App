// src/lib/storage.ts - FIXED with sync wrapper for client components

import { db } from './db';
import type { Profile } from '@/types';

type StorageKey =
    | 'currentProfile'
    | 'app_settings'
    | 'notifications'
    | 'language'
    | 'theme'
    | 'customers'
    | 'payments'
    | 'profiles';

// ============================================
// STORAGE SERVICE (IndexedDB + localStorage)
// ============================================

export const Storage = {
    /**
     * Save data - Use metadata table for settings, localStorage as fallback
     */
    save: async <T>(key: StorageKey, data: T): Promise<boolean> => {
        try {
            // Try IndexedDB first
            await db.setMeta(key, data);

            // Also save to localStorage as backup
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, JSON.stringify(data));
            }

            return true;
        } catch (error) {
            console.error(`Storage save error for ${key}:`, error);

            // Fallback to localStorage only
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                    return true;
                } catch {
                    return false;
                }
            }

            return false;
        }
    },

    /**
     * ✅ ASYNC Get data - For Server Components & async contexts
     */
    get: async <T>(key: StorageKey, defaultValue?: T): Promise<T> => {
        try {
            // Try IndexedDB first
            const value = await db.getMeta<T>(key);
            if (value !== undefined) return value;

            // Fallback to localStorage
            if (typeof window !== 'undefined') {
                const item = localStorage.getItem(key);
                if (item) {
                    return JSON.parse(item);
                }
            }

            return defaultValue as T;
        } catch (error) {
            console.error(`Storage get error for ${key}:`, error);
            return defaultValue as T;
        }
    },

    /**
     * ✅ SYNC Get data - For Client Components (immediate access)
     * Uses localStorage directly - no await needed
     */
    getSync: <T>(key: StorageKey, defaultValue: T): T => {
        if (typeof window === 'undefined') return defaultValue;

        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    /**
     * Remove data
     */
    remove: async (key: StorageKey): Promise<boolean> => {
        try {
            await db.metadata.delete(key);

            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }

            return true;
        } catch (error) {
            console.error(`Storage remove error for ${key}:`, error);
            return false;
        }
    },

    /**
     * Clear all storage
     */
    clear: async (): Promise<boolean> => {
        try {
            await db.clearAll();

            if (typeof window !== 'undefined') {
                localStorage.clear();
            }

            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },

    /**
     * Get storage size
     */
    getSize: async (): Promise<number> => {
        return db.getStorageSize();
    },

    /**
     * Get formatted size
     */
    getSizeFormatted: async (): Promise<string> => {
        const bytes = await Storage.getSize();
        return formatBytes(bytes);
    },

    /**
     * Get usage percentage (estimated 50MB limit for IndexedDB)
     */
    getUsagePercentage: async (): Promise<number> => {
        const bytes = await Storage.getSize();
        const limitBytes = 50 * 1024 * 1024; // 50MB
        return Math.min(Math.round((bytes / limitBytes) * 100), 100);
    },

    /**
     * Export all data
     */
    exportData: async (): Promise<string> => {
        const data = await db.exportAll();
        return JSON.stringify(data, null, 2);
    },

    /**
     * Import data
     */
    importData: async (jsonString: string): Promise<boolean> => {
        try {
            const data = JSON.parse(jsonString);
            return await db.importAll(data);
        } catch (error) {
            console.error('Import data error:', error);
            return false;
        }
    },

    /**
     * Cleanup old data
     */
    cleanup: async (): Promise<number> => {
        return await db.cleanup();
    },

    /**
     * Health check
     */
    healthCheck: async (): Promise<void> => {
        const usage = await Storage.getUsagePercentage();

        if (usage > 80) {
            console.warn(`⚠️ Storage usage at ${usage}%. Running cleanup...`);
            const cleaned = await Storage.cleanup();
            console.log(`✅ Cleaned ${cleaned} old records`);
        }
    },

    /**
     * Initialize default profile (for backward compatibility)
     */
    initializeDefaultProfile: async (): Promise<void> => {
        const profileCount = await db.profiles.count();

        if (profileCount === 0) {
            const defaultProfile: Profile = {
                id: Date.now(),
                name: 'Mera Business',
                description: 'Default business account',
                gradient: 'from-blue-500 to-purple-500',
                createdAt: new Date().toISOString(),
            };

            await db.profiles.add(defaultProfile);
            await Storage.save('currentProfile', defaultProfile);
        }
    },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}