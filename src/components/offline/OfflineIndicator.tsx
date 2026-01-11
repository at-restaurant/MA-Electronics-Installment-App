// src/components/offline/OfflineIndicator.tsx - FIXED (Shows once, then disappears)
'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowBanner(true);

            // Hide after 3 seconds
            setTimeout(() => setShowBanner(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);

            // Hide after 5 seconds
            setTimeout(() => setShowBanner(false), 5000);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Only show when banner is active
    if (!showBanner) return null;

    return (
        <div
            className={`fixed top-0 left-0 right-0 px-4 py-3 text-center text-sm font-medium z-50 transition-all animate-slide-down ${
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
                        <span>✅ Back Online - All data is synced</span>
                    </>
                ) : (
                    <>
                        <WifiOff className="w-4 h-4 animate-pulse" />
                        <span>📡 Offline - Changes saved locally</span>
                    </>
                )}
            </div>

            <style jsx>{`
                @keyframes slide-down {
                    from {
                        transform: translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-down {
                    animation: slide-down 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}