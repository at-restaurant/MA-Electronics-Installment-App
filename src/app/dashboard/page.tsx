// src/app/dashboard/page.tsx - FIXED
"use client";

import { useState, useEffect } from "react";
import { DollarSign, Users, TrendingUp, Clock } from "lucide-react";
import Navigation from "@/components/Navigation";
import ProfileSelector from "@/components/ProfileSelector";
import { Storage } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import type { Profile } from "@/types";
import { useRouter } from "next/navigation";
import { useCustomers } from "@/hooks/useCustomers";

export default function DashboardPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [showProfileSelector, setShowProfileSelector] = useState(false);

    const { customers } = useCustomers(currentProfile?.id);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const profile = await Storage.get<Profile | null>("currentProfile", null);

        if (!profile) {
            setShowProfileSelector(true);
            return;
        }

        setCurrentProfile(profile);
    };

    const stats = {
        totalReceived: customers.reduce((sum, c) => sum + c.paidAmount, 0),
        totalExpected: customers.reduce((sum, c) => sum + c.totalAmount, 0),
        totalCustomers: customers.length,
        activeCustomers: customers.filter((c) => c.paidAmount < c.totalAmount).length,
    };

    const pending = stats.totalExpected - stats.totalReceived;
    const collectionRate =
        stats.totalExpected > 0
            ? Math.round((stats.totalReceived / stats.totalExpected) * 100)
            : 0;

    if (showProfileSelector) {
        return (
            <ProfileSelector
                onSelect={async (profile: Profile) => {
                    setCurrentProfile(profile);
                    await Storage.save("currentProfile", profile);
                    setShowProfileSelector(false);
                }}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white border-b px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {currentProfile?.name?.charAt(0)}
                        </div>
                        <div>
                            <h2 className="font-bold">{currentProfile?.name}</h2>
                            <p className="text-xs text-gray-500">MA Installment App</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowProfileSelector(true)}
                        className="text-sm text-blue-600 font-medium"
                    >
                        Switch
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <h1 className="text-2xl font-bold">Dashboard</h1>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
                        <DollarSign className="w-8 h-8 mb-2" />
                        <p className="text-sm opacity-90">Total Received</p>
                        <p className="text-2xl font-bold">{formatCurrency(stats.totalReceived)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
                        <Clock className="w-8 h-8 mb-2" />
                        <p className="text-sm opacity-90">Pending</p>
                        <p className="text-2xl font-bold">{formatCurrency(pending)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
                        <Users className="w-8 h-8 mb-2" />
                        <p className="text-sm opacity-90">Total Customers</p>
                        <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
                        <TrendingUp className="w-8 h-8 mb-2" />
                        <p className="text-sm opacity-90">Collection Rate</p>
                        <p className="text-2xl font-bold">{collectionRate}%</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-4">Recent Customers</h3>
                    <div className="space-y-3">
                        {customers.slice(0, 5).map((customer) => (
                            <div
                                key={customer.id}
                                onClick={() => router.push(`/customers/${customer.id}`)}
                                className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-gray-50 rounded px-2 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                        {customer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium">{customer.name}</p>
                                        <p className="text-sm text-gray-500">{customer.phone}</p>
                                    </div>
                                </div>
                                <span className="text-green-600 font-semibold">
                                    {formatCurrency(customer.installmentAmount)}
                                </span>
                            </div>
                        ))}
                        {customers.length === 0 && (
                            <p className="text-center text-gray-500 py-4">No customers yet</p>
                        )}
                    </div>
                </div>
            </div>

            <Navigation currentPage="dashboard" />
        </div>
    );
}