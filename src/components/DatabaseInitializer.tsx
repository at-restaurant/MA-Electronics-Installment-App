// src/components/DatabaseInitializer.tsx
'use client';

import { useEffect, useState } from 'react';
import { runMigrations } from '@/lib/db/migrations';
import { initDatabase } from '@/lib/db';

export function DatabaseInitializer() {
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function initialize() {
            try {
                console.log('🚀 Initializing database...');

                // Initialize IndexedDB
                const dbReady = await initDatabase();

                if (!dbReady) {
                    throw new Error('Database initialization failed');
                }

                // Run migrations from localStorage
                await runMigrations();

                console.log('✅ Database ready');
                setIsInitializing(false);
            } catch (err) {
                console.error('❌ Database initialization error:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setIsInitializing(false);
            }
        }

        initialize();
    }, []);

    // Show loading screen while initializing
    if (isInitializing) {
        return (
            <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Initializing...</p>
                </div>
            </div>
        );
    }

    // Show error if initialization failed
    if (error) {
        return (
            <div className="fixed inset-0 bg-red-50 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md text-center shadow-xl">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">❌</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Database Error
                    </h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Return null when ready - children will render
    return null;
}