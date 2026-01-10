// src/lib/storage.ts - FIXED with all storage keys

type StorageKey =
    | 'currentProfile'
    | 'profiles'
    | 'customers'
    | 'payments'
    | 'settings'
    | 'theme'
    | 'notifications'
    | 'language'
    | 'app_settings'              // ✅ ADDED
    | 'installment_schedules';    // ✅ ADDED

export const Storage = {
    /**
     * Save data to localStorage with proper JSON stringification
     */
    save: <T>(key: StorageKey, data: T): boolean => {
        try {
            if (typeof window !== 'undefined') {
                const serialized = JSON.stringify(data);

                try {
                    localStorage.setItem(key, serialized);
                } catch (quotaError) {
                    console.warn('Storage full, running cleanup...');
                    Storage.cleanup();

                    try {
                        localStorage.setItem(key, serialized);
                    } catch (retryError) {
                        console.error('Storage still full after cleanup');
                        alert('Storage full! Please export your data and clear old records.');
                        return false;
                    }
                }

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
     * Get data from localStorage with safe JSON parsing
     */
    get: <T>(key: StorageKey, defaultValue?: T): T => {
        try {
            if (typeof window !== 'undefined') {
                const item = localStorage.getItem(key);

                if (item === null || item === undefined) {
                    return defaultValue as T;
                }

                // Handle plain string values (like theme)
                if (key === 'theme' && typeof item === 'string' && !item.startsWith('{') && !item.startsWith('[')) {
                    return item as T;
                }

                try {
                    return JSON.parse(item) as T;
                } catch (parseError) {
                    console.warn(`Failed to parse JSON for key "${key}", returning raw value`);
                    return item as T;
                }
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
     * Cleanup old data to free space
     */
    cleanup: (): void => {
        try {
            if (typeof window === 'undefined') return;

            console.log('Running storage cleanup...');

            const customers = Storage.get<any[]>('customers', []);
            const payments = Storage.get<any[]>('payments', []);

            // Keep only last 50 completed customers
            const completedCustomers = customers.filter(c => c.status === 'completed');
            const activeCustomers = customers.filter(c => c.status !== 'completed');

            let cleanedCustomers = activeCustomers;

            if (completedCustomers.length > 50) {
                completedCustomers.sort((a, b) =>
                    new Date(b.lastPayment).getTime() - new Date(a.lastPayment).getTime()
                );

                const recentCompleted = completedCustomers.slice(0, 50);
                cleanedCustomers = [...activeCustomers, ...recentCompleted];

                console.log(`Removed ${completedCustomers.length - 50} old completed customers`);
            } else {
                cleanedCustomers = customers;
            }

            const keepCustomerIds = new Set(cleanedCustomers.map(c => c.id));
            const cleanedPayments = payments.filter(p => keepCustomerIds.has(p.customerId));

            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const finalPayments = cleanedPayments.filter(p => {
                const customer = cleanedCustomers.find(c => c.id === p.customerId);
                if (customer && customer.status === 'completed') {
                    const paymentDate = new Date(p.date);
                    return paymentDate > oneYearAgo;
                }
                return true;
            });

            localStorage.setItem('customers', JSON.stringify(cleanedCustomers));
            localStorage.setItem('payments', JSON.stringify(finalPayments));

            console.log('Cleanup completed successfully');
            console.log(`Customers: ${customers.length} -> ${cleanedCustomers.length}`);
            console.log(`Payments: ${payments.length} -> ${finalPayments.length}`);

        } catch (error) {
            console.error('Cleanup error:', error);
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
     * Get storage size in human-readable format
     */
    getSizeFormatted: (): string => {
        const bytes = Storage.getSize();
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Get storage usage percentage (assuming 5MB limit)
     */
    getUsagePercentage: (): number => {
        const bytes = Storage.getSize();
        const limitBytes = 5 * 1024 * 1024; // 5MB
        return Math.round((bytes / limitBytes) * 100);
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
                        if (typeof data[key] === 'object') {
                            localStorage.setItem(key, JSON.stringify(data[key]));
                        } else {
                            localStorage.setItem(key, data[key]);
                        }
                    }
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Import data error:', error);
            return false;
        }
    },

    /**
     * Check storage health and run cleanup if needed
     */
    healthCheck: (): void => {
        const usage = Storage.getUsagePercentage();

        if (usage > 80) {
            console.warn(`Storage usage at ${usage}%. Running cleanup...`);
            Storage.cleanup();
        }
    }
};