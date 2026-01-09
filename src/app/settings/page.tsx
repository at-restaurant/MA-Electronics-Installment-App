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
  LogOut,
  Trash2,
  Download,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Storage } from "@/lib/storage";

export default function SettingsPage() {
  const router = useRouter();
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState({
    paymentReminders: true,
    overdueAlerts: true,
    dailySummary: false,
  });

  useEffect(() => {
    const profile = Storage.get("currentProfile");
    if (!profile) {
      router.push("/");
      return;
    }

    setCurrentProfile(profile);

    // Load settings
    const savedTheme = Storage.get("theme", "light");
    const savedNotifications = Storage.get("notifications", {
      paymentReminders: true,
      overdueAlerts: true,
      dailySummary: false,
    });

    setTheme(savedTheme);
    setNotifications(savedNotifications);
  }, [router]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    Storage.save("theme", newTheme);
  };

  const handleNotificationToggle = (key: string) => {
    const updated = {
      ...notifications,
      [key]: !notifications[key as keyof typeof notifications],
    };
    setNotifications(updated);
    Storage.save("notifications", updated);
  };

  const handleSwitchProfile = () => {
    Storage.remove("currentProfile");
    router.push("/");
  };

  const handleExportData = () => {
    const customers = Storage.get("customers", []);
    const payments = Storage.get("payments", []);

    const data = {
      customers,
      payments,
      exportDate: new Date().toISOString(),
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
            <User className="w-5 h-5 text-blue-600" />
            Profile
          </h3>
          <button
            onClick={handleSwitchProfile}
            className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
          >
            Switch Profile
          </button>
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

      <Navigation currentPage="settings" />
    </div>
  );
}
