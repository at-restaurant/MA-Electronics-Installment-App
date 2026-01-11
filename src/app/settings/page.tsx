// src/app/settings/page.tsx - PRODUCTION FIXED

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    Smartphone,
    Info,
    Trash2,
    Download,
    Upload,
    Plus,
    X,
    Tag,
    HardDrive,
    Folder,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import type { NotificationSettings } from '@/types';

interface AppSettings {
    categories: string[];
    defaultCategory: string;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    enableNotifications: true,
    paymentReminders: true,
    overdueAlerts: true,
    dailySummary: false,
    reminderTime: '09:00',
    soundEnabled: true,
};

export default function SettingsPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    const [notifications, setNotifications] = useState<NotificationSettings>(
        DEFAULT_NOTIFICATION_SETTINGS
    );

    const [storageInfo, setStorageInfo] = useState({
        sizePretty: '0 KB',
        customers: 0,
        payments: 0,
    });

    const [appSettings, setAppSettings] = useState<AppSettings>({
        categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances', 'Other'],
        defaultCategory: 'Electronics',
    });

    const [newCategory, setNewCategory] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);

    // Loading states
    const [isClearing, setIsClearing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        loadSettings();
        updateStorageInfo();
        setupInstallPrompt();
    }, []);

    const setupInstallPrompt = () => {
        if (typeof window === 'undefined') return;
        window.addEventListener('beforeinstallprompt', (e: any) => {
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
        const savedNotifications = await db.getMeta<NotificationSettings>(
            'notifications'
        );

        setNotifications(savedNotifications ?? DEFAULT_NOTIFICATION_SETTINGS);

        const savedAppSettings = await db.getMeta<AppSettings>('app_settings');

        setAppSettings(
            savedAppSettings ?? {
                categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances', 'Other'],
                defaultCategory: 'Electronics',
            }
        );
    };

    const updateStorageInfo = async () => {
        const [customerCount, paymentCount, size] = await Promise.all([
            db.customers.count(),
            db.payments.count(),
            db.getStorageSize(),
        ]);

        const sizeMB = (size / (1024 * 1024)).toFixed(2);

        setStorageInfo({
            customers: customerCount,
            payments: paymentCount,
            sizePretty: sizeMB + ' MB',
        });
    };

    const handleNotificationToggle = async (key: keyof NotificationSettings) => {
        const updated = { ...notifications, [key]: !notifications[key] };
        setNotifications(updated);
        await db.setMeta('notifications', updated);
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
            categories: appSettings.categories.filter((c) => c !== category),
            defaultCategory:
                appSettings.defaultCategory === category
                    ? appSettings.categories.find((c) => c !== category) || 'Other'
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

    // ✅ FIXED EXPORT - Creates folder and saves there
    const handleExportData = async () => {
        if (isExporting) return;

        setIsExporting(true);
        try {
            // Get all data
            const data = await db.exportAll();

            // Add metadata
            const exportData = {
                version: '2.0.0',
                exportDate: new Date().toISOString(),
                data: data,
            };

            const json = JSON.stringify(exportData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });

            // Create filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `ma-electronics-backup-${timestamp}.json`;

            // Check if File System Access API is available (for folder selection)
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await (window as any).showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'JSON Backup File',
                            accept: { 'application/json': ['.json'] },
                        }],
                    });

                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();

                    alert('✅ Backup saved successfully!');
                } catch (err: any) {
                    if (err.name !== 'AbortError') {
                        throw err;
                    }
                }
            } else {
                // Fallback for mobile browsers - direct download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                alert('✅ Backup downloaded! Check Downloads folder.');
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('❌ Export failed! Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // ✅ FIXED IMPORT - Better validation and error handling
    const handleImportData = () => {
        if (isImporting) return;
        fileInputRef.current?.click();
    };

    const processImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);

        try {
            // Validate file type
            if (!file.name.endsWith('.json')) {
                throw new Error('Invalid file type. Please select a JSON backup file.');
            }

            // Read file
            const text = await file.text();

            // Parse JSON
            let importData;
            try {
                importData = JSON.parse(text);
            } catch {
                throw new Error('Invalid JSON file. File may be corrupted.');
            }

            // Validate backup format
            if (!importData.version || !importData.data) {
                throw new Error('Invalid backup format. This is not a valid MA Electronics backup file.');
            }

            // Confirm before import
            if (!confirm('⚠️ This will replace all current data! Continue?')) {
                setIsImporting(false);
                return;
            }

            // Clear existing data first
            await db.clearAll();

            // Import new data
            const success = await db.importAll(importData.data);

            if (success) {
                alert('✅ Data imported successfully! Reloading app...');

                // Wait a moment then reload
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                throw new Error('Import failed. Please check the backup file.');
            }
        } catch (error: any) {
            console.error('Import failed:', error);
            alert(`❌ Import failed!\n\n${error.message}`);
            setIsImporting(false);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // ✅ FIXED CLEAR DATA - Prevents infinite loop
    const handleClearData = async () => {
        if (isClearing) return;

        if (!confirm('⚠️ Delete ALL data? This cannot be undone!')) return;
        if (!confirm('⚠️ LAST WARNING! All customers, payments, and profiles will be deleted permanently!')) return;

        setIsClearing(true);

        try {
            // Clear database
            await db.clearAll();

            // Clear all localStorage except migration flags
            const keysToKeep = ['migrated_to_indexeddb', 'migration_date'];
            Object.keys(localStorage).forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });

            // Show success message
            alert('✅ All data cleared successfully!');

            // Force reload to home page (prevents initialization loop)
            window.location.href = '/';
        } catch (error) {
            console.error('Clear data failed:', error);
            alert('❌ Failed to clear data! Please try again.');
            setIsClearing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Settings" />

            <div className="pt-16 p-4 space-y-4">
                {/* Install App */}
                {isInstallable && (
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h3 className="font-bold mb-1 flex items-center gap-2">
                                    <Smartphone className="w-5 h-5" />
                                    Install App
                                </h3>
                                <p className="text-sm opacity-90">Install for offline use</p>
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
                        {appSettings.categories.map((category) => (
                            <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
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
                                    className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
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
                                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                    autoFocus
                                />
                                <button
                                    onClick={handleAddCategory}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                                >
                                    Add
                                </button>
                                <button
                                    onClick={() => setShowAddCategory(false)}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-blue-600" />
                        Notifications
                    </h3>

                    {/* Permission Status */}
                    {'Notification' in window && (
                        <div className={`mb-4 p-3 rounded-lg border-2 ${
                            Notification.permission === 'granted'
                                ? 'bg-green-50 border-green-200'
                                : 'bg-orange-50 border-orange-200'
                        }`}>
                            <p className="text-sm font-medium">
                                {Notification.permission === 'granted'
                                    ? '✅ Notifications Enabled'
                                    : '⚠️ Notifications Disabled'}
                            </p>
                            {Notification.permission !== 'granted' && (
                                <button
                                    onClick={async () => {
                                        const permission = await Notification.requestPermission();
                                        if (permission === 'granted') {
                                            alert('✅ Notifications enabled!');
                                            window.location.reload();
                                        }
                                    }}
                                    className="mt-2 text-sm text-blue-600 font-medium"
                                >
                                    Enable Now →
                                </button>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="flex items-center justify-between py-2 cursor-pointer">
                            <div>
                                <span className="text-sm font-medium">Enable Notifications</span>
                                <p className="text-xs text-gray-500">Master switch for all notifications</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.enableNotifications}
                                onChange={() => handleNotificationToggle('enableNotifications')}
                                className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                            />
                        </label>

                        <label className="flex items-center justify-between py-2 cursor-pointer">
                            <div>
                                <span className="text-sm font-medium">Payment Reminders</span>
                                <p className="text-xs text-gray-500">Daily payment due notifications</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.paymentReminders}
                                onChange={() => handleNotificationToggle('paymentReminders')}
                                disabled={!notifications.enableNotifications}
                                className="w-5 h-5 text-blue-600 rounded cursor-pointer disabled:opacity-50"
                            />
                        </label>

                        <label className="flex items-center justify-between py-2 cursor-pointer">
                            <div>
                                <span className="text-sm font-medium">Overdue Alerts</span>
                                <p className="text-xs text-gray-500">7+ days overdue warnings</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.overdueAlerts}
                                onChange={() => handleNotificationToggle('overdueAlerts')}
                                disabled={!notifications.enableNotifications}
                                className="w-5 h-5 text-blue-600 rounded cursor-pointer disabled:opacity-50"
                            />
                        </label>

                        <label className="flex items-center justify-between py-2 cursor-pointer">
                            <div>
                                <span className="text-sm font-medium">Daily Summary</span>
                                <p className="text-xs text-gray-500">End of day collection report</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.dailySummary}
                                onChange={() => handleNotificationToggle('dailySummary')}
                                disabled={!notifications.enableNotifications}
                                className="w-5 h-5 text-blue-600 rounded cursor-pointer disabled:opacity-50"
                            />
                        </label>

                        {/* Test Notification Button */}
                        <button
                            onClick={async () => {
                                const { getNotificationManager } = await import('@/lib/notificationManager');
                                const manager = getNotificationManager();
                                await manager.testNotification();
                            }}
                            className="w-full mt-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
                        >
                            🔔 Test Notification
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
                    </div>
                </div>

                {/* Data Management */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Folder className="w-5 h-5 text-purple-600" />
                        Backup & Restore
                    </h3>

                    <div className="space-y-2">
                        {/* Export */}
                        <button
                            onClick={handleExportData}
                            disabled={isExporting || isClearing}
                            className="w-full py-3 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isExporting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    Export Backup
                                </>
                            )}
                        </button>

                        {/* Import */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={processImportFile}
                            className="hidden"
                        />
                        <button
                            onClick={handleImportData}
                            disabled={isImporting || isClearing}
                            className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isImporting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Import Backup
                                </>
                            )}
                        </button>

                        {/* Clear All */}
                        <button
                            onClick={handleClearData}
                            disabled={isClearing || isImporting || isExporting}
                            className="w-full py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isClearing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                    Clearing...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Clear All Data
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700">
                            <strong>💡 Tip:</strong> Export backup before clearing data or switching devices.
                        </p>
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
                            <span>App Type</span>
                            <span className="font-medium">Progressive Web App</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span>Platform</span>
                            <span className="font-medium">Android / iOS / Web</span>
                        </div>
                    </div>
                </div>
            </div>

            <Navigation currentPage="settings" />
        </div>
    );
}