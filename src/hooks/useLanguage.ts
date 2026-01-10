// src/hooks/useLanguage.ts - Language Management Hook (Default English)

import { useState, useEffect } from 'react';
import { Storage } from '@/lib/storage';
import type { Language } from '@/lib/translations';
import { translations } from '@/lib/translations';

export function useLanguage() {
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window !== 'undefined') {
            const saved = Storage.get<Language>('language', 'en');
            // Always default to English if not set
            return saved || 'en';
        }
        return 'en';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        Storage.save('language', lang);

        // Update document direction for Urdu
        if (typeof window !== 'undefined') {
            document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
            document.documentElement.lang = lang;
        }

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('language-changed', {
            detail: { language: lang }
        }));
    };

    const t = (key: keyof typeof translations.en): string => {
        return translations[language][key] || translations.en[key] || key;
    };

    useEffect(() => {
        // Set initial direction and language
        document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
        document.documentElement.lang = language;

        // Ensure English is default on first load
        const saved = localStorage.getItem('language');
        if (!saved) {
            localStorage.setItem('language', 'en');
        }
    }, [language]);

    return {
        language,
        setLanguage,
        t,
        isUrdu: language === 'ur',
        isEnglish: language === 'en',
    };
}