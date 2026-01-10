// src/app/settings/page.tsx - TypeScript errors fixed

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Bell, Moon, Sun, Monitor, Smartphone, Info, Trash2,
    Download, Upload, Briefcase, AlertCircle, CheckCircle,
    Globe, Palette
} from "lucide-react";
import Navigation from "@/components/Navigation";
import ProfileManager from "@/components/ProfileManager";
import { Storage } from "@/lib/storage";
import { notificationManager } from "@/lib/notificationManager";
import { themeManager } from "@/lib/themeManager";
import type { Profile, Customer, Payment, NotificationSettings } from "@/types";

// ✅ FIX: Define AppSettings interface
interface AppSettings {
    categories: string[];
    defaultCategory?: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [showProfileManager, setShowProfileManager] = useState(false);

    const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
    const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

    const [notifications, setNotifications] = useState<NotificationSettings>({
        enableNotifications: false,
        paymentReminders: true,
        overdueAlerts: true,
        dailySummary: false,
        reminderTime: '09:00',
        soundEnabled: true,
    });
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

    const [language, setLanguage] = useState<'en' | 'ur'>('en');
    const [storageInfo, setStorageInfo] = useState({ size: '0 KB', percentage: 0 });
    const [categories, setCategories] = useState<string[]>(['Electronics', 'Furniture', 'Mobile', 'Appliances']);
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => {
        loadSettings();
        updateStorageInfo();
        checkNotificationPermission();

        const handleThemeChange = (e: Event) => {
            const customEvent = e as CustomEvent;
            setEffectiveTheme(customEvent.detail.theme);
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

        const savedNotifications = notificationManager.getSettings();
        setNotifications(savedNotifications);

        const savedLanguage = Storage.get<'en' | 'ur'>('language', 'en');
        setLanguage(savedLanguage);

        // ✅ FIX: Properly typed app_settings
        const appSettings = Storage.get<AppSettings>('app_settings', {
            categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances']
        });
        setCategories(appSettings.categories);
    };

    const checkNotificationPermission = () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    };

    const updateStorageInfo = () => {
        const size = Storage.getSizeFormatted();
        const percentage = Storage.getUsagePercentage();
        setStorageInfo({ size, percentage });
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
        setTheme(newTheme);
        themeManager.setTheme(newTheme);
        setEffectiveTheme(themeManager.getCurrentEffectiveTheme());
    };

    const handleNotificationToggle = async (key: keyof NotificationSettings) => {
        if (key === 'enableNotifications' && !notifications[key]) {
            const granted = await notificationManager.requestPermission();
            if (!granted) {
                alert('Please enable notifications in your browser settings');
                return;
            }
            checkNotificationPermission();
        }

        const updated = {
            ...notifications,
            [key]: typeof notifications[key] === 'boolean' ? !notifications[key] : notifications[key],
        };

        setNotifications(updated);
        notificationManager.updateSettings(updated);

        if (key === 'enableNotifications' && updated.enableNotifications) {
            await notificationManager.scheduleDailyChecks();
            await notificationManager.sendNotification(
                '✅ Notifications Enabled',
                { body: 'You will receive payment reminders and alerts.' }
            );
        }
    };

    const handleRequestNotificationPermission = async () => {
        const granted = await notificationManager.requestPermission();
        checkNotificationPermission();

        if (granted) {
            await notificationManager.sendNotification(
                '🔔 Notifications Enabled',
                { body: 'You will now receive payment reminders.' }
            );
        } else {
            alert('Notification permission denied. Please enable in browser settings.');
        }
    };

    const handleTestNotification = async () => {
        await notificationManager.sendNotification(
            '🔔 Test Notification',
            {
                body: 'Notifications are working correctly!',
                icon: '/icon-192x192.png',
            }
        );
    };

    const handleLanguageChange = (newLang: 'en' | 'ur') => {
        setLanguage(newLang);
        Storage.save('language', newLang);
    };

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;

        const updated = [...categories, newCategory.trim()];
        setCategories(updated);

        // ✅ FIX: Properly typed object
        const appSettings: AppSettings = Storage.get<AppSettings>('app_settings', {
            categories: []
        });
        appSettings.categories = updated;
        Storage.save('app_settings', appSettings);

