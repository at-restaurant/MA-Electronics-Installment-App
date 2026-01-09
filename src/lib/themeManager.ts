// src/lib/themeManager.ts - Complete theme management system

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
        // Load saved theme
        const savedTheme = Storage.get<Theme>('theme', 'light');
        this.currentTheme = savedTheme;

        // Setup media query for auto mode
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));

        // Apply theme
        this.applyTheme(savedTheme);
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
        const html = document.documentElement;

        if (theme === 'dark') {
            html.classList.add('dark');
            html.style.colorScheme = 'dark';
        } else {
            html.classList.remove('dark');
            html.style.colorScheme = 'light';
        }

        // Update meta theme-color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', theme === 'dark' ? '#1f2937' : '#0284c7');
        }

        // Dispatch event for components to react
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
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
        Storage.save('theme', theme);
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

export const themeManager = ThemeManager.getInstance();