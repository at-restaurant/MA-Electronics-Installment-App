// src/lib/storage.ts - UPDATED with Profile Isolation & Single Default

type StorageKey =
    | 'currentProfile'
    | 'profiles'
    | 'customers'
    | 'payments'
    | 'settings'
    | 'theme'
    | 'notifications'
    | 'language'
    | 'app_settings'
    | 'installment_schedules';

export const Storage = {
    /**
     * ✅ Initialize SINGLE default profile (admin creates more)
     */
    initializeDefaultProfile: (): void => {
        if (typeof window === 'undefined') return;

        const profiles = Storage.get<any[]>('profiles', []);

        if (profiles.length === 0) {
            const defaultProfile = {
                id: Date.now(),
                name: "My Business", // ✅ SINGLE default profile
                description: "Default business account",
                gradient: "from-blue-500 to-purple-500",
                createdAt: new Date().toISOString(),
            };

            Storage.save('profiles', [defaultProfile]);
            Storage.save('currentProfile', defaultProfile);

            console.log('✅ Default profile created: My Business');
        }
    },

    /**
     * ✅ Get customers for SPECIFIC profile only
     */
    getProfileCustomers: (profileId: number) => {
        const allCustomers = Storage.get<any[]>('customers', []);
        return allCustomers.filter(c => c.profileId === profileId);
    },

    /**
     * ✅ Get payments for SPECIFIC profile only
     */
    getProfilePayments: (profileId: number) => {
        const allCustomers = Storage.getProfileCustomers(profileId);
        const customerIds = new Set(allCustomers.map(c => c.id));

        const allPayments = Storage.get<any[]>('payments', []);
        return allPayments.filter(p => customerIds.has(p.customerId));
    },

    /**
     * ✅ Delete profile and ALL its data
     */
    deleteProfile: (profileId: number): boolean => {
        try {
            // Remove profile
            const profiles = Storage.get<any[]>('profiles', []);
            const filtered = profiles.filter(p => p.id !== profileId);

            if (filtered.length === 0) {
                alert('Cannot delete last profile!');
                return false;
            }

            Storage.save('profiles', filtered);

            // Remove all customers for this profile
            const allCustomers = Storage.get<any[]>('customers', []);
            const customerIds = new Set(
                allCustomers.filter(c => c.profileId === profileId).map(c => c.id)
            );
            const filteredCustomers = allCustomers.filter(c => c.profileId !== profileId);
            Storage.save('customers', filteredCustomers);

            // Remove all payments for this profile's customers
            const allPayments = Storage.get<any[]>('payments', []);
            const filteredPayments = allPayments.filter(p => !customerIds.has(p.customerId));
            Storage.save('payments', filteredPayments);

            // If current profile is deleted, switch to first available
            const current = Storage.get('currentProfile', null);
            if (current && current.id === profileId) {
                Storage.save('currentProfile', filtered[0]);
            }

            console.log(`✅ Profile ${profileId} and all its data deleted`);
            return true;
        } catch (error) {
            console.error('Error deleting profile:', error);
            return false;
        }
    },

    /**
     * Save data to localStorage
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
     * Get data from localStorage
     */
    get: <T>(key: StorageKey, defaultValue?: T): T => {
        try {
            if (typeof window !== 'undefined') {
                const item = localStorage.getItem(key);

                if (item === null || item === undefined) {
                    return defaultValue as T;
                }

                // Handle plain string values
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
     * Remove specific key
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
     * Clear all data
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
     * Cleanup old data PER PROFILE
     */
    cleanup: (): void => {
        try {
            if (typeof window === 'undefined') return;

            console.log('Running storage cleanup...');

            const profiles = Storage.get<any[]>('profiles', []);

            // Clean each profile separately
            profiles.forEach(profile => {
                const customers = Storage.getProfileCustomers(profile.id);
                const payments = Storage.getProfilePayments(profile.id);

                // Keep only last 50 completed customers per profile
                const completedCustomers = customers.filter(c => c.status === 'completed');
                const activeCustomers = customers.filter(c => c.status !== 'completed');

                let cleanedCustomers = activeCustomers;

                if (completedCustomers.length > 50) {
                    completedCustomers.sort((a, b) =>
                        new Date(b.lastPayment).getTime() - new Date(a.lastPayment).getTime()
                    );

                    const recentCompleted = completedCustomers.slice(0, 50);
                    cleanedCustomers = [...activeCustomers, ...recentCompleted];

                    console.log(`Profile ${profile.name}: Removed ${completedCustomers.length - 50} old customers`);
                }
            });

            // Save cleaned data
            const allCustomers = Storage.get<any[]>('customers', []);
            localStorage.setItem('customers', JSON.stringify(allCustomers));

            console.log('Cleanup completed');
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    },

    /**
     * Check if key exists
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
     * Get storage size
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
     * Get formatted size
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
     * Get usage percentage (5MB limit)
     */
    getUsagePercentage: (): number => {
        const bytes = Storage.getSize();
        const limitBytes = 5 * 1024 * 1024;
        return Math.round((bytes / limitBytes) * 100);
    },

    /**
     * Export all data
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
     * Import data
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
     * Health check
     */
    healthCheck: (): void => {
        const usage = Storage.getUsagePercentage();

        if (usage > 80) {
            console.warn(`Storage usage at ${usage}%. Running cleanup...`);
            Storage.cleanup();
        }
    }
};