// src/components/NotificationInitializer.tsx - PRODUCTION READY

'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { getNotificationManager } from '@/lib/notificationManager';

export function NotificationInitializer() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        initializeNotifications();
    }, []);

    const initializeNotifications = async () => {
        try {
            const manager = getNotificationManager();
            const hasPermission = await manager.requestPermission();

            if (!hasPermission && !initialized) {
                // Show prompt after 5 seconds
                setTimeout(() => {
                    setShowPrompt(true);
                }, 5000);
            }

            setInitialized(true);
        } catch (error) {
            console.error('Failed to initialize notifications:', error);
        }
    };

    const handleEnableNotifications = async () => {
        try {
            const manager = getNotificationManager();
            const granted = await manager.requestPermission();

            if (granted) {
                await manager.sendNotification('Notifications Enabled! 🔔', {
                    body: 'You will now receive payment reminders and alerts.',
                    tag: 'notification-enabled',
                });
                setShowPrompt(false);
            } else {
                alert('⚠️ Please enable notifications in your browser settings.');
            }
        } catch (error) {
            console.error('Error enabling notifications:', error);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Don't ask again for 7 days
        localStorage.setItem('notification_dismissed', Date.now().toString());
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-4 border-l-4 border-blue-500 animate-slide-up">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                            <Bell className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">Enable Notifications?</h3>
                            <p className="text-sm text-gray-600">
                                Get reminders for payment due dates and overdue alerts.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={handleEnableNotifications}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        Enable
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
}