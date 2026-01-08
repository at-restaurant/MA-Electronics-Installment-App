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
        { id: 'dashboard', icon: LayoutDashboard, label: 'Home', path: '/' },
        { id: 'customers', icon: Users, label: 'Customers', path: '/customers' },
        { id: 'daily', icon: CheckSquare, label: 'Daily', path: '/daily' },
        { id: 'pending', icon: Clock, label: 'Pending', path: '/pending' },
        { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
            <div className="flex justify-around items-center py-2 px-2">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path || currentPage === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => router.push(item.path)}
                            className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
                                isActive
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'text-gray-500 active:bg-gray-100'
                            }`}
                        >
                            <Icon className="w-6 h-6" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}