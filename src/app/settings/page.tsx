// src/app/settings/page.tsx - FIXED with WhatsApp Queue Status
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Bell, Smartphone, Info, Trash2, Download, Upload, Briefcase,
    Plus, X, Tag, HardDrive, Sparkles, Volume2, VolumeX, BellRing, MessageSquare
} from "lucide-react";
import Navigation from "@/components/Navigation";
import GlobalHeader from "@/components/GlobalHeader";
import ProfileManager from "@/components/ProfileManager";
import { db } from "@/lib/db";
import { useProfile } from "@/hooks/useCompact";
import { NotificationService } from "@/lib/notificationSound";
import { WhatsAppQueueService } from "@/lib/whatsappQueue";
import type { NotificationSettings } from "@/types";

interface AppSettings {
    categories: string[];
    defaultCategory: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const { profile } = useProfile();
    const [showProfileManager, setShowProfileManager] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);

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
    });

    const [whatsappQueue, setWhatsappQueue] = useState({ count: 0, items: [] });

    const [appSettings, setAppSettings] = useState<AppSettings>({
        categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances', 'Other'],
        defaultCategory: 'Electronics',
    });

    const [newCategory, setNewCategory] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);

    useEffect(() => {
        loadSettings();
        updateStorageInfo();
        loadWhatsAppQueue();
        setupInstallPrompt();
    }, []);

    const setupInstallPrompt = () => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        });
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert('App already installed or browser not supported');
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            alert('✅ App installing!');
        }

        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    const loadSettings = async () => {
        const savedNotifications = await db.getMeta<NotificationSettings>('notifications', {
            enableNotifications: true,
            paymentReminders: true,
            overdueAlerts: true,
            dailySummary: false,
            reminderTime: '09:00',
            soundEnabled: true,
        });

        setNotifications(savedNotifications);

        const savedAppSettings = await db.getMeta<AppSettings>('app_settings', {
            categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances', 'Other'],
            defaultCategory: 'Electronics',
        });
        setAppSettings(savedAppSettings);
    };

    const updateStorageInfo = async () => {
        const [customerCount, paymentCount, size] = await Promise.all([
            db.customers.count(),
            db.payments.count(),
            db.getStorageSize(),
        ]);

        const sizeKB = Math.round(size / 1024);
        const sizeMB = (size / (1024 * 1024)).toFixed(2);

        setStorageInfo({
            customers: customerCount,
            payments: paymentCount,
            sizePretty: sizeMB + ' MB',
        });
    };

    const loadWhatsAppQueue = async () => {
        const status = await WhatsAppQueueService.getQueueStatus();
        setWhatsappQueue(status);
    };

    const handleNotificationToggle = async (key: keyof NotificationSettings) => {
        const updated = { ...notifications, [key]: !notifications[key] };
        setNotifications(updated);
        await db.setMeta("notifications", updated);

        if (key === 'enableNotifications' && updated.enableNotifications) {
            await NotificationService.requestPermission();
        }
    };

    const testNotification = async () => {
        if (!notifications.enableNotifications) {
            alert('Enable notifications first');
            return;
        }

        const granted = await NotificationService.requestPermission();
        if (granted) {
            await NotificationService.send(
                'Test Notification 🔔',
                'Notifications working!',
                { sound: 'notification' }
            );
        } else {
            alert('⚠️ Notifications blocked. Enable in browser settings.');
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim() || appSettings.categories.includes(newCategory.trim())) {
            alert(newCategory.trim() ? 'Category exists' : 'Enter name');
            return;
        }

        const updated = {
            ...appSettings,
            categories: [...appSettings.categories, newCategory.trim()],
        };

        setAppSettings(updated);
        await db.setMeta('app_settings', updated);
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
        await db.setMeta('app_settings', updated);
    };

    const handleSetDefaultCategory = async (category: string) => {
        const updated = { ...appSettings, defaultCategory: category };
        setAppSettings(updated);
        await db.setMeta('app_settings', updated);
    };

    const handleProcessWhatsAppQueue = async () => {
        await WhatsAppQueueService.processQueue();
        await loadWhatsAppQueue();
        alert('✅ Queue processed!');
    };

    const handleClearFailedMessages = async () => {
        const count = await WhatsAppQueueService.clearFailedMessages();
        await loadWhatsAppQueue();
        alert(`🗑️ Cleared ${count} failed messages`);
    };

    const handleVacuum = async () => {
        if (!confirm('Optimize database?')) return;

        const [customers, payments] = await Promise.all([
            db.customers.toArray(),
            db.payments.toArray(),
        ]);

        await db.transaction('rw', [db.customers, db.payments], async () => {
            await db.customers.clear();
            await db.payments.clear();
            await db.customers.bulkAdd(customers);
            await db.payments.bulkAdd(payments);
        });

        await updateStorageInfo();
        alert('✅ Database optimized!');
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
        alert("✅ Data exported!");
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
                    alert("✅ Data imported!");
                    window.location.reload();
                } else {
                    alert("❌ Import failed!");
                }
            } catch {
                alert("❌ Invalid backup file!");
            }
        };

        input.click();
    };

    const handleClearData = async () => {
        if (!confirm("Delete ALL data? Cannot be undone!")) return;
        if (!confirm("Last warning! PERMANENT action!")) return;

        await db.clearAll();
        alert("All data cleared");
        router.push("/");
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Settings" />

            <div className="pt-16 p-4 space-y-4">
                {isInstallable && (
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h3 className="font-bold mb-1 flex items-center gap-2">
                                    <Smartphone className="w-5 h-5" />
                                    Install App
                                </h3>
                                <p className="text-sm opacity-90">
                                    Install for offline use
                                </p>
                            </div>
                            <button
                                onClick={handleInstallClick}
                                className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50"
                            >
                                Install
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        Profile Management
                    </h3>
                    <button
                        onClick={() => setShowProfileManager(true)}
                        className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100"
                    >
                        Manage Profiles
                    </button>
                </div>

                {/* WhatsApp Queue Status */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        WhatsApp Queue ({whatsappQueue.count})
                    </h3>
                    <div className="space-y-2">
                        <button
                            onClick={handleProcessWhatsAppQueue}
                            className="w-full py-2.5 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100"
                        >
                            Process Queue Now
                        </button>
                        {whatsappQueue.count > 0 && (
                            <button
                                onClick={handleClearFailedMessages}
                                className="w-full py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                            >
                                Clear Failed Messages
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Management */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Tag className="w-5 h-5 text-purple-600" />
                            Categories
                        </h3>
                        <button
                            onClick={() => setShowAddCategory(true)}
                            className="text-sm text-purple-600 font-medium flex items-center gap-1"
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
                                    className="flex-1 px-3 py-2 border rounded-lg"
                                    autoFocus
                                />
                                <button onClick={handleAddCategory} className="px-4 py-2 bg-purple-600 text-white rounded-lg">
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
                            <span className="text-sm">Enable Notifications</span>
                            <input
                                type="checkbox"
                                checked={notifications.enableNotifications}
                                onChange={() => handleNotificationToggle("enableNotifications")}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                        </label>
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
                            <div className="flex items-center gap-2">
                                {notifications.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                <span className="text-sm">Sound</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.soundEnabled}
                                onChange={() => handleNotificationToggle("soundEnabled")}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                        </label>

                        <button
                            onClick={testNotification}
                            className="w-full py-2.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center justify-center gap-2"
                        >
                            <BellRing className="w-4 h-4" />
                            Test Notification
                        </button>
                    </div>
                </div>

                {/* Storage */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-orange-600" />
                        Storage
                    </h3>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Used</span>
                            <span className="font-semibold">{storageInfo.sizePretty}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Customers</span>
                            <span className="font-semibold">{storageInfo.customers}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Payments</span>
                            <span className="font-semibold">{storageInfo.payments}</span>
                        </div>

                        <button
                            onClick={handleVacuum}
                            className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
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
                            className="w-full py-3 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export Backup
                        </button>
                        <button
                            onClick={handleImportData}
                            className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 flex items-center justify-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Import Backup
                        </button>
                        <button
                            onClick={handleClearData}
                            className="w-full py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 flex items-center justify-center gap-2"
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
                            <span className="font-medium">2.0.0</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span>Storage</span>
                            <span className="font-medium">IndexedDB v2</span>
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