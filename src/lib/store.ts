import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, NotificationSettings } from '@/types';

interface AppState {
  settings: AppSettings;
  isOnline: boolean;
  updateTheme: (theme: 'light' | 'dark') => void;
  updateNotificationSettings:  (settings: NotificationSettings) => void;
  setOnlineStatus: (isOnline: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings:  {
        theme: 'light',
        notificationSettings: {
          enableNotifications: true,
          notificationTiming: 'before',
          reminderDays: 3,
        },
        offlineSyncPending: false,
      },
      isOnline: typeof window !== 'undefined' ?  navigator.onLine : true,

      updateTheme:  (theme) =>
        set((state) => ({
          settings: { ...state.settings, theme },
        })),

      updateNotificationSettings: (notificationSettings) =>
        set((state) => ({
          settings:  { ...state.settings, notificationSettings },
        })),

      setOnlineStatus: (isOnline) => set({ isOnline }),
    }),
    {
      name: 'app-settings-storage',
    }
  )
);