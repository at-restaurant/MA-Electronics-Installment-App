export const Storage = {
    save: (key: string, data: any): void => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, JSON.stringify(data));
            }
        } catch (error) {
            console.error('Storage save error:', error);
        }
    },

    get: <T>(key: string, defaultValue: T): T => {
        try {
            if (typeof window !== 'undefined') {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            }
            return defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },

    remove: (key: string): void => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }
        } catch (error) {
            console.error('Storage remove error:', error);
        }
    },

    clear: (): void => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.clear();
            }
        } catch (error) {
            console.error('Storage clear error:', error);
        }
    }
};