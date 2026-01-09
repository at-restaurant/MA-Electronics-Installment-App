"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Settings as SettingsIcon,
    User,
    Bell,
    Moon,
    Sun,
    Smartphone,
    HelpCircle,
    Info,
    Trash2,
    Download,
    Briefcase,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import ProfileManager from "@/components/ProfileManager";
import { Storage } from "@/lib/storage";
import type { Profile, Customer, Payment } from "@/types";

interface NotificationSettings {
    paymentReminders: boolean;
    overdueAlerts: boolean;
    dailySummary: boolean;
}

export default function SettingsPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [theme, setTheme] = useState("light");
    const [showProfileManager, setShowProfileManager] = useState(false);
    const [notifications, setNotifications] = useState<NotificationSettings>({
        paymentReminders: true,
        overdueAlerts: true,
        dailySummary: false,
    });
    const [storageInfo, setStorageInfo] = useState({ size: '0 KB', percentage: 0 });

    useEffect(() => {
        loadSettings();
        updateStorageInfo();
    }, []);

    const loadSettings = () => {
        const profile = Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }

        setCurrentProfile(profile);

        // Load settings with safe defaults
        const savedTheme = Storage.get<string>("theme", "light");
        const savedNotifications = Storage.get<NotificationSettings>("notifications", {
            paymentReminders: true,
            overdueAlerts: true,
            dailySummary: false,
        });

        setTheme(savedTheme);
        setNotifications(savedNotifications);
    };

    const updateStorageInfo = () => {
        const size = Storage.getSizeFormatted();
        const percentage = Storage.getUsagePercentage();
        setStorageInfo({ size, percentage });
    };

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        Storage.save("theme", newTheme);
    };

    const handleNotificationToggle = (key: keyof NotificationSettings) => {
        const updated = {
            ...notifications,
            [key]: !notifications[key],
        };
        setNotifications(updated);
        Storage.save("notifications", updated);
    };

    const handleExportData = () => {
        const customers = Storage.get<Customer[]>("customers", []);
        const payments = Storage.get<Payment[]>("payments", []);
        const profiles = Storage.get<Profile[]>("profiles", []);

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
        a.download = `ma-installment-backup-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        alert("Data exported successfully!");
    };

    const handleClearData = () => {
        if (
            !confirm("Are you sure? This will delete ALL data and cannot be undone!")
        )
            return;

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
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4">
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-gray-600 mt-1">{currentProfile?.name}</p>
            </div>

            <div className="p-4 space-y-4">
                {/* Profile Section */}
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
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        Create multiple profiles for different businesses
                    </p>
                </div>

                {/* Theme Section */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        {theme === "light" ? (
                            <Sun className="w-5 h-5 text-amber-500" />
                        ) : (
                            <Moon className="w-5 h-5 text-indigo-500" />
                        )}
                        Appearance
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleThemeChange("light")}
                            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                                theme === "light" ? "bg-blue-600 text-white" : "bg-gray-100"
                            }`}
                        >
                            <Sun className="w-5 h-5 mx-auto mb-1" />
                            Light
                        </button>
                        <button
                            onClick={() => handleThemeChange("dark")}
                            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                                theme === "dark" ? "bg-blue-600 text-white" : "bg-gray-100"
                            }`}
                        >
                            <Moon className="w-5 h-5 mx-auto mb-1" />
                            Dark
                        </button>
                    </div>
                </div>

                {/* Notifications Section */}
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

                {/* Storage Info */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
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
                            Export Data (Backup)
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
                            <span>App Name</span>
                            <span className="font-medium">MA Installment App</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span>Developer</span>
                            <span className="font-medium">Your Company</span>
                        </div>
                    </div>
                </div>

                {/* Help */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                        <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-blue-900 mb-1">Need Help?</p>
                            <p className="text-sm text-blue-700">
                                Contact support or check our documentation for assistance.
                            </p>
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