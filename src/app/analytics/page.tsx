"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    TrendingUp, DollarSign, Users, Calendar, Download,
    ArrowLeft, Activity
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import Navigation from '@/components/Navigation';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import { Storage } from '@/lib/storage';
import { AnalyticsService } from '@/lib/analytics';
import { formatCurrency } from '@/lib/utils';
import type { Customer, Payment, Profile } from '@/types';

export default function AnalyticsPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | '12months'>('30days');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setLoading(true);

        const profile = Storage.get<Profile | null>('currentProfile', null);
        if (!profile) {
            router.push('/');
            return;
        }

        setCurrentProfile(profile);

        const allCustomers = Storage.get<Customer[]>('customers', []);
        const profileCustomers = allCustomers.filter(c => c.profileId === profile.id);
        setCustomers(profileCustomers);

        const allPayments = Storage.get<Payment[]>('payments', []);
        const customerIds = new Set(profileCustomers.map(c => c.id));
        const profilePayments = allPayments.filter(p => customerIds.has(p.customerId));
        setPayments(profilePayments);

        setLoading(false);
    };

    // Calculate statistics
    const stats = {
        totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
        totalCustomers: customers.length,
        activeCustomers: customers.filter(c => c.status === 'active').length,
        completedCustomers: customers.filter(c => c.status === 'completed').length,
        collectionRate: AnalyticsService.getCollectionRate(customers),
        overdueStats: AnalyticsService.getOverdueStats(customers)
    };

    // Get chart data based on time range
    const getRevenueData = () => {
        if (timeRange === '12months') {
            return AnalyticsService.getMonthlyRevenue(payments);
        } else {
            const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
            return AnalyticsService.getDailyRevenue(payments, days).map(d => ({
                ...d,
                date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }));
        }
    };

    const frequencyData = AnalyticsService.getCollectionByFrequency(customers);
    const categoryData = customers.reduce((acc, c) => {
        const cat = c.category || 'Other';
        if (!acc[cat]) acc[cat] = { name: cat, customers: 0, revenue: 0 };
        acc[cat].customers += 1;
        acc[cat].revenue += c.paidAmount;
        return acc;
    }, {} as Record<string, { name: string; customers: number; revenue: number }>);

    const revenueData = getRevenueData();
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (loading || !currentProfile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">Analytics</h1>
                            <p className="text-sm text-gray-500">{currentProfile.name}</p>
                        </div>
                    </div>
                    <ProfileSwitcher currentProfile={currentProfile} onProfileChange={loadData} />
                </div>

                {/* Time Range Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { id: '7days', label: '7 Days' },
                        { id: '30days', label: '30 Days' },
                        { id: '90days', label: '90 Days' },
                        { id: '12months', label: '12 Months' }
                    ].map(range => (
                        <button
                            key={range.id}
                            onClick={() => setTimeRange(range.id as typeof timeRange)}
                            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                                timeRange === range.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
                        <DollarSign className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90">Total Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
                        <Users className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90">Active Customers</p>
                        <p className="text-2xl font-bold">{stats.activeCustomers}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
                        <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90">Collection Rate</p>
                        <p className="text-2xl font-bold">{stats.collectionRate}%</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
                        <Activity className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90">Overdue</p>
                        <p className="text-2xl font-bold">{stats.overdueStats.count}</p>
                    </div>
                </div>

                {/* Revenue Trend Chart */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-4">📊 Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey={timeRange === '12months' ? 'month' : 'date'}
                                tick={{ fontSize: 12 }}
                                stroke="#999"
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                stroke="#999"
                                tickFormatter={(value) => `₨${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                formatter={(value) => (value !== undefined ? formatCurrency(value as number) : '')}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="amount"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment Frequency Distribution */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-4">📈 Payment Frequency</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={frequencyData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                            >
                                {frequencyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => (value !== undefined ? `${value} customers` : '')} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Performance */}
                {Object.keys(categoryData).length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-semibold mb-4">📂 Category Performance</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={Object.values(categoryData)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#999" />
                                <YAxis tick={{ fontSize: 12 }} stroke="#999" />
                                <Tooltip
                                    formatter={(value, name) => {
                                        if (value === undefined) return '';
                                        return name === 'revenue' ? formatCurrency(value as number) : value;
                                    }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                />
                                <Legend />
                                <Bar dataKey="customers" fill="#3b82f6" name="Customers" />
                                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Top Customers */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-4">🏆 Top Paying Customers</h3>
                    <div className="space-y-3">
                        {AnalyticsService.getTopCustomers(customers, 5).map((customer, index) => (
                            <div
                                key={customer.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                        #{index + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium">{customer.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {Math.round((customer.paidAmount / customer.totalAmount) * 100)}% complete
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-green-600">
                                        {formatCurrency(customer.paidAmount)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        of {formatCurrency(customer.totalAmount)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Export Button */}
                <button
                    onClick={() => {
                        alert('PDF export coming soon!');
                    }}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Download className="w-5 h-5" />
                    Export Analytics Report
                </button>
            </div>

            <Navigation currentPage="analytics" />
        </div>
    );
}