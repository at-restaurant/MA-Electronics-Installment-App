// src/app/dashboard/page.tsx - UPDATED WITH CLICKABLE INVESTMENT BOX

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, TrendingUp, AlertCircle, DollarSign, ArrowRight, TrendingDown
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useCompact';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Profile, Customer } from '@/types';

export default function DashboardPage() {
    const router = useRouter();
    const { profile: currentProfile } = useProfile();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [stats, setStats] = useState({
        totalCustomers: 0,
        activeCustomers: 0,
        completedCustomers: 0,
        totalExpected: 0,
        collectionRate: 0,
        pending: 0,
    });

    useEffect(() => {
        if (currentProfile) {
            loadData();
        }
    }, [currentProfile]);

    const loadData = async () => {
        try {
            const p = await db.profiles.get(currentProfile!.id);
            if (p) setProfile(p);

            const allCustomers = await db.getCustomersByProfile(currentProfile!.id);
            setCustomers(allCustomers);

            const allPayments = await db.getPaymentsByProfile(currentProfile!.id);

            const totalReceived = allPayments.reduce((sum, p) => sum + p.amount, 0);
            const totalExpected = allCustomers.reduce((sum, c) => sum + c.totalAmount, 0);
            const pending = Math.max(0, totalExpected - totalReceived);

            const statsData = await db.calculateStatistics(currentProfile!.id);
            setStats({
                totalCustomers: statsData.totalCustomers,
                activeCustomers: statsData.activeCustomers,
                completedCustomers: statsData.completedCustomers,
                totalExpected: statsData.totalExpected,
                collectionRate: statsData.collectionRate,
                pending,
            });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    };

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    // ✅ TODAY'S DAILY CUSTOMERS ONLY
    const todayCustomers = customers
        .filter(c => c.status === 'active' && c.frequency === 'daily')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

    // ✅ CALCULATE NET INVESTMENT
    const totalHistory = profile.investmentHistory || [];
    const totalInvested = totalHistory.filter(e => e.type === 'INVESTED').reduce((sum, e) => sum + e.amount, 0);
    const totalReceived = totalHistory.filter(e => e.type === 'RECEIVED').reduce((sum, e) => sum + e.amount, 0);
    const netInvestment = totalInvested - totalReceived;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Dashboard" />

            <div className="pt-16 p-4 space-y-4">
                {/* ✅ STATS GRID (WITHOUT Total Received) */}
                <div className="grid grid-cols-2 gap-3">
                    {/* ✅ INVESTMENT BOX - CLICKABLE (NO AMOUNT SHOWN) */}
                    <button
                        onClick={() => router.push('/dashboard/investment')}
                        className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg text-left hover:shadow-xl transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <DollarSign className="w-8 h-8 opacity-80" />
                            {netInvestment >= 0 ? (
                                <TrendingUp className="w-6 h-6 opacity-70" />
                            ) : (
                                <TrendingDown className="w-6 h-6 opacity-70" />
                            )}
                        </div>
                        <p className="text-sm opacity-90 mb-1">Investment</p>
                        <p className="text-lg font-semibold opacity-90">View Details →</p>
                    </button>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90 mb-1">Pending</p>
                        <p className="text-3xl font-bold">{formatCurrency(stats.pending)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                        <Users className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90 mb-1">Total Customers</p>
                        <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-lg">
                        <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90 mb-1">Collection Rate</p>
                        <p className="text-2xl font-bold">{Math.round(stats.collectionRate)}%</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => router.push('/customers/add')}
                        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left border border-gray-200"
                    >
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="font-semibold text-sm">Add Customer</p>
                        <p className="text-xs text-gray-500 mt-1">Create new account</p>
                    </button>

                    <button
                        onClick={() => router.push('/collection')}
                        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left border border-gray-200"
                    >
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="font-semibold text-sm">Daily Collection</p>
                        <p className="text-xs text-gray-500 mt-1">Mark payments</p>
                    </button>
                </div>

                {/* ✅ TODAY'S DAILY CUSTOMERS */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Today's Daily Customers</h3>
                        <button
                            onClick={() => router.push('/collection')}
                            className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            View All
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {todayCustomers.length === 0 ? (
                            <p className="text-center text-gray-500 py-8 text-sm">No daily customers today</p>
                        ) : (
                            todayCustomers.map(customer => (
                                <div
                                    key={customer.id}
                                    onClick={() => router.push(`/customers/${customer.id}`)}
                                    className="flex items-center justify-between py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                                            {customer.photo ? (
                                                <img src={customer.photo} alt={customer.name} className="w-full h-full object-cover" />
                                            ) : (
                                                customer.name.charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{customer.name}</p>
                                            <p className="text-xs text-gray-500">{customer.phone}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-green-600 text-sm">
                                            {formatCurrency(customer.installmentAmount)}
                                        </p>
                                        <p className="text-xs text-gray-500">Daily</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <Navigation currentPage="dashboard" />
        </div>
    );
}