// src/app/auth/callback/page.tsx - OAuth Callback Handler

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Cloud, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { driveManager } from '@/lib/driveManager';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Connecting to Google Drive...');

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            setStatus('error');
            setMessage('Authorization cancelled or failed');
            setTimeout(() => router.push('/drive'), 3000);
            return;
        }

        if (!code) {
            setStatus('error');
            setMessage('No authorization code received');
            setTimeout(() => router.push('/drive'), 3000);
            return;
        }

        try {
            setMessage('Exchanging authorization code...');

            const success = await driveManager.addAccount(code);

            if (success) {
                setStatus('success');
                setMessage('Google Drive connected successfully!');

                // Start first backup
                setTimeout(async () => {
                    setMessage('Creating first backup...');
                    await driveManager.autoBackup();
                    setMessage('Backup complete! Redirecting...');

                    setTimeout(() => {
                        router.push('/drive');
                    }, 2000);
                }, 1000);
            } else {
                setStatus('error');
                setMessage('Failed to connect account. It may already be connected.');
                setTimeout(() => router.push('/drive'), 3000);
            }
        } catch (error) {
            console.error('Callback error:', error);
            setStatus('error');
            setMessage('An error occurred during authorization');
            setTimeout(() => router.push('/drive'), 3000);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                <div className="mb-6">
                    {status === 'processing' && (
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-10 h-10 text-red-600" />
                        </div>
                    )}
                </div>

                <h2 className="text-2xl font-bold mb-2">
                    {status === 'processing' && 'Connecting...'}
                    {status === 'success' && 'Success!'}
                    {status === 'error' && 'Error'}
                </h2>

                <p className="text-gray-600 mb-6">{message}</p>

                {status === 'processing' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Cloud className="w-4 h-4" />
                        <span>Please wait...</span>
                    </div>
                )}

                {status !== 'processing' && (
                    <button
                        onClick={() => router.push('/drive')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        Go to Drive Settings
                    </button>
                )}
            </div>
        </div>
    );
}