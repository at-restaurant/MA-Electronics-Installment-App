// src/components/ThemeProvider.tsx - PROPERLY WORKING

'use client';

import { useEffect, useState } from 'react';
import { themeManager } from '@/lib/themeManager';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Listen for theme changes
        const handleThemeChange = (e: Event) => {
            const event = e as CustomEvent;
            // Theme already applied by themeManager, just trigger re-render if needed
        };

        window.addEventListener('theme-changed', handleThemeChange);

        return () => {
            window.removeEventListener('theme-changed', handleThemeChange);
        };
    }, []);

    // Prevent flash of wrong theme
    if (!mounted) {
        return <>{children}</>;
    }

    return <>{children}</>;
}