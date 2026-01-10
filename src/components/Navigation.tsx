// src/components/Navigation.tsx - COMPLETE with All Pages
'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
    LayoutDashboard, Users, CheckSquare, Clock,
    TrendingUp, Cloud, Settings, Menu
} from 'lucide-react';
import { useState } from 'react';

interface NavigationProps {
    currentPage?: string;
}

export default function Navigation({ currentPage }: NavigationProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [showMore, setShowMore] = useState(false);

    // ✅ PRIMARY NAVIGATION (Always visible)
    const primaryNav = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
        { id: 'customers', icon: Users, label: 'Customers', path: '/customers' },
        { id: 'daily', icon: CheckSquare, label: 'Daily', path: '/daily' },
        { id: 'pending', icon: Clock, label: 'Pending', path: '/pending' },
        { id: 'more', icon: Menu, label: 'More', path: '#', action: () => setShowMore(!showMore) },
    ];

    // ✅ SECONDARY NAVIGATION (In "More" menu)
    const secondaryNav = [
        { id: 'analytics', icon: TrendingUp, label: 'Analytics', path: '/analytics' },
        { id: 'backup', icon: Cloud, label: 'Backup', path: '/backup' },
        { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <>
            {/* More Menu Overlay */}
            {showMore && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setShowMore(false)}
                    />
                    <div className="fixed bottom-20 right-4 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-200">
                        {secondaryNav.map(item => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path || currentPage === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        router.push(item.path);
                                        setShowMore(false);
                                    }}
                                    className={`flex items-center gap-3 w-full px-6 py-4 hover:bg-gray-50 transition-colors ${
                                        isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Bottom Navigation */}
            <nav
                className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40"
                style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
            >
                <div className="flex justify-around items-center py-2 px-2 max-w-screen-xl mx-auto">
                    {primaryNav.map(item => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || currentPage === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.action) {
                                        item.action();
                                    } else {
                                        router.push(item.path);
                                    }
                                }}
                                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all min-w-[64px] ${
                                    isActive
                                        ? 'text-blue-600 bg-blue-50'
                                        : 'text-gray-500 active:bg-gray-100'
                                }`}
                                aria-label={item.label}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-xs font-medium leading-none">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}