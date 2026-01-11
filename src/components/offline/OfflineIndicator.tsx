// src/components/offline/OfflineIndicator.tsx
'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Initial check
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowBanner(true);

            // Hide success banner after 3 seconds
            setTimeout(() => setShowBanner(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Don't show banner if online and not just reconnected
    if (isOnline && !showBanner) return null;

    return (
        <div
            className={`fixed top-0 left-0 right-0 px-4 py-3 text-center text-sm font-medium z-50 transition-all ${
                isOnline
                    ? 'bg-green-500 text-white'
                    : 'bg-orange-500 text-white'
            }`}
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
            <div className="flex items-center justify-center gap-2">
                {isOnline ? (
                    <>
                        <Wifi className="w-4 h-4" />
                        <span>✅ آن لائن - تمام ڈیٹا محفوظ ہے</span>
                    </>
                ) : (
                    <>
                        <WifiOff className="w-4 h-4 animate-pulse" />
                        <span>📡 آف لائن - تمام تبدیلیاں لوکل محفوظ ہیں</span>
                    </>
                )}
            </div>
        </div>
    );
}