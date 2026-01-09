'use client';

import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CheckSquare, Clock, Settings } from 'lucide-react';

interface NavigationProps {
    currentPage?: string;
}

export default function Navigation({ currentPage }: NavigationProps) {
    const router = useRouter();
    const pathname = usePathname();

    const navItems = [
        { id: 'customers', icon: Users, label: 'Customers', path: '/customers' },
        { id: 'daily', icon: CheckSquare, label: 'Daily', path: '/daily' },
        { id: 'pending', icon: Clock, label: 'Pending', path: '/pending' },
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' }
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 bottom-nav"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
            <div className="flex justify-around items-center py-2 px-2 max-w-screen-xl mx-auto">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path || currentPage === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => router.push(item.path)}
                            className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all touch-feedback min-w-[64px] ${
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
    );
}