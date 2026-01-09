'use client';

import { useAppStore } from '@/lib/store';
import { Bell, BellOff } from 'lucide-react';
import { useState } from 'react';

export const NotificationSettings = () => {
    const { settings, updateNotificationSettings } = useAppStore();
    const [showSettings, setShowSettings] = useState(false);

    const handleToggleNotifications = (enabled: boolean) => {
        updateNotificationSettings({
            ...settings. notificationSettings,
            enableNotifications: enabled,
        });
    };

    const handleTimingChange = (timing: 'before' | 'on' | 'after') => {
        updateNotificationSettings({
            ... settings.notificationSettings,
            notificationTiming: timing,
        });
    };

    const handleReminderDaysChange = (days: number) => {
        updateNotificationSettings({
            ... settings.notificationSettings,
            reminderDays: days,
        });
    };

    return (
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Payment Notifications
                </h3>
                <button
                    onClick={() => handleToggleNotifications(! settings.notificationSettings.enableNotifications)}
                    className={`rounded-lg p-2.5 transition-colors ${
                        settings.notificationSettings.enableNotifications
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                    aria-label="Toggle notifications"
                >
                    {settings.notificationSettings.enableNotifications ? (
                        <Bell size={20} />
                    ) : (
                        <BellOff size={20} />
                    )}
                </button>
            </div>

            {settings.notificationSettings.enableNotifications && (
                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Notification Timing
                        </label>
                        <div className="space-y-2">
                            {(['before', 'on', 'after'] as const).map((timing) => (
                                <label key={timing} className="flex items-center">
                                    <input
                                        type="radio"
                                        name="timing"
                                        value={timing}
                                        checked={settings.notificationSettings.notificationTiming === timing}
                                        onChange={() => handleTimingChange(timing)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                    {timing === 'before'
                        ? 'Before Due Date'
                        : timing === 'on'
                            ? 'On Due Date'
                            : 'After Due Date'}
                  </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark: text-gray-300">
                            Remind Me {settings.notificationSettings.reminderDays} Days Before
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="14"
                            value={settings.notificationSettings.reminderDays}
                            onChange={(e) => handleReminderDaysChange(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};