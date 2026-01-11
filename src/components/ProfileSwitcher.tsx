// src/components/ProfileSwitcher.tsx - FIXED with async loading
"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Storage } from "@/lib/storage";
import { getGradientColor } from "@/lib/utils";
import type { Profile } from "@/types";

interface ProfileSwitcherProps {
    currentProfile: Profile;
    onProfileChange?: () => void;
}

export default function ProfileSwitcher({
                                            currentProfile,
                                            onProfileChange
                                        }: ProfileSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadProfiles();

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadProfiles = async () => {
        const savedProfiles = await Storage.get<Profile[]>("profiles", []);

        if (savedProfiles.length === 0) {
            const defaultProfiles: Profile[] = [
                {
                    id: 1,
                    name: "Main Business",
                    description: "Primary business account",
                    gradient: "from-blue-500 to-purple-500",
                    createdAt: new Date().toISOString(),
                },
            ];
            await Storage.save("profiles", defaultProfiles);
            setProfiles(defaultProfiles);
        } else {
            setProfiles(savedProfiles);
        }
    };

    const handleProfileSwitch = async (profile: Profile) => {
        await Storage.save("currentProfile", profile);
        setIsOpen(false);

        if (onProfileChange) {
            onProfileChange();
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
                <div className={`w-3 h-3 rounded-full ${getGradientColor(currentProfile.gradient)}`} />
                <span className="font-medium text-sm max-w-[120px] truncate">
                    {currentProfile.name}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                        isOpen ? "rotate-180" : ""
                    }`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                    {profiles.map((profile) => (
                        <button
                            key={profile.id}
                            onClick={() => handleProfileSwitch(profile)}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                                profile.id === currentProfile.id ? "bg-blue-50" : ""
                            }`}
                        >
                            <div className={`w-3 h-3 rounded-full ${getGradientColor(profile.gradient)} flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm truncate ${
                                    profile.id === currentProfile.id ? "text-blue-600" : "text-gray-900"
                                }`}>
                                    {profile.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {profile.description}
                                </p>
                            </div>
                            {profile.id === currentProfile.id && (
                                <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}