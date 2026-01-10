// src/components/ThemeProvider.tsx - Ensures theme applies to all pages

'use client';

import { useEffect } from 'react';
import { themeManager } from '@/lib/themeManager';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Initialize theme on mount
        const savedTheme = themeManager.getTheme();
        themeManager.setTheme(savedTheme);

        // Listen for theme changes
        const handleThemeChange = (e: Event) => {
            const customEvent = e as CustomEvent;
            const isDark = customEvent.detail.theme === 'dark';

            if (isDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        window.addEventListener('theme-changed', handleThemeChange);

        return () => {
            window.removeEventListener('theme-changed', handleThemeChange);
        };
    }, []);

    return <>{children}</>;
}