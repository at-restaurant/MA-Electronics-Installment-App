'use client';

import { useEffect } from 'react';
import { themeManager } from '@/lib/themeManager';

export function ThemeInitializer() {
    useEffect(() => {
        // Initialize theme manager on mount
        themeManager.initialize();

        // Listen for storage changes from other tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'theme' && e.newValue) {
                const newTheme = e.newValue.replace(/^"|"$/g, '');
                if (newTheme === 'light' || newTheme === 'dark' || newTheme === 'auto') {
                    themeManager.setTheme(newTheme as 'light' | 'dark' | 'auto');
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return null;
}