// src/lib/storage.ts

type StorageKey =
    | 'currentProfile'
    | 'profiles'
    | 'customers'
    | 'payments'
    | 'settings'
    | 'theme'
    | 'notifications';

export const Storage = {
    /**
     * Save data to localStorage with error handling
     */
    save: <T>(key: StorageKey, data: T): boolean => {
        try {
            if (typeof window !== 'undefined') {
                const serialized = JSON.stringify(data);
                localStorage.setItem(key, serialized);

                // Dispatch custom event for listeners
                window.dispatchEvent(new CustomEvent('storage-update', {
                    detail: { key, data }
                }));

                return true;
            }
            return false;
        } catch (error) {
            console.error(`Storage save error for key "${key}":`, error);
            return false;
        }
    },

    /**
     * Get data from localStorage with type safety
     */
    get: <T>(key: StorageKey, defaultValue?: T): T => {
        try {
            if (typeof window !== 'undefined') {
                const item = localStorage.getItem(key);
                if (item === null) {
                    return defaultValue as T;
                }
                return JSON.parse(item) as T;
            }
            return defaultValue as T;
        } catch (error) {
            console.error(`Storage get error for key "${key}":`, error);
            return defaultValue as T;
        }
    },

    /**
     * Remove specific key from localStorage
     */
    remove: (key: StorageKey): boolean => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);

                window.dispatchEvent(new CustomEvent('storage-update', {
                    detail: { key, data: null }
                }));

                return true;
            }
            return false;
        } catch (error) {
            console.error(`Storage remove error for key "${key}":`, error);
            return false;
        }
    },

    /**
     * Clear all localStorage data
     */
    clear: (): boolean => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.clear();

                window.dispatchEvent(new CustomEvent('storage-clear'));

                return true;
            }
            return false;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },

    /**
     * Check if a key exists
     */
    has: (key: StorageKey): boolean => {
        try {
            if (typeof window !== 'undefined') {
                return localStorage.getItem(key) !== null;
            }
            return false;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get all keys
     */
    keys: (): string[] => {
        try {
            if (typeof window !== 'undefined') {
                return Object.keys(localStorage);
            }
            return [];
        } catch (error) {
            return [];
        }
    },

    /**
     * Get storage size in bytes
     */
    getSize: (): number => {
        try {
            if (typeof window !== 'undefined') {
                let size = 0;
                for (const key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        size += localStorage[key].length + key.length;
                    }
                }
                return size;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    },

    /**
     * Export all data as JSON
     */
    exportData: (): string => {
        try {
            if (typeof window !== 'undefined') {
                const data: Record<string, any> = {};
                for (const key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        try {
                            data[key] = JSON.parse(localStorage[key]);
                        } catch {
                            data[key] = localStorage[key];
                        }
                    }
                }
                return JSON.stringify(data, null, 2);
            }
            return '{}';
        } catch (error) {
            console.error('Export data error:', error);
            return '{}';
        }
    },

    /**
     * Import data from JSON
     */
    importData: (jsonString: string): boolean => {
        try {
            if (typeof window !== 'undefined') {
                const data = JSON.parse(jsonString);
                for (const key in data) {
                    if (data.hasOwnProperty(key)) {
                        localStorage.setItem(key, JSON.stringify(data[key]));
                    }
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Import data error:', error);
            return false;
        }
    }
};