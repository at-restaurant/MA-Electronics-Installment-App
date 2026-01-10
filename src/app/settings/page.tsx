// src/app/settings/page.tsx - UPDATED with Google Drive

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Settings as SettingsIcon,
    Bell,
    Smartphone,
    Info,
    Trash2,
    Download,
    Briefcase,
    Plus,
    X,
    Tag,
    Cloud,
    ChevronRight
} from "lucide-react";
import Navigation from "@/components/Navigation";
import ProfileManager from "@/components/ProfileManager";
import { Storage } from "@/lib/storage";
import { driveManager } from "@/lib/driveManager";
import type { Profile, NotificationSettings } from "@/types";

interface AppSettings {
    categories: string[];
    defaultCategory: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [showProfileManager, setShowProfileManager] = useState(false);
    const [notifications, setNotifications] = useState<NotificationSettings>({
        enableNotifications: true,
        paymentReminders: true,
        overdueAlerts: true,
        dailySummary: false,
        reminderTime: '09:00',
        soundEnabled: true,
    });
    const [storageInfo, setStorageInfo] = useState({ size: '0 KB', percentage: 0 });
    const [driveAccounts, setDriveAccounts] = useState(0);

    const [appSettings, setAppSettings] = useState<AppSettings>({
        categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances', 'Other'],
        defaultCategory: 'Electronics',
    });
    const [newCategory, setNewCategory] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);

    useEffect(() => {
        loadSettings();
        updateStorageInfo();
        loadDriveInfo();

        // Auto backup every 24 hours
        driveManager.startAutoBackup(24);
    }, []);

    const loadSettings = () => {
        const profile = Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }

        setCurrentProfile(profile);

        const savedNotifications = Storage.get<NotificationSettings>("notifications", {
            enableNotifications: true,
            paymentReminders: true,
            overdueAlerts: true,
            dailySummary: false,
            reminderTime: '09:00',
            soundEnabled: true,
        });
        setNotifications(savedNotifications);

        const savedAppSettings = Storage.get<AppSettings>('app_settings', {
            categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances', 'Other'],
            defaultCategory: 'Electronics',
        });
        setAppSettings(savedAppSettings);
    };

    const loadDriveInfo = () => {
        const accounts = driveManager.getAccounts();
        setDriveAccounts(accounts.length);
    };

    const updateStorageInfo = () => {
        const size = Storage.getSizeFormatted();
        const percentage = Storage.getUsagePercentage();
        setStorageInfo({ size, percentage });
    };

    const handleNotificationToggle = (key: keyof NotificationSettings) => {
        const updated = {
            ...notifications,
            [key]: !notifications[key],
        };
        setNotifications(updated);
        Storage.save("notifications", updated);
    };

    const handleAddCategory = () => {
        if (!newCategory.trim()) {
            alert('Please enter category name');
            return;
        }

        if (appSettings.categories.includes(newCategory.trim())) {
            alert('Category already exists');
            return;
        }

        const updated = {
            ...appSettings,
            categories: [...appSettings.categories, newCategory.trim()],
        };

        setAppSettings(updated);
        Storage.save('app_settings', updated);
        setNewCategory('');
        setShowAddCategory(false);
    };

    const handleDeleteCategory = (category: string) => {
        if (appSettings.categories.length <= 1) {
            alert('Cannot delete last category');
            return;
        }

        if (!confirm(`Delete category "${category}"?`)) {
            return;
        }

        const updated = {
            ...appSettings,
            categories: appSettings.categories.filter(c => c !== category),
            defaultCategory: appSettings.defaultCategory === category
                ? appSettings.categories.find(c => c !== category) || 'Other'
                : appSettings.defaultCategory,
        };

        setAppSettings(updated);
        Storage.save('app_settings', updated);
    };

    const handleSetDefaultCategory = (category: string) => {
        const updated = {
            ...appSettings,
            defaultCategory: category,
        };
        setAppSettings(updated);
        Storage.save('app_settings', updated);
    };

    const handleExportData = () => {
        const customers = Storage.get("customers", []);
        const payments = Storage.get("payments", []);
        const profiles = Storage.get("profiles", []);

        const data = {
            profiles,
            customers,
            payments,
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

        alert("Data exported successfully!");
    };

    const handleClearData = () => {
        if (!confirm("Are you sure? This will delete ALL data and cannot be undone!")) return;
        if (!confirm("Last warning! This action is permanent. Continue?")) return;

        Storage.clear();
        alert("All data cleared successfully");
        router.push("/");
    };

    const handleCleanupStorage = () => {
        if (confirm("Clean up old completed records to free space?")) {
            Storage.cleanup();
            updateStorageInfo();
            alert("Cleanup completed! Old records have been removed.");
        }
    };

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4">
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-gray-600 mt-1">{currentProfile?.name}</p>
            </div>

            <div className="p-4 space-y-4">
                {/* ✅ NEW: Google Drive Section */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-lg">
                    <button
                        onClick={() => router.push('/drive')}
                        className="w-full text-left"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                    <Cloud className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">Google Drive Backup</h3>
                                    <p className="text-sm text-blue-100">
                                        {driveAccounts === 0
                                            ? 'Not connected - Tap to setup'
                                            : `${driveAccounts} account${driveAccounts > 1 ? 's' : ''} connected`}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-white" />
                        </div>
                    </button>
                </div>

                {/* Profile Section */}
                <div className="bg-gray-50 rounded-2xl p-4 shadow-sm border border-gray-200">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        Profile Management
                    </h3>
                    <button
                        onClick={() => setShowProfileManager(true)}
                        className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                    >
                        Manage Profiles
                    </button>
                </div>

                {/* Category Management */}
                <div className="bg-gray-50 rounded-2xl p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Tag className="w-5 h-5 text-purple-600" />
                            Customer Categories
                        </h3>
                        <button
                            onClick={() => setShowAddCategory(true)}
                            className="text-sm text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>

                    <div className="space-y-2">
                        {appSettings.categories.map(category => (
                            <div
                                key={category}
                                className="flex items-center justify-between p-3 bg-white rounded-lg"
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={appSettings.defaultCategory === category}
                                        onChange={() => handleSetDefaultCategory(category)}
                                        className="w-4 h-4 text-purple-600"
                                    />
                                    <span className="font-medium">{category}</span>
                                    {appSettings.defaultCategory === category && (
                                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                                            Default
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDeleteCategory(category)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    disabled={appSettings.categories.length <= 1}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {showAddCategory && (
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder="e.g., Bikes"
                                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    autoFocus
                                />
                                <button
                                    onClick={handleAddCategory}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    Add
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddCategory(false);
                                        setNewCategory('');
                                    }}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="bg-gray-50 rounded-2xl p-4 shadow-sm border border-gray-200">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-green-600" />
                        Notifications
                    </h3>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between py-2">
                            <span className="text-sm">Payment Reminders</span>
                            <input
                                type="checkbox"
                                checked={notifications.paymentReminders}
                                onChange={() => handleNotificationToggle("paymentReminders")}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                        </label>
                        <label className="flex items-center justify-between py-2">
                            <span className="text-sm">Overdue Alerts</span>
                            <input
                                type="checkbox"
                                checked={notifications.overdueAlerts}
                                onChange={() => handleNotificationToggle("overdueAlerts")}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                        </label>
                        <label className="flex items-center justify-between py-2">
                            <span className="text-sm">Daily Summary</span>
                            <input
                                type="checkbox"
                                checked={notifications.dailySummary}
                                onChange={() => handleNotificationToggle("dailySummary")}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                        </label>
                    </div>
                </div>

                {/* Storage Info */}
                <div className="bg-gray-50 rounded-2xl p-4 shadow-sm border border-gray-200">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-purple-600" />
                        Storage Usage
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Used Space</span>
                            <span className="font-semibold">{storageInfo.size}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all ${
                                    storageInfo.percentage > 80 ? 'bg-red-500' :
                                        storageInfo.percentage > 60 ? 'bg-orange-500' :
                                            'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            {storageInfo.percentage}% of available storage used
                        </p>
                        {storageInfo.percentage > 60 && (
                            <button
                                onClick={handleCleanupStorage}
                                className="w-full py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100"
                            >
                                Clean Up Old Records
                            </button>
                        )}
                    </div>
                </div>

                {/* Data Management */}
                <div className="bg-gray-50 rounded-2xl p-4 shadow-sm border border-gray-200">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-purple-600" />
                        Data Management
                    </h3>
                    <div className="space-y-2">
                        <button
                            onClick={handleExportData}
                            className="w-full py-3 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export Local Backup
                        </button>
                        <button
                            onClick={handleClearData}
                            className="w-full py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear All Data
                        </button>
                    </div>
                </div>

                {/* About */}
                <div className="bg-gray-50 rounded-2xl p-4 shadow-sm border border-gray-200">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5 text-gray-600" />
                        About
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between py-2">
                            <span>Version</span>
                            <span className="font-medium">1.0.0</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span>App Name</span>
                            <span className="font-medium">MA Installment App</span>
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