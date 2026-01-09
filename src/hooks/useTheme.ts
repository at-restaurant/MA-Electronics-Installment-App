// src/hooks/useTheme.ts - React hook for theme management

import { useState, useEffect } from 'react';
import { themeManager, type Theme } from '@/lib/themeManager';

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => themeManager.getTheme());
    const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() =>
        themeManager.getCurrentEffectiveTheme()
    );

    useEffect(() => {
        const handleThemeChange = (e: Event) => {
            const customEvent = e as CustomEvent;
            setEffectiveTheme(customEvent.detail.theme);
        };

        window.addEventListener('theme-changed', handleThemeChange);

        return () => {
            window.removeEventListener('theme-changed', handleThemeChange);
        };
    }, []);

    const setThemeValue = (newTheme: Theme) => {
        themeManager.setTheme(newTheme);
        setTheme(newTheme);
    };

    const toggleTheme = () => {
        themeManager.toggleTheme();
        setTheme(themeManager.getTheme());
    };

    return {
        theme,
        effectiveTheme,
        setTheme: setThemeValue,
        toggleTheme,
        isDark: effectiveTheme === 'dark',
    };
}