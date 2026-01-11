'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users,
    TrendingUp,
    AlertCircle,
    Plus,
    Edit2,
    Trash2,
    DollarSign,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useCompact';
import { formatCurrency } from '@/lib/utils';
import type { Profile, InvestmentEntry } from '@/types';

export default function Dashboard() {
    const router = useRouter();
    const { profile: currentProfile } = useProfile();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [stats, setStats] = useState({
        totalCustomers: 0,
        activeCustomers: 0,
        totalReceived: 0,
        totalExpected: 0,
    });
    const [showInvestmentForm, setShowInvestmentForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({ amount: '', note: '' });

    useEffect(() => {
        if (currentProfile) {
            loadData();
        }
    }, [currentProfile]);

    const loadData = async () => {
        try {
            const p = await db.profiles.get(currentProfile!  . id);
            if (p) setProfile(p);

            const statsData = await db.calculateStatistics(currentProfile!.id);
            setStats({
                totalCustomers: statsData.totalCustomers,
                activeCustomers: statsData.activeCustomers,
                totalReceived: statsData.totalReceived,
                totalExpected:  statsData.totalExpected,
            });
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const handleSaveInvestment = async () => {
        if (!form.amount || !profile) {
            alert('Enter investment amount');
            return;
        }

        const amount = parseFloat(form.amount);
        if (amount <= 0) {
            alert('Enter valid amount');
            return;
        }

        try {
            const entry: InvestmentEntry = {
                id: editingId || Date.now(),
                amount,
                date: new Date().toISOString(),
                note: form.note,
            };

            let newHistory = [... (profile. investmentHistory || [])];
            let newTotal = profile.totalInvestment || 0;

            if (editingId) {
                const oldEntry = newHistory.find(e => e.id === editingId);
                if (oldEntry) {
                    newTotal = newTotal - oldEntry.amount + amount;
                    newHistory = newHistory.map(e => (e.id === editingId ?  entry : e));
                }
                setEditingId(null);
            } else {
                newHistory.push(entry);
                newTotal += amount;
            }

            const updated = { ...profile, totalInvestment: newTotal, investmentHistory: newHistory };
            await db.profiles.update(profile.id, updated);
            setProfile(updated);
            setForm({ amount: '', note: '' });
            setShowInvestmentForm(false);
        } catch (error) {
            console.error('Failed to save investment:', error);
            alert('Failed to save investment');
        }
    };

    const handleDeleteInvestment = async (id: number) => {
        if (!profile || !confirm('Delete this entry?')) return;

        try {
            const entry = profile.investmentHistory?.find(e => e.id === id);
            if (! entry) return;

            const updated = {
                ...profile,
                totalInvestment: (profile.totalInvestment || 0) - entry.amount,
                investmentHistory: (profile.investmentHistory || []).filter(e => e.id !== id),
            };

            await db.profiles.update(profile. id, updated);
            setProfile(updated);
        } catch (error) {
            console.error('Failed to delete investment:', error);
            alert('Failed to delete investment');
        }
    };

    const handleEditInvestment = (entry: InvestmentEntry) => {
        setForm({ amount: entry.amount.toString(), note: entry.note || '' });
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

    const collectionRate = stats.totalExpected > 0 ? (stats.totalReceived / stats.totalExpected) * 100 : 0;
    const totalHistory = profile.investmentHistory || [];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Dashboard" />

            <div className="pt-16 p-4 max-w-2xl mx-auto space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div
                        onClick={() => router.push('/customers')}
                        className="bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <p className="text-xs text-gray-600">Customers</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalCustomers}</p>
                        <p className="text-xs text-gray-500 mt-1">{stats.activeCustomers} active</p>
                    </div>

                    <div
                        onClick={() => router.push('/pending')}
                        className="bg-white rounded-lg p-4 shadow-sm cursor-pointer hover: shadow-md"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <p className="text-xs text-gray-600">Pending</p>
                        </div>
                        <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(stats.totalExpected - stats.totalReceived)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Overdue amount</p>
                    </div>

                    <div
                        onClick={() => router.push('/daily')}
                        className="bg-white rounded-lg p-4 shadow-sm cursor-pointer hover: shadow-md"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <p className="text-xs text-gray-600">Received</p>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalReceived)}</p>
                        <p className="text-xs text-gray-500 mt-1">{Math.round(collectionRate)}% collected</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                            <p className="text-xs text-gray-600">Investment</p>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">{formatCurrency(profile.totalInvestment || 0)}</p>
                        <p className="text-xs text-gray-500 mt-1">{totalHistory.length} entries</p>
                    </div>
                </div>

                {/* Investment Section */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                        Investment Tracking
                    </h3>

                    {! showInvestmentForm ? (
                        <button
                            onClick={() => {
                                setShowInvestmentForm(true);
                                setEditingId(null);
                                setForm({ amount: '', note:  '' });
                            }}
                            className="w-full py-2 bg-purple-50 text-purple-600 rounded-lg font-medium hover:bg-purple-100 flex items-center justify-center gap-2 text-sm mb-3"
                        >
                            <Plus className="w-4 h-4" />
                            Add Investment
                        </button>
                    ) : (
                        <div className="space-y-2 mb-3">
                            <input
                                type="number"
                                placeholder="Amount (₨)"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                autoFocus
                            />
                            <textarea
                                placeholder="Note (purpose, details... )"
                                value={form.note}
                                onChange={(e) => setForm({ ...form, note: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveInvestment}
                                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 text-sm"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setShowInvestmentForm(false);
                                        setEditingId(null);
                                        setForm({ amount: '', note:  '' });
                                    }}
                                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Recent Investments */}
                    {totalHistory.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-600 font-semibold">Recent Entries</p>
                            {totalHistory
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .slice(0, 3)
                                .map((entry) => (
                                    <div key={entry.id} className="flex justify-between items-start bg-gray-50 rounded p-2 text-xs">
                                        <div className="flex-1">
                                            <p className="font-bold text-purple-600">{formatCurrency(entry.amount)}</p>
                                            {entry.note && <p className="text-gray-600 mt-1">{entry. note}</p>}
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                            <button
                                                onClick={() => handleEditInvestment(entry)}
                                                className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteInvestment(entry.id)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => router.push('/customers/add')}
                        className="bg-blue-600 text-white rounded-lg p-3 font-medium hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Customer
                    </button>
                    <button
                        onClick={() => router.push('/daily')}
                        className="bg-green-600 text-white rounded-lg p-3 font-medium hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Record Payment
                    </button>
                </div>
            </div>

            <Navigation currentPage="dashboard" />
        </div>
    );
}