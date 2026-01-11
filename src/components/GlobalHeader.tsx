// src/components/GlobalHeader.tsx - Universal Header with Profile Switcher
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Menu } from 'lucide-react';
import { Storage } from '@/lib/storage';
import type { Profile } from '@/types';

interface GlobalHeaderProps {
    title?: string;
    showProfileSwitcher?: boolean;
    showMenu?: boolean;
    rightAction?: React.ReactNode;
}

export default function GlobalHeader({
                                         title,
                                         showProfileSwitcher = true,
                                         showMenu = false,
                                         rightAction
                                     }: GlobalHeaderProps) {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const current = await Storage.get<Profile | null>('currentProfile', null);
        const all = await Storage.get<Profile[]>('profiles', []);

        setProfile(current);
        setProfiles(all);
    };

    const switchProfile = async (newProfile: Profile) => {
        await Storage.save('currentProfile', newProfile);
        setProfile(newProfile);
        setShowDropdown(false);
        window.location.reload();
    };

    const getGradient = (gradient: string) => {
        return `bg-gradient-to-br ${gradient}`;
    };

    return (
        <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Left: Title or Menu */}
                <div className="flex items-center gap-3">
                    {showMenu && (
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                            <Menu className="w-5 h-5" />
                        </button>
                    )}
                    {title && <h1 className="text-lg font-bold">{title}</h1>}
                </div>

                {/* Center: Profile Switcher */}
                {showProfileSwitcher && profile && (
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <div className={`w-6 h-6 rounded-full ${getGradient(profile.gradient)} flex items-center justify-center text-white text-xs font-bold`}>
                                {profile.name[0]}
                            </div>
                            <span className="font-medium text-sm max-w-[120px] truncate">
                {profile.name}
              </span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown */}
                        {showDropdown && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowDropdown(false)}
                                />
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                                    {profiles.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => switchProfile(p)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                                                p.id === profile.id ? 'bg-blue-50' : ''
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full ${getGradient(p.gradient)} flex items-center justify-center text-white text-sm font-bold`}>
                                                {p.name[0]}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className={`font-medium text-sm ${p.id === profile.id ? 'text-blue-600' : ''}`}>
                                                    {p.name}
                                                </p>
                                                <p className="text-xs text-gray-500">{p.description}</p>
                                            </div>
                                            {p.id === profile.id && (
                                                <div className="w-2 h-2 rounded-full bg-blue-600" />
                                            )}
                                        </button>
                                    ))}

                                    <div className="border-t border-gray-200">
                                        <button
                                            onClick={() => router.push('/settings')}
                                            className="w-full px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors text-left font-medium"
                                        >
                                            Manage Profiles
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Right: Custom Action */}
                {rightAction && <div>{rightAction}</div>}
            </div>
        </header>
    );
}