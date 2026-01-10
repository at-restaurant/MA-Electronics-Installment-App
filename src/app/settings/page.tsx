// src/app/settings/page.tsx - CLEAN & WORKING

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Moon, Sun, Monitor, Globe, Trash2, Download, Upload,
    Briefcase, AlertCircle, CheckCircle
} from "lucide-react";
import Navigation from "@/components/Navigation";
import ProfileManager from "@/components/ProfileManager";
import { Storage } from "@/lib/storage";
import { themeManager } from "@/lib/themeManager";
import { useLanguage } from "@/hooks/useLanguage";
import type { Profile } from "@/types";

export default function SettingsPage() {
    const router = useRouter();
    const { language, setLanguage, t, isUrdu } = useLanguage();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [showProfileManager, setShowProfileManager] = useState(false);

    const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
    const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');
    const [storageInfo, setStorageInfo] = useState({ size: '0 KB', percentage: 0 });

    useEffect(() => {
        loadSettings();
        updateStorageInfo();

        const handleThemeChange = (e: Event) => {
            const event = e as CustomEvent;
            setEffectiveTheme(event.detail.effectiveTheme);
        };

        window.addEventListener('theme-changed', handleThemeChange);
        return () => window.removeEventListener('theme-changed', handleThemeChange);
    }, []);

    const loadSettings = () => {
        const profile = Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }
        setCurrentProfile(profile);

        const savedTheme = themeManager.getTheme();
        setTheme(savedTheme);
        setEffectiveTheme(themeManager.getCurrentEffectiveTheme());
    };

    const updateStorageInfo = () => {
        const size = Storage.getSizeFormatted();
        const percentage = Storage.getUsagePercentage();
        setStorageInfo({ size, percentage });
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
        setTheme(newTheme);
        themeManager.setTheme(newTheme);
    };

    const handleExportData = () => {
        const data = {
            profiles: Storage.get("profiles", []),
            customers: Storage.get("customers", []),
            payments: Storage.get("payments", []),
            settings: { theme, language },
            exportDate: new Date().toISOString(),
            appVersion: "1.0.0"
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ma-backup-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        alert(isUrdu ? "ڈیٹا کامیابی سے برآمد ہو گیا ✅" : "Data exported successfully! ✅");
    };

    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);

                Storage.save('profiles', data.profiles);
                Storage.save('customers', data.customers);
                Storage.save('payments', data.payments);

                if (data.settings?.theme) handleThemeChange(data.settings.theme);
                if (data.settings?.language) setLanguage(data.settings.language);

                alert(isUrdu ? "ڈیٹا کامیابی سے درآمد ہو گیا! ✅" : "Data imported successfully! ✅");
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                alert(isUrdu ? "ڈیٹا درآمد میں خرابی ❌" : "Import failed ❌");
            }
        };
        reader.readAsText(file);
    };

    const handleClearData = () => {
        const msg1 = isUrdu
            ? "⚠️ کیا آپ واقعی تمام ڈیٹا حذف کرنا چاہتے ہیں؟"
            : "⚠️ Delete ALL data? This cannot be undone!";

        const msg2 = isUrdu
            ? "⚠️ آخری انتباہ! یہ مستقل ہے۔ جاری رکھیں؟"
            : "⚠️ LAST WARNING! This is PERMANENT. Continue?";

        if (!confirm(msg1)) return;
        if (!confirm(msg2)) return;

        Storage.clear();
        alert(isUrdu ? "تمام ڈیٹا صاف ہو گیا!" : "All data cleared!");
        setTimeout(() => router.push("/"), 500);
    };

    return (
        <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 ${isUrdu ? 'rtl' : 'ltr'}`}>
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('settings')}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {currentProfile?.name}
                </p>
            </div>

            <div className="p-4 space-y-4">
                {/* Profile Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        {t('profileManagement')}
                    </h3>
                    <button
                        onClick={() => setShowProfileManager(true)}
                        className="w-full py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50"
                    >
                        {t('manageProfiles')}
                    </button>
                </div>

                {/* Theme Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Sun className="w-5 h-5 text-yellow-600" />
                        {t('appearance')}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => handleThemeChange('light')}
                            className={`py-3 rounded-lg font-medium transition-all ${
                                theme === 'light'
                                    ? "bg-blue-600 text-white shadow-lg scale-105"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                            }`}
                        >
                            <Sun className="w-5 h-5 mx-auto mb-1" />
                            <span className="text-xs">{t('light')}</span>
                        </button>
                        <button
                            onClick={() => handleThemeChange('dark')}
                            className={`py-3 rounded-lg font-medium transition-all ${
                                theme === 'dark'
                                    ? "bg-blue-600 text-white shadow-lg scale-105"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                            }`}
                        >
                            <Moon className="w-5 h-5 mx-auto mb-1" />
                            <span className="text-xs">{t('dark')}</span>
                        </button>
                        <button
                            onClick={() => handleThemeChange('auto')}
                            className={`py-3 rounded-lg font-medium transition-all ${
                                theme === 'auto'
                                    ? "bg-blue-600 text-white shadow-lg scale-105"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                            }`}
                        >
                            <Monitor className="w-5 h-5 mx-auto mb-1" />
                            <span className="text-xs">{t('auto')}</span>
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        {isUrdu ? 'موجودہ:' : 'Current:'} {effectiveTheme === 'dark' ? '🌙 ' + t('dark') : '☀️ ' + t('light')}
                    </p>
                </div>

                {/* Language Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Globe className="w-5 h-5 text-green-600" />
                        {t('language')}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setLanguage('en')}
                            className={`py-3 rounded-lg font-medium transition-all ${
                                language === 'en'
                                    ? "bg-green-600 text-white shadow-lg scale-105"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                            }`}
                        >
                            🇬🇧 English
                        </button>
                        <button
                            onClick={() => setLanguage('ur')}
                            className={`py-3 rounded-lg font-medium transition-all ${
                                language === 'ur'
                                    ? "bg-green-600 text-white shadow-lg scale-105"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                            }`}
                        >
                            🇵🇰 اردو
                        </button>
                    </div>
                </div>

                {/* Storage Info */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {isUrdu ? 'اسٹوریج' : 'Storage'}
                        </h3>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {storageInfo.size} ({storageInfo.percentage}%)
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${
                                storageInfo.percentage > 80 ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${storageInfo.percentage}%` }}
                        />
                    </div>
                </div>

                {/* Data Management */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        {t('dataManagement')}
                    </h3>
                    <button
                        onClick={handleExportData}
                        className="w-full py-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg font-medium hover:bg-green-100 flex items-center justify-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        {t('exportData')}
                    </button>
                    <label className="w-full py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-100 flex items-center justify-center gap-2 cursor-pointer">
                        <Upload className="w-5 h-5" />
                        {t('importData')}
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImportData}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={handleClearData}
                        className="w-full py-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-100 flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-5 h-5" />
                        {t('clearAllData')}
                    </button>
                </div>
            </div>

            {showProfileManager && (
                <ProfileManager
                    onClose={() => setShowProfileManager(false)}
                    onProfilesUpdate={() => {
                        loadSettings();
                        updateStorageInfo();
                    }}
                />
            )}

            <Navigation currentPage="settings" />
        </div>
    );
}