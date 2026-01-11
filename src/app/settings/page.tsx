// src/app/settings/page.tsx - WITH STORAGE OPTIMIZATION

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Bell, Smartphone, Info, Trash2, Download, Upload, Briefcase,
    Plus, X, Tag, HardDrive, Sparkles
} from "lucide-react";
import Navigation from "@/components/Navigation";
import GlobalHeader from "@/components/GlobalHeader";
import ProfileManager from "@/components/ProfileManager";
import { Storage } from "@/lib/storage";
import { OptimizedStorage } from "@/lib/storage-optimized";
import { db } from "@/lib/db";
import { useProfile } from "@/hooks/useCompact";
import type { NotificationSettings } from "@/types";

interface AppSettings {
    categories: string[];
    defaultCategory: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const { profile } = useProfile();
    const [showProfileManager, setShowProfileManager] = useState(false);

    const [notifications, setNotifications] = useState<NotificationSettings>({
        enableNotifications: true,
        paymentReminders: true,
        overdueAlerts: true,
        dailySummary: false,
        reminderTime: '09:00',
        soundEnabled: true,
    });

    const [storageInfo, setStorageInfo] = useState({
        sizePretty: '0 KB',
        customers: 0,
        payments: 0,
        canCleanup: false
    });

    const [appSettings, setAppSettings] = useState<AppSettings>({
        categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances', 'Other'],
        defaultCategory: 'Electronics',
    });

    const [newCategory, setNewCategory] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);

    useEffect(() => {
        loadSettings();
        updateStorageInfo();
    }, []);

    const loadSettings = async () => {
        const savedNotifications = await Storage.get<NotificationSettings>("notifications", notifications);
        setNotifications(savedNotifications);

        const savedAppSettings = await Storage.get<AppSettings>('app_settings', appSettings);
        setAppSettings(savedAppSettings);
    };

    const updateStorageInfo = async () => {
        const stats = await OptimizedStorage.getStorageStats();
        setStorageInfo(stats);
    };

    const handleNotificationToggle = async (key: keyof NotificationSettings) => {
        const updated = { ...notifications, [key]: !notifications[key] };
        setNotifications(updated);
        await Storage.save("notifications", updated);
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim() || appSettings.categories.includes(newCategory.trim())) {
            alert(newCategory.trim() ? 'Category already exists' : 'Enter category name');
            return;
        }

        const updated = {
            ...appSettings,
            categories: [...appSettings.categories, newCategory.trim()],
        };

        setAppSettings(updated);
        await Storage.save('app_settings', updated);
        setNewCategory('');
        setShowAddCategory(false);
    };

    const handleDeleteCategory = async (category: string) => {
        if (appSettings.categories.length <= 1 || !confirm(`Delete "${category}"?`)) return;

        const updated = {
            ...appSettings,
            categories: appSettings.categories.filter(c => c !== category),
            defaultCategory: appSettings.defaultCategory === category
                ? appSettings.categories.find(c => c !== category) || 'Other'
                : appSettings.defaultCategory,
        };

        setAppSettings(updated);
        await Storage.save('app_settings', updated);
    };

    const handleSetDefaultCategory = async (category: string) => {
        const updated = { ...appSettings, defaultCategory: category };
        setAppSettings(updated);
        await Storage.save('app_settings', updated);
    };

    // ✅ NEW: Storage Cleanup
    const handleCleanupStorage = async () => {
        if (!confirm('Clean up old completed records? This will archive customers completed over 3 months ago.')) return;

        const cleaned = await OptimizedStorage.cleanupOldData(3);
        await updateStorageInfo();
        alert(`✅ Cleaned ${cleaned} old records! Storage optimized.`);
    };

    // ✅ NEW: Vacuum Database
    const handleVacuum = async () => {
        if (!confirm('Optimize database? This may take a few seconds.')) return;

        await OptimizedStorage.vacuum();
        await updateStorageInfo();
        alert('✅ Database optimized successfully!');
    };

    const handleExportData = async () => {
        const data = await db.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ma-backup-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert("✅ Data exported successfully!");
    };

    const handleImportData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const success = await db.importAll(JSON.parse(text));

                if (success) {
                    alert("✅ Data imported successfully!");
                    window.location.reload();
                } else {
                    alert("❌ Import failed! Invalid backup file.");
                }
            } catch {
                alert("❌ Import failed! Invalid backup file.");
            }
        };

        input.click();
    };

    const handleClearData = async () => {
        if (!confirm("Delete ALL data? This cannot be undone!")) return;
        if (!confirm("Last warning! This action is PERMANENT. Continue?")) return;

        await db.clearAll();
        alert("All data cleared");
        router.push("/");
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Settings" />

            <div className="pt-16 p-4 space-y-4">
                {/* Profile Management */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
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
                <div className="bg-white rounded-2xl p-4 shadow-sm">
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
                            <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={appSettings.defaultCategory === category}
                                        onChange={() => handleSetDefaultCategory(category)}
                                        className="w-4 h-4 text-purple-600"
                                    />
                                    <span className="font-medium">{category}</span>
                                    {appSettings.defaultCategory === category && (
                                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">Default</span>
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
                                <button onClick={handleAddCategory} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                    Add
                                </button>
                                <button onClick={() => setShowAddCategory(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
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

                {/* ✅ Storage Optimization */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-orange-600" />
                        Storage Optimization
                    </h3>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Used Space</span>
                            <span className="font-semibold">{storageInfo.sizePretty}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Customers</span>
                            <span className="font-semibold">{storageInfo.customers}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Payments</span>
                            <span className="font-semibold">{storageInfo.payments}</span>
                        </div>

                        {storageInfo.canCleanup && (
                            <button
                                onClick={handleCleanupStorage}
                                className="w-full py-2.5 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Clean Up Old Records
                            </button>
                        )}

                        <button
                            onClick={handleVacuum}
                            className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                        >
                            Optimize Database
                        </button>
                    </div>
                </div>

                {/* Data Management */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
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
                            Export Backup
                        </button>
                        <button
                            onClick={handleImportData}
                            className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Import Backup
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
                <div className="bg-white rounded-2xl p-4 shadow-sm">
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
                            <span>Storage Type</span>
                            <span className="font-medium">IndexedDB (Optimized)</span>
                        </div>
                    </div>
                </div>
            </div>

            {showProfileManager && (
                <ProfileManager
                    onClose={() => setShowProfileManager(false)}
                    onProfilesUpdate={async () => {
                        await loadSettings();
                        await updateStorageInfo();
                    }}
                />
            )}

            <Navigation currentPage="settings" />
        </div>
    );
}