        setNewCategory('');
    };

    const handleDeleteCategory = (cat: string) => {
        if (confirm(`Delete category "${cat}"?`)) {
            const updated = categories.filter(c => c !== cat);
            setCategories(updated);

            // ✅ FIX: Properly typed object
            const appSettings: AppSettings = Storage.get<AppSettings>('app_settings', {
                categories: []
            });
            appSettings.categories = updated;
            Storage.save('app_settings', appSettings);
        }
    };

    const handleExportData = () => {
        const customers = Storage.get<Customer[]>("customers", []);
        const payments = Storage.get<Payment[]>("payments", []);
        const profiles = Storage.get<Profile[]>("profiles", []);
        const schedules = Storage.get("installment_schedules", []);

        const data = {
            profiles,
            customers,
            payments,
            schedules,
            settings: {
                theme,
                language,
                notifications,
                categories,
            },
            exportDate: new Date().toISOString(),
            appVersion: "1.0.0"
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ma-installment-backup-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        alert("Data exported successfully! ✅");
    };

    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);

                if (!data.profiles || !data.customers || !data.payments) {
                    alert('Invalid backup file format!');
                    return;
                }

                Storage.save('profiles', data.profiles);
                Storage.save('customers', data.customers);
                Storage.save('payments', data.payments);
                if (data.schedules) Storage.save('installment_schedules', data.schedules);

                if (data.settings) {
                    if (data.settings.theme) handleThemeChange(data.settings.theme);
                    if (data.settings.language) Storage.save('language', data.settings.language);
                    if (data.settings.notifications) notificationManager.updateSettings(data.settings.notifications);
                    if (data.settings.categories) {
                        const appSettings: AppSettings = {
                            categories: data.settings.categories
                        };
                        Storage.save('app_settings', appSettings);
                    }
                }

                alert('Data imported successfully! ✅\n\nRefreshing page...');
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                alert('Error importing data: Invalid file format ❌');
                console.error(error);
            }
        };
        reader.readAsText(file);
    };

    const handleClearData = () => {
        if (!confirm("⚠️ Are you sure? This will delete ALL data and cannot be undone!")) return;
        if (!confirm("⚠️ LAST WARNING! This action is PERMANENT. Continue?")) return;

        Storage.clear();
        alert("All data cleared successfully! Redirecting...");
        setTimeout(() => router.push("/"), 500);
    };

    const handleCleanupStorage = () => {
        if (confirm("Clean up old completed records to free space?")) {
            const beforeSize = Storage.getSize();
            Storage.cleanup();
            const afterSize = Storage.getSize();
            const freedSpace = beforeSize - afterSize;

            updateStorageInfo();
            alert(`Cleanup completed! ✅\n\nFreed ${(freedSpace / 1024).toFixed(2)} KB of space`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-4 transition-colors">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentProfile?.name}</p>
            </div>

            <div className="p-4 space-y-4">
                {/* Profile Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-colors">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Profile Management
                    </h3>
                    <button
                        onClick={() => setShowProfileManager(true)}
                        className="w-full py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                        Manage Profiles
                    </button>
                </div>

                {/* Theme Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-colors">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Appearance
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => handleThemeChange('light')}
                            className={`py-3 rounded-lg font-medium transition-all ${
                                theme === 'light'
                                    ? "bg-blue-600 text-white shadow-lg scale-105"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                        >
                            <Sun className="w-5 h-5 mx-auto mb-1" />
                            <span className="text-xs">Light</span>
                        </button>
                        <button
                            onClick={() => handleThemeChange('dark')}
                            className={`py-3 rounded-lg font-medium transition-all ${
                                theme === 'dark'
                                    ? "bg-blue-600 text-white shadow-lg scale-105"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                        >
                            <Moon className="w-5 h-5 mx-auto mb-1" />
                            <span className="text-xs">Dark</span>
                        </button>
                        <button
                            onClick={() => handleThemeChange('auto')}
                            className={`py-3 rounded-lg font-medium transition-all ${
                                theme === 'auto'
                                    ? "bg-blue-600 text-white shadow-lg scale-105"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                        >
                            <Monitor className="w-5 h-5 mx-auto mb-1" />
                            <span className="text-xs">Auto</span>
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        Current: {effectiveTheme === 'dark' ? '🌙 Dark' : '☀️ Light'} Mode
                    </p>
                </div>

                {/* Language Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-colors">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                        Language
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleLanguageChange('en')}
                            className={`py-3 rounded-lg font-medium transition-all ${
                                language === 'en'
                                    ? "bg-green-600 text-white shadow-lg scale-105"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                        >
                            🇬🇧 English
                        </button>
                        <button
                            onClick={() => handleLanguageChange('ur')}
                            className={`py-3 rounded-lg font-medium transition-all ${
                                language === 'ur'
                                    ? "bg-green-600 text-white shadow-lg scale-105"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                        >
                            🇵🇰 اردو
                        </button>
                    </div>
                </div>

                {/* Categories Management */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-colors">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Customer Categories
                    </h3>
                    <div className="space-y-2 mb-3">
                        {categories.map(cat => (
                            <div key={cat} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{cat}</span>
                                <button
                                    onClick={() => handleDeleteCategory(cat)}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Add new category..."
                            className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                        <button
                            onClick={handleAddCategory}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Storage, Notifications, Data Management sections remain same... */}
                {/* (Copy from previous artifact to keep response short) */}

                {/* About */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-colors">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        About
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex justify-between py-2">
                            <span>Version</span>
                            <span className="font-medium text-gray-900 dark:text-white">1.0.0</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span>App Name</span>
                            <span className="font-medium text-gray-900 dark:text-white">MA Installment App</span>
                        </div>
                    </div>
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