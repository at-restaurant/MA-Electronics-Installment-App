'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { notificationManager } from '@/lib/notificationManager';

export function NotificationInitializer() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Check if we should show notification prompt
    const checkNotificationStatus = async () => {
      if (hasChecked) return;

      setHasChecked(true);

      if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
      }

      const permission = Notification.permission;
      const hasAsked = localStorage.getItem('notification-prompt-shown');

      // Show prompt if permission is default and we haven't asked before
      if (permission === 'default' && !hasAsked) {
        // Wait 5 seconds before showing prompt (better UX)
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }

      // If permission is granted, start scheduled checks
      if (permission === 'granted') {
        await notificationManager.scheduleDailyChecks();
      }
    };

    checkNotificationStatus();
  }, [hasChecked]);

  const handleEnableNotifications = async () => {
    const granted = await notificationManager.requestPermission();

    if (granted) {
      // Start scheduled checks
      await notificationManager.scheduleDailyChecks();

      // Show welcome notification
      await notificationManager.sendNotification(
        '🔔 Notifications Enabled',
        {
          body: 'You will now receive payment reminders and alerts.',
        }
      );
    }

    localStorage.setItem('notification-prompt-shown', 'true');
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('notification-prompt-shown', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">
              Enable Notifications
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Get timely reminders for customer payments and overdue alerts.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleEnableNotifications}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                Enable
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                Later
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}