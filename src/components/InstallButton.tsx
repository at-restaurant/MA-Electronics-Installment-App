'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallButton = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (! deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt. userChoice;

        if (outcome === 'accepted') {
            setShowInstallButton(false);
            setDeferredPrompt(null);
        }
    };

    if (! showInstallButton) return null;

    return (
        <button
            onClick={handleInstall}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover: bg-purple-700"
        >
            <Download size={20} />
            Install App
        </button>
    );
};