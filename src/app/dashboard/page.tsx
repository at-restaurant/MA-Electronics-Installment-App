// src/app/dashboard/page.tsx - FULLY MOBILE RESPONSIVE

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
import { formatCurrency, formatCurrencyCompact, truncateName } from '@/lib/utils';
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

    const todayCustomers = customers
        .filter(c => c.status === 'active' && c.frequency === 'daily')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

    const totalHistory = profile.investmentHistory || [];
    const totalInvested = totalHistory.filter(e => e.type === 'INVESTED').reduce((sum, e) => sum + e.amount, 0);
    const totalReceived = totalHistory.filter(e => e.type === 'RECEIVED').reduce((sum, e) => sum + e.amount, 0);
    const netInvestment = totalInvested - totalReceived;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Dashboard" />

            <div className="pt-16 p-4 space-y-4">
                {/* ✅ RESPONSIVE STATS GRID */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Investment Box */}
                    <button
                        onClick={() => router.push('/dashboard/investment')}
                        className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg text-left hover:shadow-xl transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <DollarSign className="w-6 h-6 opacity-80" />
                            {netInvestment >= 0 ? (
                                <TrendingUp className="w-4 h-4 opacity-70" />
                            ) : (
                                <TrendingDown className="w-4 h-4 opacity-70" />
                            )}
                        </div>
                        <p className="text-xs opacity-90 mb-1">Investment</p>
                        {/* ✅ RESPONSIVE TEXT - Uses compact format on mobile */}
                        <p className="text-lg font-bold truncate">
                            {formatCurrencyCompact(Math.abs(netInvestment))}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                            <p className="text-xs opacity-90">View Details</p>
                            <ArrowRight className="w-3 h-3 opacity-90" />
                        </div>
                    </button>

                    {/* Pending */}
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
                        <AlertCircle className="w-6 h-6 mb-2 opacity-80" />
                        <p className="text-xs opacity-90 mb-1">Pending</p>
                        <p className="text-lg font-bold truncate">{formatCurrencyCompact(stats.pending)}</p>
                    </div>

                    {/* Total Customers */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                        <Users className="w-6 h-6 mb-2 opacity-80" />
                        <p className="text-xs opacity-90 mb-1">Customers</p>
                        <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                    </div>

                    {/* Collection Rate */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-lg">
                        <TrendingUp className="w-6 h-6 mb-2 opacity-80" />
                        <p className="text-xs opacity-90 mb-1">Collection</p>
                        <p className="text-2xl font-bold">{Math.round(stats.collectionRate)}%</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => router.push('/customers/add')}
                        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left border border-gray-200 active:scale-[0.98]"
                    >
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="font-semibold text-sm">Add Customer</p>
                        <p className="text-xs text-gray-500 mt-1">New account</p>
                    </button>

                    <button
                        onClick={() => router.push('/collection')}
                        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left border border-gray-200 active:scale-[0.98]"
                    >
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="font-semibold text-sm">Collection</p>
                        <p className="text-xs text-gray-500 mt-1">Mark payments</p>
                    </button>
                </div>

                {/* Today's Daily Customers */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm">Today's Customers</h3>
                        <button
                            onClick={() => router.push('/collection')}
                            className="text-blue-600 text-xs font-medium flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            All
                            <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {todayCustomers.length === 0 ? (
                            <p className="text-center text-gray-500 py-8 text-xs">No daily customers</p>
                        ) : (
                            todayCustomers.map(customer => (
                                <div
                                    key={customer.id}
                                    onClick={() => router.push(`/customers/${customer.id}`)}
                                    className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs overflow-hidden flex-shrink-0">
                                            {customer.photo ? (
                                                <img src={customer.photo} alt={customer.name} className="w-full h-full object-cover" />
                                            ) : (
                                                customer.name.charAt(0)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {/* ✅ TRUNCATE NAME */}
                                            <p className="font-medium text-sm truncate">{truncateName(customer.name)}</p>
                                            <p className="text-xs text-gray-500 truncate">{customer.phone}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        {/* ✅ COMPACT CURRENCY */}
                                        <p className="font-semibold text-green-600 text-xs whitespace-nowrap">
                                            {formatCurrencyCompact(customer.installmentAmount)}
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