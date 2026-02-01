// src/app/dashboard/page.tsx - MOBILE-FRIENDLY VERSION

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, TrendingUp, AlertCircle, DollarSign, ArrowRight,
    TrendingDown, Calendar, Target, PieChart, RefreshCw
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useCompact';
import {
    formatCurrency,
    formatCurrencyCompact,
    truncateName,
    calculateDaysOverdue
} from '@/lib/utils';
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
        totalReceived: 0,
        totalExpected: 0,
        collectionRate: 0,
        pending: 0,
        overdueCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [todayRevenue, setTodayRevenue] = useState(0);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    useEffect(() => {
        if (currentProfile) {
            loadData();
        }
    }, [currentProfile]);

    const loadData = async () => {
        try {
            setLoading(true);

            const p = await db.profiles.get(currentProfile!.id);
            if (p) {
                if (!p.investmentHistory) p.investmentHistory = [];
                if (p.totalInvestment === undefined) p.totalInvestment = 0;
                setProfile(p);
            }

            const allCustomers = await db.getCustomersByProfile(currentProfile!.id);
            setCustomers(allCustomers);

            const allPayments = await db.getPaymentsByProfile(currentProfile!.id);

            // Calculate today's revenue
            const today = new Date().toISOString().split('T')[0];
            const todayPayments = allPayments.filter(p => p.date === today);
            const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);
            setTodayRevenue(todayRevenue);

            // Calculate statistics
            const totalReceived = allPayments.reduce((sum, p) => sum + p.amount, 0);
            const totalExpected = allCustomers.reduce((sum, c) => sum + c.totalAmount, 0);
            const pending = Math.max(0, totalExpected - totalReceived);

            const overdueCount = allCustomers.filter(c => {
                if (c.status === 'completed') return false;
                const daysOverdue = calculateDaysOverdue(c.lastPayment, c.frequency);
                return daysOverdue > 0;
            }).length;

            const activeCustomers = allCustomers.filter(c => c.status === 'active').length;
            const completedCustomers = allCustomers.filter(c => c.status === 'completed').length;

            setStats({
                totalCustomers: allCustomers.length,
                activeCustomers,
                completedCustomers,
                totalReceived,
                totalExpected,
                collectionRate: totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0,
                pending,
                overdueCount,
            });

            setLastUpdated(new Date().toLocaleTimeString('en-PK', {
                hour: '2-digit',
                minute: '2-digit'
            }));
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        loadData();
    };

    if (loading || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4" />
                <p className="text-gray-600">Loading dashboard...</p>
            </div>
        );
    }

    const calculateInvestmentSummary = () => {
        const totalHistory = profile.investmentHistory || [];
        const totalInvested = totalHistory
            .filter(e => e.type === 'INVESTED')
            .reduce((sum, e) => sum + e.amount, 0);

        const totalWithdrawn = totalHistory
            .filter(e => e.type === 'WITHDRAWN')
            .reduce((sum, e) => sum + e.amount, 0);

        const netInvestment = totalInvested - totalWithdrawn;

        return { netInvestment, totalInvested, totalWithdrawn };
    };

    const { netInvestment } = calculateInvestmentSummary();

    // Format number with K/M suffix
    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    const todayCustomers = customers
        .filter(c => c.status === 'active' && c.frequency === 'daily')
        .sort((a, b) => {
            const aOverdue = calculateDaysOverdue(a.lastPayment, a.frequency);
            const bOverdue = calculateDaysOverdue(b.lastPayment, b.frequency);
            return bOverdue - aOverdue;
        })
        .slice(0, 6); // Mobile friendly - only 6 customers

    const overdueCustomers = customers
        .filter(c => {
            if (c.status === 'completed') return false;
            const daysOverdue = calculateDaysOverdue(c.lastPayment, c.frequency);
            return daysOverdue > 7;
        })
        .slice(0, 2); // Mobile friendly - only 2 overdue

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-20">
            <GlobalHeader
                title="Dashboard"
                rightAction={
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                }
            />

            <div className="pt-16 p-3 space-y-4">
                {/* Last Updated */}
                {lastUpdated && (
                    <div className="flex justify-between items-center px-1">
                        <span className="text-xs text-gray-500">
                            Pull down to refresh
                        </span>
                        <span className="text-xs text-gray-500">
                            Updated: {lastUpdated}
                        </span>
                    </div>
                )}

                {/* MOBILE OPTIMIZED STATS GRID - 2x2 Layout */}
                <div className="grid grid-cols-2 gap-2">
                    {/* Investment - Mobile Optimized */}
                    <button
                        onClick={() => router.push('/dashboard/investment')}
                        className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-start justify-between mb-1">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <DollarSign className="w-4 h-4" />
                            </div>
                            <div className={`text-xs px-1.5 py-0.5 rounded-full ${netInvestment >= 0 ? 'bg-green-400/30' : 'bg-red-400/30'}`}>
                                {netInvestment >= 0 ? 'Profit' : 'Loss'}
                            </div>
                        </div>
                        <p className="text-[10px] opacity-90 mb-0.5">Investment</p>
                        <p className="text-base font-bold leading-tight">
                            {formatCurrencyCompact(Math.abs(netInvestment))}
                            {netInvestment < 0 && <span className="text-red-300 text-xs ml-0.5">▼</span>}
                        </p>
                        <div className="flex items-center gap-0.5 mt-1.5 opacity-90">
                            <p className="text-[10px]">View Details</p>
                            <ArrowRight className="w-2.5 h-2.5" />
                        </div>
                    </button>

                    {/* Today's Revenue - Mobile Optimized */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 text-white shadow-md">
                        <div className="flex items-start justify-between mb-1">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <PieChart className="w-4 h-4 opacity-90" />
                        </div>
                        <p className="text-[10px] opacity-90 mb-0.5">Today's Collection</p>
                        <p className="text-base font-bold leading-tight">
                            {formatCurrencyCompact(todayRevenue)}
                        </p>
                        <p className="text-[10px] opacity-90 mt-1.5">
                            {stats.activeCustomers} active
                        </p>
                    </div>

                    {/* Total Customers - Mobile Optimized */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 text-white shadow-md">
                        <div className="flex items-start justify-between mb-1">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <Users className="w-4 h-4" />
                            </div>
                            <Target className="w-4 h-4 opacity-90" />
                        </div>
                        <p className="text-[10px] opacity-90 mb-0.5">Total Customers</p>
                        <p className="text-lg font-bold leading-tight">
                            {formatNumber(stats.totalCustomers)}
                        </p>
                        <div className="flex flex-col gap-1 mt-1.5">
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-300"></div>
                                <span className="text-[10px] opacity-90">
                                    {formatNumber(stats.activeCustomers)} active
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-300"></div>
                                <span className="text-[10px] opacity-90">
                                    {formatNumber(stats.completedCustomers)} completed
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Collection Rate - Mobile Optimized */}
                    <div className={`rounded-xl p-3 text-white shadow-md ${
                        stats.collectionRate >= 90
                            ? 'bg-gradient-to-br from-green-500 to-green-600'
                            : stats.collectionRate >= 70
                                ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                                : 'bg-gradient-to-br from-red-500 to-red-600'
                    }`}>
                        <div className="flex items-start justify-between mb-1">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <AlertCircle className="w-4 h-4 opacity-90" />
                        </div>
                        <p className="text-[10px] opacity-90 mb-0.5">Collection Rate</p>
                        <p className="text-lg font-bold leading-tight">
                            {Math.round(stats.collectionRate)}%
                        </p>
                        <p className="text-[10px] opacity-90 mt-1.5 truncate">
                            {formatCurrencyCompact(stats.totalReceived)} / {formatCurrencyCompact(stats.totalExpected)}
                        </p>
                    </div>
                </div>

                {/* MOBILE OPTIMIZED OVERDUE WARNING */}
                {overdueCustomers.length > 0 && (
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-3 text-white shadow-md">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4" />
                                <h3 className="font-bold text-sm">⚠️ Overdue</h3>
                            </div>
                            <button
                                onClick={() => router.push('/collection')}
                                className="text-[10px] bg-white/30 hover:bg-white/40 px-2 py-0.5 rounded-lg"
                            >
                                View All
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            {overdueCustomers.map(customer => {
                                const daysOverdue = calculateDaysOverdue(customer.lastPayment, customer.frequency);
                                const remaining = customer.totalAmount - customer.paidAmount;
                                return (
                                    <div key={customer.id} className="flex justify-between items-center bg-white/20 p-1.5 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-xs truncate">
                                                {truncateName(customer.name, 15)}
                                            </p>
                                            <p className="text-[10px] opacity-90">
                                                {daysOverdue}d overdue
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-1">
                                            <p className="font-bold text-xs">
                                                {formatCurrencyCompact(remaining)}
                                            </p>
                                            <p className="text-[10px] opacity-90">left</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* MOBILE OPTIMIZED QUICK ACTIONS */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => router.push('/customers/add')}
                        className="bg-white rounded-lg p-3 shadow-sm hover:shadow active:scale-[0.98] transition-all border border-gray-200"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center mb-2 mx-auto">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="font-semibold text-gray-800 text-sm text-center">Add Customer</p>
                        <p className="text-[10px] text-gray-500 text-center mt-0.5">New account</p>
                    </button>

                    <button
                        onClick={() => router.push('/collection')}
                        className="bg-white rounded-lg p-3 shadow-sm hover:shadow active:scale-[0.98] transition-all border border-gray-200"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center mb-2 mx-auto">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="font-semibold text-gray-800 text-sm text-center">Collection</p>
                        <p className="text-[10px] text-gray-500 text-center mt-0.5">Mark payments</p>
                    </button>
                </div>

                {/* MOBILE OPTIMIZED TODAY'S CUSTOMERS */}
                <div className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-semibold text-gray-800 text-sm">Today's Customers</h3>
                            <p className="text-[10px] text-gray-500">
                                {todayCustomers.length} daily customers
                            </p>
                        </div>
                        {todayCustomers.length > 0 && (
                            <button
                                onClick={() => router.push('/collection')}
                                className="text-blue-600 text-[10px] font-medium flex items-center gap-0.5 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                            >
                                All
                                <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {todayCustomers.length === 0 ? (
                            <div className="text-center py-4">
                                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-xs">No daily customers today</p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    All daily payments are up to date
                                </p>
                            </div>
                        ) : (
                            todayCustomers.map(customer => {
                                const daysOverdue = calculateDaysOverdue(customer.lastPayment, 'daily');
                                const isOverdue = daysOverdue > 0;
                                return (
                                    <div
                                        key={customer.id}
                                        onClick={() => router.push(`/customers/${customer.id}`)}
                                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform ${
                                            isOverdue
                                                ? 'border-red-200 bg-red-50'
                                                : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                                                isOverdue
                                                    ? 'bg-gradient-to-br from-red-500 to-orange-500'
                                                    : 'bg-gradient-to-br from-blue-500 to-purple-500'
                                            }`}>
                                                {customer.photo ? (
                                                    <img src={customer.photo} alt={customer.name}
                                                         className="w-full h-full object-cover rounded-full" />
                                                ) : (
                                                    customer.name.charAt(0)
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <p className="font-medium text-xs truncate">
                                                        {truncateName(customer.name, 12)}
                                                    </p>
                                                    {isOverdue && (
                                                        <span className="px-1 py-0 bg-red-100 text-red-700 text-[10px] font-medium rounded">
                                                            {daysOverdue}d
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-500 truncate">
                                                    {customer.phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1***$3')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-1">
                                            <p className={`font-semibold text-xs whitespace-nowrap ${
                                                isOverdue ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                                {formatCurrencyCompact(customer.installmentAmount)}
                                            </p>
                                            <p className="text-[10px] text-gray-500">Daily</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* MOBILE OPTIMIZED PERFORMANCE STATS */}
                <div className="bg-white rounded-xl p-3 shadow-sm">
                    <h3 className="font-semibold text-gray-800 text-sm mb-3">Performance</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-2.5 rounded-lg">
                            <p className="text-[10px] text-gray-500">Pending Amount</p>
                            <p className="text-base font-bold text-orange-600 mt-0.5">
                                {formatCurrencyCompact(stats.pending)}
                            </p>
                            <div className="h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, (stats.pending / stats.totalExpected) * 100)}%` }}
                                />
                            </div>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-lg">
                            <p className="text-[10px] text-gray-500">Overdue Customers</p>
                            <p className="text-base font-bold text-red-600 mt-0.5">
                                {formatNumber(stats.overdueCount)}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                                of {formatNumber(stats.activeCustomers)} active
                            </p>
                        </div>
                    </div>
                </div>

                {/* MOBILE OPTIMIZED FINANCIAL SUMMARY */}
                <div className="bg-white rounded-xl p-3 shadow-sm">
                    <h3 className="font-semibold text-gray-800 text-sm mb-3">Financial Summary</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Total Received</span>
                            <span className="font-semibold text-green-600 text-sm">
                                {formatCurrencyCompact(stats.totalReceived)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Total Expected</span>
                            <span className="font-semibold text-blue-600 text-sm">
                                {formatCurrencyCompact(stats.totalExpected)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Net Investment</span>
                            <span className={`font-semibold text-sm ${netInvestment >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                                {formatCurrencyCompact(Math.abs(netInvestment))}
                                {netInvestment < 0 && ' (↓)'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* MOBILE OPTIMIZED REFRESH BUTTON */}
                <div className="flex justify-center pt-2">
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-lg transition-colors active:scale-[0.98]"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">Refresh Data</span>
                    </button>
                </div>
            </div>

            <Navigation currentPage="dashboard" />
        </div>
    );
}