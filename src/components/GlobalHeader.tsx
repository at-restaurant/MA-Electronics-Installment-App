'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Menu, Plus } from 'lucide-react';
import { db } from '@/lib/db';
import type { Profile } from '@/types';

interface GlobalHeaderProps {
    title? :  string;
    showProfileSwitcher?:  boolean;
    showMenu?: boolean;
    rightAction?: React.ReactNode;
}

export default function GlobalHeader({
                                         title,
                                         showProfileSwitcher = true,
                                         showMenu = false,
                                         rightAction,
                                     }: GlobalHeaderProps) {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProfile, setNewProfile] = useState({ name: '', description: '', gradient: 'from-blue-500 to-purple-500' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const current = await db.getMeta<Profile | null>('currentProfile');
            if (current) {
                setProfile(current);
            }

            const all = await db.profiles.toArray();
            setProfiles(all);

            if (! current && all.length > 0) {
                setProfile(all[0]);
                await db.setMeta('currentProfile', all[0]);
            }
        } catch (error) {
            console.error('Failed to load profiles:', error);
        }
    };

    const switchProfile = async (selectedProfile: Profile) => {
        try {
            await db.setMeta('currentProfile', selectedProfile);
            setProfile(selectedProfile);
            setShowDropdown(false);
            window.location.reload();
        } catch (error) {
            console.error('Failed to switch profile:', error);
            alert('Failed to switch profile');
        }
    };

    const handleAddProfile = async () => {
        if (!newProfile.name.trim()) {
            alert('Enter profile name');
            return;
        }

        try {
            const createdProfile: Profile = {
                id: Date.now(),
                name: newProfile.name,
                description: newProfile.description,
                gradient: newProfile.gradient,
                createdAt: new Date().toISOString(),
                totalInvestment: 0,
                investmentHistory: [],
            };

            await db.profiles.add(createdProfile);
            await switchProfile(createdProfile);
            setNewProfile({ name: '', description: '', gradient: 'from-blue-500 to-purple-500' });
            setShowAddForm(false);
            setShowDropdown(false);
            alert('✅ Profile created');
        } catch (error) {
            console.error('Failed to add profile:', error);
            alert('Failed to create profile');
        }
    };

    const getGradient = (gradient: string) => {
        return `bg-gradient-to-br ${gradient}`;
    };

    const gradientOptions = [
        { label: 'Blue-Purple', value: 'from-blue-500 to-purple-500' },
        { label: 'Green-Blue', value: 'from-green-500 to-blue-500' },
        { label: 'Pink-Red', value: 'from-pink-500 to-red-500' },
        { label: 'Orange-Yellow', value: 'from-orange-500 to-yellow-500' },
        { label: 'Purple-Pink', value: 'from-purple-500 to-pink-500' },
        { label: 'Teal-Blue', value: 'from-teal-500 to-blue-500' },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Left:  Title or Menu */}
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
                            className="flex items-center gap-2 px-3 py-1. 5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <div
                                className={`w-6 h-6 rounded-full ${getGradient(
                                    profile.gradient
                                )} flex items-center justify-center text-white text-xs font-bold`}
                            >
                                {profile.name[0]}
                            </div>
                            <span className="font-medium text-sm max-w-[120px] truncate">
                {profile.name}
              </span>
                            <ChevronDown
                                className={`w-4 h-4 transition-transform ${
                                    showDropdown ? 'rotate-180' : ''
                                }`}
                            />
                        </button>

                        {/* Dropdown */}
                        {showDropdown && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowDropdown(false)}
                                />
                                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden max-h-96 overflow-y-auto">
                                    {/* Existing Profiles */}
                                    {profiles.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => switchProfile(p)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                                                p. id === profile.id ?  'bg-blue-50' : ''
                                            }`}
                                        >
                                            <div
                                                className={`w-8 h-8 rounded-full ${getGradient(
                                                    p.gradient
                                                )} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                                            >
                                                {p.name[0]}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p
                                                    className={`font-medium text-sm truncate ${
                                                        p.id === profile.id ? 'text-blue-600' : ''
                                                    }`}
                                                >
                                                    {p. name}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">{p.description}</p>
                                            </div>
                                            {p.id === profile.id && (
                                                <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}

                                    <div className="border-t border-gray-200">
                                        {! showAddForm ? (
                                            <button
                                                onClick={() => setShowAddForm(true)}
                                                className="w-full px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors text-left font-medium flex items-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Profile
                                            </button>
                                        ) : (
                                            <div className="p-4 space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Profile Name"
                                                    value={newProfile.name}
                                                    onChange={(e) => setNewProfile({ ...newProfile, name: e. target.value })}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                                <textarea
                                                    placeholder="Description (optional)"
                                                    value={newProfile.description}
                                                    onChange={(e) => setNewProfile({ ...newProfile, description: e. target.value })}
                                                    rows={2}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <div>
                                                    <p className="text-xs font-medium mb-2">Color Theme</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {gradientOptions. map((opt) => (
                                                            <button
                                                                key={opt.value}
                                                                onClick={() => setNewProfile({ ...newProfile, gradient: opt.value })}
                                                                className={`p-3 rounded-lg border-2 transition-all ${
                                                                    newProfile. gradient === opt.value
                                                                        ? 'border-blue-600'
                                                                        : 'border-gray-200'
                                                                }`}
                                                            >
                                                                <div
                                                                    className={`h-6 rounded-full ${getGradient(opt.value)}`}
                                                                />
                                                                <p className="text-xs mt-1">{opt.label}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleAddProfile}
                                                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
                                                    >
                                                        Create
                                                    </button>
                                                    <button
                                                        onClick={() => setShowAddForm(false)}
                                                        className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
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