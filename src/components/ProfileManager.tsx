// src/components/ProfileManager.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, X, Check } from "lucide-react";
import { Storage } from "@/lib/storage";
import { getGradientColor } from "@/lib/utils";
import type { Profile } from "@/types";

interface ProfileManagerProps {
    onClose: () => void;
    onProfilesUpdate: () => void;
}

export default function ProfileManager({ onClose, onProfilesUpdate }: ProfileManagerProps) {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [showAddNew, setShowAddNew] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");

    const gradientOptions = [
        "from-blue-500 to-purple-500",
        "from-green-500 to-teal-500",
        "from-orange-500 to-red-500",
        "from-pink-500 to-rose-500",
        "from-indigo-500 to-blue-500",
        "from-yellow-500 to-orange-500",
        "from-purple-500 to-pink-500",
        "from-cyan-500 to-blue-500"
    ];

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = () => {
        const savedProfiles = Storage.get<Profile[]>("profiles", []);

        if (savedProfiles.length === 0) {
            const defaultProfiles: Profile[] = [
                {
                    id: 1,
                    name: "Main Business",
                    description: "Primary business account",
                    gradient: "from-blue-500 to-purple-500",
                    createdAt: new Date().toISOString(),
                }
            ];
            Storage.save("profiles", defaultProfiles);
            setProfiles(defaultProfiles);
        } else {
            setProfiles(savedProfiles);
        }
    };

    const handleAddProfile = () => {
        if (!newName.trim()) {
            alert("Please enter profile name");
            return;
        }

        const newProfile: Profile = {
            id: Date.now(),
            name: newName.trim(),
            description: newDescription.trim() || "Business account",
            gradient: gradientOptions[profiles.length % gradientOptions.length],
            createdAt: new Date().toISOString()
        };

        const updatedProfiles = [...profiles, newProfile];
        Storage.save("profiles", updatedProfiles);
        setProfiles(updatedProfiles);

        setNewName("");
        setNewDescription("");
        setShowAddNew(false);
        onProfilesUpdate();
    };

    const handleEditProfile = (profile: Profile) => {
        setEditingId(profile.id);
        setEditName(profile.name);
        setEditDescription(profile.description);
    };

    const handleSaveEdit = (id: number) => {
        if (!editName.trim()) {
            alert("Profile name cannot be empty");
            return;
        }

        const updatedProfiles = profiles.map(p =>
            p.id === id
                ? { ...p, name: editName.trim(), description: editDescription.trim() }
                : p
        );

        Storage.save("profiles", updatedProfiles);
        setProfiles(updatedProfiles);

        const currentProfile = Storage.get<Profile | null>("currentProfile", null);
        if (currentProfile && currentProfile.id === id) {
            const updated = updatedProfiles.find(p => p.id === id);
            if (updated) {
                Storage.save("currentProfile", updated);
            }
        }

        setEditingId(null);
        onProfilesUpdate();
    };

    const handleDeleteProfile = (id: number) => {
        if (profiles.length === 1) {
            alert("Cannot delete the last profile!");
            return;
        }

        if (!confirm("Delete this profile? All customers under this profile will be lost!")) {
            return;
        }

        const updatedProfiles = profiles.filter(p => p.id !== id);
        Storage.save("profiles", updatedProfiles);
        setProfiles(updatedProfiles);

        const currentProfile = Storage.get<Profile | null>("currentProfile", null);
        if (currentProfile && currentProfile.id === id) {
            Storage.save("currentProfile", updatedProfiles[0]);
        }

        const allCustomers = Storage.get("customers", []);
        const filteredCustomers = allCustomers.filter((c: any) => c.profileId !== id);
        Storage.save("customers", filteredCustomers);

        onProfilesUpdate();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Manage Profiles</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Create and manage business profiles
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-3">
                    {profiles.map(profile => (
                        <div
                            key={profile.id}
                            className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                        >
                            {editingId === profile.id ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Profile Name"
                                    />
                                    <input
                                        type="text"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Description"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSaveEdit(profile.id)}
                                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                                        >
                                            <Check className="w-4 h-4" />
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full ${getGradientColor(profile.gradient)} flex items-center justify-center text-white font-bold text-lg`}>
                                            {profile.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{profile.name}</h3>
                                            <p className="text-sm text-gray-500">{profile.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditProfile(profile)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProfile(profile.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            disabled={profiles.length === 1}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {showAddNew ? (
                        <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Profile Name (e.g., Side Business)"
                                    autoFocus
                                />
                                <input
                                    type="text"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Description (optional)"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddProfile}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Create Profile
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAddNew(false);
                                            setNewName("");
                                            setNewDescription("");
                                        }}
                                        className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddNew(true)}
                            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
                        >
                            <Plus className="w-5 h-5" />
                            Add New Profile
                        </button>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t">
                    <p className="text-sm text-gray-600 text-center">
                        💡 Each profile maintains separate customer records
                    </p>
                </div>
            </div>
        </div>
    );
}