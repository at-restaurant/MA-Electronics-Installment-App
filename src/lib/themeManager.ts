// src/lib/themeManager.ts - FIXED THEME SYSTEM

import { Storage } from './storage';

export type Theme = 'light' | 'dark' | 'auto';

export class ThemeManager {
    private static instance: ThemeManager;
    private currentTheme: Theme = 'light';
    private mediaQuery: MediaQueryList | null = null;

    private constructor() {
        if (typeof window !== 'undefined') {
            this.initialize();
        }
    }

    static getInstance(): ThemeManager {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }

    private initialize() {
        // Load saved theme (plain string, not JSON)
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark' || saved === 'auto') {
            this.currentTheme = saved;
        } else {
            // Default to light theme
            this.currentTheme = 'light';
            localStorage.setItem('theme', 'light');
        }

        // Setup system theme listener
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaQuery.addEventListener('change', (e) => {
            if (this.currentTheme === 'auto') {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Apply initial theme immediately
        this.applyCurrentTheme();
    }

    private applyCurrentTheme() {
        if (this.currentTheme === 'auto') {
            const isDark = this.mediaQuery?.matches || false;
            this.applyTheme(isDark ? 'dark' : 'light');
        } else {
            this.applyTheme(this.currentTheme);
        }
    }

    private applyTheme(theme: 'light' | 'dark') {
        const html = document.documentElement;
        const body = document.body;

        if (theme === 'dark') {
            html.classList.add('dark');
            body.classList.add('dark');
            html.style.colorScheme = 'dark';
            html.style.backgroundColor = '#111827';
            body.style.backgroundColor = '#111827';
        } else {
            html.classList.remove('dark');
            body.classList.remove('dark');
            html.style.colorScheme = 'light';
            html.style.backgroundColor = '#ffffff';
            body.style.backgroundColor = '#f9fafb';
        }

        // Update theme-color meta tag
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', theme === 'dark' ? '#1f2937' : '#ffffff');
        }

        // Dispatch event for React components
        window.dispatchEvent(new CustomEvent('theme-changed', {
            detail: { theme, effectiveTheme: theme }
        }));
    }

    // Public API
    setTheme(theme: Theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyCurrentTheme();
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

export const themeManager = ThemeManager.getInstance();