"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Bell,
    Moon,
    Sun,
    Monitor,
    Smartphone,
    Info,
    Trash2,
    Download,
    Upload,
    Briefcase,
    AlertCircle,
    CheckCircle,
    Globe,
    Palette,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import ProfileManager from "@/components/ProfileManager";
import { Storage } from "@/lib/storage";
import { notificationManager } from "@/lib/notificationManager";
import { useTheme } from "@/hooks/useTheme";
import type { Profile, Customer, Payment, NotificationSettings } from "@/types";

export default function SettingsPage() {
    const router = useRouter();
    const { theme, effectiveTheme, setTheme, isDark } = useTheme();

    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [showProfileManager, setShowProfileManager] = useState(false);
    const [notifications, setNotifications] = useState<NotificationSettings>({
        enableNotifications: true,
        paymentReminders: true,
        overdueAlerts: true,
        dailySummary: false,
    });
    const [storageInfo, setStorageInfo] = useState({ size: '0 KB', percentage: 0 });
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [language, setLanguage] = useState<'en' | 'ur'>('en');

    useEffect(() => {
        loadSettings();
        updateStorageInfo();
        checkNotificationPermission();
    }, []);

    const loadSettings = () => {
        const profile = Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }

        setCurrentProfile(profile);

        const savedNotifications = notificationManager.getSettings();
        const savedLanguage = Storage.get<'en' | 'ur'>('language', 'en');

        setNotifications(savedNotifications);
        setLanguage(savedLanguage);
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

    const handleNotificationToggle = async (key: keyof NotificationSettings) => {
        const updated = {
            ...notifications,
            [key]: !notifications[key],
        };

        if (key === 'enableNotifications' && !notifications[key]) {
            const granted = await notificationManager.requestPermission();
            if (!granted) {
                alert('Please enable notifications in your browser settings');
                return;
            }
            checkNotificationPermission();
        }

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

    const handleLanguageChange = (newLang: 'en' | 'ur') => {
        setLanguage(newLang);
        Storage.save('language', newLang);
        // You can add i18n integration here
    };

    const handleExportData = () => {
        const customers = Storage.get<Customer[]>("customers", []);
        const payments = Storage.get<Payment[]>("payments", []);
        const profiles = Storage.get<Profile[]>("profiles", []);

        const data = {
            profiles,
            customers,
            payments,
            settings: {
                theme,
                language,
                notifications,
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

                // Validate data structure
                if (!data.profiles || !data.customers || !data.payments) {
                    alert('Invalid backup file format!');
                    return;
                }

                // Import data
                Storage.save('profiles', data.profiles);
                Storage.save('customers', data.customers);
                Storage.save('payments', data.payments);

                // Import settings if available
                if (data.settings) {
                    if (data.settings.theme) {
                        setTheme(data.settings.theme);
                    }
                    if (data.settings.language) {
                        Storage.save('language', data.settings.language);
                    }
                    if (data.settings.notifications) {
                        notificationManager.updateSettings(data.settings.notifications);
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

    const handleTestNotification = async () => {
        await notificationManager.sendNotification(
            '🔔 Test Notification',
            {
                body: 'Notifications are working correctly!',
                icon: '/icon-192x192.png',
            }
        );
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        Create multiple profiles for different businesses
                    </p>
                </div>

                {/* Theme Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-colors">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Appearance
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setTheme('light')}
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
                            onClick={() => setTheme('dark')}
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
                            onClick={() => setTheme('auto')}
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

                {/* Notifications Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-colors">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        Notifications
                    </h3>

                    {notificationPermission === 'denied' && (
                        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-red-800 dark:text-red-300 font-medium">Notifications Blocked</p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    Please enable notifications in your browser settings
                                </p>
                            </div>
                        </div>
                    )}

                    {notificationPermission === 'granted' && (
                        <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-green-800 dark:text-green-300 font-medium">Notifications Enabled</p>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    You'll receive payment reminders and alerts
                                </p>
                            </div>
                        </div>
                    )}

                    {notificationPermission === 'default' && (
                        <button
                            onClick={handleRequestNotificationPermission}
                            className="w-full mb-3 py-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg font-medium hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Bell className="w-4 h-4" />
                            Enable Notifications
                        </button>
                    )}

                    <div className="space-y-3">
                        <label className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Enable Notifications</span>
                            <input
                                type="checkbox"
                                checked={notifications.enableNotifications}
                                onChange={() => handleNotificationToggle("enableNotifications")}
                                disabled={notificationPermission === 'denied'}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                        </label>
                        <label className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Payment Reminders</span>
                            <input
                                type="checkbox"
                                checked={notifications.paymentReminders}
                                onChange={() => handleNotificationToggle("paymentReminders")}
                                disabled={!notifications.enableNotifications}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                        </label>
                        <label className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Overdue Alerts</span>
                            <input
                                type="checkbox"
                                checked={notifications.overdueAlerts}
                                onChange={() => handleNotificationToggle("overdueAlerts")}
                                disabled={!notifications.enableNotifications}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                        </label>
                        <label className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Daily Summary (8 PM)</span>
                            <input
                                type="checkbox"
                                checked={notifications.dailySummary}
                                onChange={() => handleNotificationToggle("dailySummary")}
                                disabled={!notifications.enableNotifications}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                        </label>
                    </div>

                    {notificationPermission === 'granted' && notifications.enableNotifications && (
                        <button
                            onClick={handleTestNotification}
                            className="w-full mt-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Test Notification
                        </button>
                    )}
                </div>

                {/* Storage Info */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-colors">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Storage Usage
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Used Space</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{storageInfo.size}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all ${
                                    storageInfo.percentage > 80 ? 'bg-red-500' :
                                        storageInfo.percentage > 60 ? 'bg-orange-500' :
                                            'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {storageInfo.percentage}% of available storage used
                        </p>
                        {storageInfo.percentage > 60 && (
                            <button
                                onClick={handleCleanupStorage}
                                className="w-full py-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                            >
                                Clean Up Old Records
                            </button>
                        )}
                    </div>
                </div>

                {/* Data Management */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-colors">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Data Management
                    </h3>
                    <div className="space-y-2">
                        <button
                            onClick={handleExportData}
                            className="w-full py-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export Data (Backup)
                        </button>

                        <label className="w-full py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            Import Data (Restore)
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImportData}
                                className="hidden"
                            />
                        </label>

                        <button
                            onClick={handleClearData}
                            className="w-full py-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear All Data
                        </button>
                    </div>
                </div>

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
                        <div className="flex justify-between py-2">
                            <span>Developer</span>
                            <span className="font-medium text-gray-900 dark:text-white">MA Electronics</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Manager Modal */}
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