// src/app/dashboard/page.tsx - WITH ONLINE/OFFLINE BREAKDOWN

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, TrendingUp, AlertCircle, Plus, Edit2, Trash2,
    DollarSign, ArrowRight, ChevronDown, ChevronUp, CreditCard, Banknote
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useCompact';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Profile, InvestmentEntry, Customer } from '@/types';

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
        onlinePayments: 0, // ✅ NEW
        offlinePayments: 0, // ✅ NEW
    });

    const [showInvestmentForm, setShowInvestmentForm] = useState(false);
    const [showInvestmentHistory, setShowInvestmentHistory] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [investmentForm, setInvestmentForm] = useState({ amount: '', note: '' });

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

            // ✅ GET ALL PAYMENTS
            const allPayments = await db.getPaymentsByProfile(currentProfile!.id);

            // ✅ CALCULATE ONLINE/OFFLINE
            const onlineTotal = allPayments
                .filter(p => p.paymentSource === 'online')
                .reduce((sum, p) => sum + p.amount, 0);

            const offlineTotal = allPayments
                .filter(p => p.paymentSource === 'offline')
                .reduce((sum, p) => sum + p.amount, 0);

            const statsData = await db.calculateStatistics(currentProfile!.id);
            setStats({
                totalCustomers: statsData.totalCustomers,
                activeCustomers: statsData.activeCustomers,
                completedCustomers: statsData.completedCustomers,
                totalReceived: statsData.totalReceived,
                totalExpected: statsData.totalExpected,
                collectionRate: statsData.collectionRate,
                onlinePayments: onlineTotal, // ✅ SET
                offlinePayments: offlineTotal, // ✅ SET
            });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    };

    const handleSaveInvestment = async () => {
        if (!investmentForm.amount || !profile) {
            alert('Enter investment amount');
            return;
        }

        const amount = parseFloat(investmentForm.amount);
        if (amount <= 0) {
            alert('Enter valid amount');
            return;
        }

        try {
            const entry: InvestmentEntry = {
                id: editingId || Date.now(),
                amount,
                date: new Date().toISOString(),
                note: investmentForm.note,
            };

            let newHistory = [...(profile.investmentHistory || [])];
            let newTotal = profile.totalInvestment || 0;

            if (editingId) {
                const oldEntry = newHistory.find(e => e.id === editingId);
                if (oldEntry) {
                    newTotal = newTotal - oldEntry.amount + amount;
                    newHistory = newHistory.map(e => (e.id === editingId ? entry : e));
                }
                setEditingId(null);
            } else {
                newHistory.push(entry);
                newTotal += amount;
            }

            const updated = {
                ...profile,
                totalInvestment: newTotal,
                investmentHistory: newHistory
            };

            await db.profiles.update(profile.id, updated);
            setProfile(updated);
            setInvestmentForm({ amount: '', note: '' });
            setShowInvestmentForm(false);
        } catch (error) {
            console.error('Failed to save investment:', error);
            alert('Failed to save investment');
        }
    };

    const handleDeleteInvestment = async (id: number) => {
        if (!profile || !confirm('Delete this investment entry?')) return;

        try {
            const entry = profile.investmentHistory?.find(e => e.id === id);
            if (!entry) return;

            const updated = {
                ...profile,
                totalInvestment: (profile.totalInvestment || 0) - entry.amount,
                investmentHistory: (profile.investmentHistory || []).filter(e => e.id !== id),
            };

            await db.profiles.update(profile.id, updated);
            setProfile(updated);
        } catch (error) {
            console.error('Failed to delete investment:', error);
            alert('Failed to delete investment');
        }
    };

    const handleEditInvestment = (entry: InvestmentEntry) => {
        setInvestmentForm({ amount: entry.amount.toString(), note: entry.note || '' });
        setEditingId(entry.id);
        setShowInvestmentForm(true);
    };

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    const recentCustomers = customers
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    const totalHistory = profile.investmentHistory || [];
    const pending = Math.max(0, stats.totalExpected - stats.totalReceived);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Dashboard" />

            <div className="pt-16 p-4 space-y-4">
                {/* ✅ UPDATED STATS WITH ONLINE/OFFLINE BREAKDOWN */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Total Received - Now clickable to show breakdown */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-lg col-span-2">
                        <DollarSign className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90 mb-1">Total Received</p>

                        <p className="text-3xl font-bold mb-3">{formatCurrency(stats.totalReceived)}</p>
                        {/* ✅ BREAKDOWN */}
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/20">
                            <div className="bg-white/10 rounded-lg p-2">
                                <div className="flex items-center gap-1 mb-1">
                                    <CreditCard className="w-3 h-3" />
                                    <p className="text-xs opacity-80">Online</p>
                                </div>
                                <p className="text-lg font-bold">{formatCurrency(stats.onlinePayments)}</p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-2">
                                <div className="flex items-center gap-1 mb-1">
                                    <Banknote className="w-3 h-3" />
                                    <p className="text-xs opacity-80">Cash</p>
                                </div>
                                <p className="text-lg font-bold">{formatCurrency(stats.offlinePayments)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90 mb-1">Pending</p>
                        <p className="text-2xl font-bold">{formatCurrency(pending)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                        <Users className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90 mb-1">Total Customers</p>
                        <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg col-span-2">
                        <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90 mb-1">Collection Rate</p>
                        <p className="text-2xl font-bold">{Math.round(stats.collectionRate)}%</p>
                    </div>
                </div>

                {/* Investment Section */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Total Investment</p>
                                    <p className="text-2xl font-bold text-purple-600">
                                        {formatCurrency(profile.totalInvestment || 0)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowInvestmentForm(!showInvestmentForm)}
                                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {showInvestmentForm && (
                        <div className="p-4 border-b bg-purple-50">
                            <div className="space-y-3">
                                <input
                                    type="number"
                                    placeholder="Amount (₨)"
                                    value={investmentForm.amount}
                                    onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    autoFocus
                                />
                                <textarea
                                    placeholder="Note (optional)"
                                    value={investmentForm.note}
                                    onChange={(e) => setInvestmentForm({ ...investmentForm, note: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveInvestment}
                                        className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 text-sm"
                                    >
                                        {editingId ? 'Update' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowInvestmentForm(false);
                                            setEditingId(null);
                                            setInvestmentForm({ amount: '', note: '' });
                                        }}
                                        className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {totalHistory.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowInvestmentHistory(!showInvestmentHistory)}
                                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                            <span className="text-sm font-medium text-gray-700">
                                History ({totalHistory.length} entries)
                            </span>
                                {showInvestmentHistory ? (
                                    <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                            </button>

                            {showInvestmentHistory && (
                                <div className="max-h-60 overflow-y-auto border-t">
                                    {totalHistory
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((entry) => (
                                            <div key={entry.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <p className="font-bold text-purple-600">{formatCurrency(entry.amount)}</p>
                                                        <p className="text-xs text-gray-500">{formatDate(entry.date)}</p>
                                                        {entry.note && <p className="text-xs text-gray-600 mt-1">{entry.note}</p>}
                                                    </div>
                                                    <div className="flex gap-1 ml-2">
                                                        <button
                                                            onClick={() => handleEditInvestment(entry)}
                                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteInvestment(entry.id)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </>
                    )}
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
                        onClick={() => router.push('/daily')}
                        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left border border-gray-200"
                    >
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="font-semibold text-sm">Daily Collection</p>
                        <p className="text-xs text-gray-500 mt-1">Mark payments</p>
                    </button>
                </div>

                {/* Recent Customers */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Recent Customers</h3>
                        <button
                            onClick={() => router.push('/customers')}
                            className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            View All
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recentCustomers.length === 0 ? (
                            <p className="text-center text-gray-500 py-8 text-sm">No customers yet</p>
                        ) : (
                            recentCustomers.map(customer => (
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
                                        <p className="text-xs text-gray-500 capitalize">{customer.frequency}</p>
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
