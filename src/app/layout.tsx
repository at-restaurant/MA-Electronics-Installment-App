// src/app/layout.tsx - WITH NOTIFICATIONS ENABLED

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/app/globals.css';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';
import { DatabaseInitializer } from '@/components/DatabaseInitializer';
import { InstallPrompt } from '@/components/InstallPrompt';
import { NotificationInitializer } from '@/components/NotificationInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'MA Electronics Installment',
    description: 'Offline-first installment management system',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'MA Electronics',
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        icon: '/favicon.ico',
        apple: '/icon-192x192.png',
    },
};

export const viewport: Viewport = {
    themeColor: '#0284c7',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <link rel="apple-touch-icon" href="/icon-192x192.png" />
        </head>
        <body className={inter.className}>
        {/* Initialize database and run migrations */}
        <DatabaseInitializer />

        {/* Show offline/online status */}
        <OfflineIndicator />

        {/* Notification system */}
        <NotificationInitializer />

        {/* App content */}
        {children}

        {/* Install prompt */}
        <InstallPrompt />

        {/* Service Worker Registration */}
        <script
            dangerouslySetInnerHTML={{
                __html: `
              // Service Worker registration
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => {
                      console.log('✅ Service Worker registered:', reg.scope);
                      
                      reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechanged', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              if (confirm('🔄 New version available! Update now?')) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                window.location.reload();
                              }
                            }
                          });
                        }
                      });
                    })
                    .catch(err => {
                      console.log('❌ Service Worker registration failed:', err);
                    });
                });
              }
              
              // Initialize notification scheduler
              if ('Notification' in window) {
                import('/src/lib/notificationScheduler.js').then(module => {
                  module.NotificationScheduler.start();
                });
              }
            `,
            }}
        />
        </body>
        </html>
    );
}