// src/lib/themeManager.ts - Complete theme management with proper initialization

import { Storage } from './storage';

export type Theme = 'light' | 'dark' | 'auto';

export class ThemeManager {
    private static instance: ThemeManager;
    private currentTheme: Theme = 'light';
    private mediaQuery: MediaQueryList | null = null;
    private initialized: boolean = false;

    private constructor() {
        // Don't initialize in constructor - wait for explicit init
    }

    static getInstance(): ThemeManager {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }

    initialize() {
        if (this.initialized || typeof window === 'undefined') {
            return;
        }

        // Load saved theme - handle both string and JSON formats
        let savedTheme: Theme = 'light';
        try {
            const stored = localStorage.getItem('theme');
            if (stored) {
                // Remove quotes if present
                const cleaned = stored.replace(/^"|"$/g, '');
                if (cleaned === 'light' || cleaned === 'dark' || cleaned === 'auto') {
                    savedTheme = cleaned as Theme;
                }
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        }

        this.currentTheme = savedTheme;

        // Setup media query for auto mode
        try {
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
        } catch (error) {
            console.error('Error setting up media query:', error);
        }

        // Apply theme immediately
        this.applyTheme(savedTheme);
        this.initialized = true;
    }

    private handleSystemThemeChange(e: MediaQueryListEvent) {
        if (this.currentTheme === 'auto') {
            this.applySystemTheme();
        }
    }

    private applySystemTheme() {
        if (!this.mediaQuery) return;

        const isDark = this.mediaQuery.matches;
        this.updateDOM(isDark ? 'dark' : 'light');
    }

    private updateDOM(theme: 'light' | 'dark') {
        if (typeof window === 'undefined') return;

        const html = document.documentElement;

        if (theme === 'dark') {
            html.classList.add('dark');
            html.style.colorScheme = 'dark';
        } else {
            html.classList.remove('dark');
            html.style.colorScheme = 'light';
        }

        // Update meta theme-color
        try {
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) {
                metaTheme.setAttribute('content', theme === 'dark' ? '#1f2937' : '#0284c7');
            }
        } catch (error) {
            console.error('Error updating meta theme:', error);
        }

        // Dispatch event for components to react
        try {
            window.dispatchEvent(new CustomEvent('theme-changed', {
                detail: { theme }
            }));
        } catch (error) {
            console.error('Error dispatching theme event:', error);
        }
    }

    private applyTheme(theme: Theme) {
        if (theme === 'auto') {
            this.applySystemTheme();
        } else {
            this.updateDOM(theme);
        }
    }

    // Public methods
    setTheme(theme: Theme) {
        this.currentTheme = theme;

        // Save theme as plain string (not JSON)
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('theme', theme);
            }
        } catch (error) {
            console.error('Error saving theme:', error);
        }

        this.applyTheme(theme);
    }

    getTheme(): Theme {
        return this.currentTheme;
    }

    getCurrentEffectiveTheme(): 'light' | 'dark' {
        if (this.currentTheme === 'auto') {
            return this.mediaQuery?.matches ? 'dark' : 'light';
        }
        return this.currentTheme;
    }

    toggleTheme() {
        const current = this.getCurrentEffectiveTheme();
        this.setTheme(current === 'light' ? 'dark' : 'light');
    }
}

// Export singleton instance
export const themeManager = ThemeManager.getInstance();

// Auto-initialize on import (client-side only)
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            themeManager.initialize();
        });
    } else {
        themeManager.initialize();
    }
}