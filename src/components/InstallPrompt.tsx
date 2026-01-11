// src/components/InstallPrompt.tsx - Mobile Install Popup
'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        if (isInstalled) return;

        // Check if user already dismissed
        const dismissed = localStorage.getItem('install_prompt_dismissed');
        if (dismissed) return;

        // Listen for install prompt
        const handleBeforeInstall = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Show popup after 3 seconds
            setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('✅ App installed');
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('install_prompt_dismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up">
                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Download className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Install MA Electronics App
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        📱 <strong>Offline Access</strong> - Bina internet ke kaam karen<br/>
                        ⚡ <strong>Fast & Secure</strong> - Data phone mein save<br/>
                        🏠 <strong>Home Screen</strong> - Quick access
                    </p>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleInstall}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        Install App
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors active:scale-95"
                    >
                        Maybe Later
                    </button>
                </div>

                {/* Info */}
                <p className="text-xs text-gray-500 text-center mt-4">
                    💾 0 MB storage • Works offline • Free forever
                </p>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
                .animate-slide-up {
                    animation: slide-up 0.4s ease-out;
                }
            `}</style>
        </div>
    );
}