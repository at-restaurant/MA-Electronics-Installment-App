// src/app/dashboard/investment/page.tsx - MOBILE-FRIENDLY VERSION

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown,
    Wallet, Banknote, X, ArrowLeft, RefreshCw,
    ChevronRight, Calendar, FileText
} from 'lucide-react';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useCompact';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Profile, InvestmentEntry } from '@/types';

export default function InvestmentPage() {
    const router = useRouter();
    const { profile: currentProfile, reload: reloadProfile } = useProfile();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState('');

    const [form, setForm] = useState({
        amount: '',
        note: '',
        type: 'INVESTED' as 'INVESTED' | 'WITHDRAWN'
    });

    useEffect(() => {
        if (currentProfile) {
            loadData();
        }
    }, [currentProfile]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const p = await db.profiles.get(currentProfile!.id);
            if (p) {
                if (!p.investmentHistory) p.investmentHistory = [];
                if (p.totalInvestment === undefined) p.totalInvestment = 0;
                setProfile(p);
            } else {
                setError('Profile not found');
            }

            setLastUpdated(new Date().toLocaleTimeString('en-PK', {
                hour: '2-digit',
                minute: '2-digit'
            }));
        } catch (error) {
            console.error('Failed to load data:', error);
            setError('Failed to load investment data');
        } finally {
            setLoading(false);
        }
    };

    const calculateInvestmentSummary = () => {
        if (!profile) return { totalInvested: 0, totalWithdrawn: 0, netInvestment: 0, totalHistory: [] };

        const totalHistory = profile.investmentHistory || [];
        const totalInvested = totalHistory
            .filter(e => e.type === 'INVESTED')
            .reduce((sum, e) => sum + e.amount, 0);

        const totalWithdrawn = totalHistory
            .filter(e => e.type === 'WITHDRAWN')
            .reduce((sum, e) => sum + e.amount, 0);

        const netInvestment = totalInvested - totalWithdrawn;

        return { totalInvested, totalWithdrawn, netInvestment, totalHistory };
    };

    const handleSave = async () => {
        if (!form.amount || !profile) {
            alert('Please enter amount');
            return;
        }

        const amount = parseFloat(form.amount);
        if (amount <= 0 || isNaN(amount)) {
            alert('Please enter valid amount');
            return;
        }

        try {
            setError(null);

            const entry: InvestmentEntry = {
                id: editingId || Date.now(),
                amount,
                date: new Date().toISOString(),
                note: form.note.trim(),
                type: form.type
            };

            let newHistory = [...(profile.investmentHistory || [])];

            if (editingId) {
                newHistory = newHistory.map(e =>
                    e.id === editingId ? entry : e
                );
            } else {
                newHistory.unshift(entry);
            }

            // Calculate totals
            const totalInvested = newHistory
                .filter(e => e.type === 'INVESTED')
                .reduce((sum, e) => sum + e.amount, 0);

            const totalWithdrawn = newHistory
                .filter(e => e.type === 'WITHDRAWN')
                .reduce((sum, e) => sum + e.amount, 0);

            const netInvestment = totalInvested - totalWithdrawn;

            const updated = {
                ...profile,
                totalInvestment: netInvestment,
                investmentHistory: newHistory
            };

            await db.profiles.update(profile.id, updated);
            setProfile(updated);
            await reloadProfile();

            setForm({ amount: '', note: '', type: 'INVESTED' });
            setEditingId(null);
            setShowForm(false);

            alert(`✅ ${form.type === 'INVESTED' ? 'Investment added' : 'Withdrawal recorded'} successfully!`);

        } catch (error) {
            console.error('Failed to save:', error);
            setError('Failed to save transaction');
            alert('Failed to save transaction');
        }
    };

    const handleDelete = async (id: number) => {
        if (!profile || !confirm('Delete this transaction?')) return;

        try {
            setError(null);

            const newHistory = (profile.investmentHistory || [])
                .filter(e => e.id !== id);

            const totalInvested = newHistory
                .filter(e => e.type === 'INVESTED')
                .reduce((sum, e) => sum + e.amount, 0);

            const totalWithdrawn = newHistory
                .filter(e => e.type === 'WITHDRAWN')
                .reduce((sum, e) => sum + e.amount, 0);

            const netInvestment = totalInvested - totalWithdrawn;

            const updated = {
                ...profile,
                totalInvestment: netInvestment,
                investmentHistory: newHistory
            };

            await db.profiles.update(profile.id, updated);
            setProfile(updated);
            await reloadProfile();

            alert('✅ Transaction deleted successfully!');
        } catch (error) {
            console.error('Failed to delete:', error);
            setError('Failed to delete transaction');
        }
    };

    const handleEdit = (entry: InvestmentEntry) => {
        setForm({
            amount: entry.amount.toString(),
            note: entry.note || '',
            type: entry.type
        });
        setEditingId(entry.id);
        setShowForm(true);
    };

    const formatNumberCompact = (num: number): string => {
        if (Math.abs(num) >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (Math.abs(num) >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return Math.abs(num).toString();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4" />
                <p className="text-gray-600">Loading investment data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <GlobalHeader title="Investment" />
                <div className="pt-16 p-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={loadData}
                            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const { totalInvested, totalWithdrawn, netInvestment, totalHistory } =
        calculateInvestmentSummary();

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-4">
            <GlobalHeader
                title="Investment"
                rightAction={
                    <div className="flex gap-1">
                        <button
                            onClick={loadData}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => router.back()}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    </div>
                }
            />

            <div className="pt-16 p-3 space-y-3">
                {/* Last Updated */}
                {lastUpdated && (
                    <div className="text-right px-1">
                        <span className="text-xs text-gray-500">
                            Updated: {lastUpdated}
                        </span>
                    </div>
                )}

                {/* MOBILE OPTIMIZED SUMMARY CARDS */}
                <div className="grid grid-cols-3 gap-2">
                    {/* Current Balance */}
                    <div className={`rounded-lg p-3 text-white shadow-md ${
                        netInvestment >= 0
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                            : 'bg-gradient-to-br from-red-500 to-red-600'
                    }`}>
                        <div className="flex items-start justify-between mb-1">
                            <Wallet className="w-4 h-4 opacity-90" />
                            {netInvestment >= 0 ? (
                                <TrendingUp className="w-3 h-3 opacity-80" />
                            ) : (
                                <TrendingDown className="w-3 h-3 opacity-80" />
                            )}
                        </div>
                        <p className="text-[10px] opacity-90 mb-0.5">Current</p>
                        <p className="text-sm font-bold leading-tight">
                            {netInvestment >= 0 ? '' : '-'}₨{formatNumberCompact(netInvestment)}
                            {netInvestment < 0 && <span className="text-red-300 text-xs">▼</span>}
                        </p>
                    </div>

                    {/* Total Invested */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white shadow-md">
                        <div className="flex items-start justify-between mb-1">
                            <TrendingUp className="w-4 h-4 opacity-90" />
                            <Plus className="w-3 h-3 opacity-80" />
                        </div>
                        <p className="text-[10px] opacity-90 mb-0.5">Invested</p>
                        <p className="text-sm font-bold leading-tight">
                            ₨{formatNumberCompact(totalInvested)}
                        </p>
                    </div>

                    {/* Total Withdrawn */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow-md">
                        <div className="flex items-start justify-between mb-1">
                            <TrendingDown className="w-4 h-4 opacity-90" />
                            <Wallet className="w-3 h-3 opacity-80" />
                        </div>
                        <p className="text-[10px] opacity-90 mb-0.5">Withdrawn</p>
                        <p className="text-sm font-bold leading-tight">
                            ₨{formatNumberCompact(totalWithdrawn)}
                        </p>
                    </div>
                </div>

                {/* MOBILE OPTIMIZED QUICK STATS */}
                <div className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <h3 className="font-semibold text-gray-800 text-sm">Quick Stats</h3>
                        </div>
                        <span className="text-[10px] text-gray-500">
                            {totalHistory.length} transactions
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[10px] text-gray-500">Invested Count</p>
                            <p className="text-sm font-bold text-green-600">
                                {totalHistory.filter(e => e.type === 'INVESTED').length}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[10px] text-gray-500">Withdrawn Count</p>
                            <p className="text-sm font-bold text-blue-600">
                                {totalHistory.filter(e => e.type === 'WITHDRAWN').length}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-600">Net Balance</p>
                            <p className={`text-sm font-bold ${netInvestment >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                                {formatCurrency(netInvestment)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* MOBILE OPTIMIZED ADD TRANSACTION BUTTON */}
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                        <Plus className="w-5 h-5" />
                        Add Transaction
                    </button>
                )}

                {/* MOBILE OPTIMIZED TRANSACTION FORM */}
                {showForm && (
                    <div className="bg-white rounded-xl p-3 shadow-md border border-purple-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-sm">
                                {editingId ? 'Edit Transaction' : 'New Transaction'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingId(null);
                                    setForm({ amount: '', note: '', type: 'INVESTED' });
                                }}
                                className="p-1 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Type Selection - MOBILE OPTIMIZED */}
                            <div>
                                <label className="block text-xs font-medium mb-1.5">Type *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setForm({ ...form, type: 'INVESTED' })}
                                        className={`py-2.5 px-3 rounded-lg border transition-all font-medium flex flex-col items-center justify-center ${
                                            form.type === 'INVESTED'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <Banknote className="w-4 h-4 mb-1" />
                                        <span className="text-xs">Invested</span>
                                        <span className="text-[10px] mt-0.5 opacity-70">Add Money</span>
                                    </button>
                                    <button
                                        onClick={() => setForm({ ...form, type: 'WITHDRAWN' })}
                                        className={`py-2.5 px-3 rounded-lg border transition-all font-medium flex flex-col items-center justify-center ${
                                            form.type === 'WITHDRAWN'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <Wallet className="w-4 h-4 mb-1" />
                                        <span className="text-xs">Withdrawn</span>
                                        <span className="text-[10px] mt-0.5 opacity-70">Take Money</span>
                                    </button>
                                </div>
                            </div>

                            {/* Amount - MOBILE OPTIMIZED */}
                            <div>
                                <label className="block text-xs font-medium mb-1.5">Amount (₨) *</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        placeholder="Enter amount"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                                        autoFocus
                                        min="1"
                                        step="100"
                                    />
                                </div>
                            </div>

                            {/* Note - MOBILE OPTIMIZED */}
                            <div>
                                <label className="block text-xs font-medium mb-1.5">
                                    Note (Optional)
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
                                    <textarea
                                        placeholder="e.g., Bank transfer, Business expense..."
                                        value={form.note}
                                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                                        rows={2}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons - MOBILE OPTIMIZED */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingId(null);
                                        setForm({ amount: '', note: '', type: 'INVESTED' });
                                    }}
                                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className={`flex-1 py-2.5 text-white rounded-lg font-semibold text-sm active:scale-[0.98] transition-all ${
                                        form.type === 'INVESTED'
                                            ? 'bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90'
                                            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90'
                                    }`}
                                    disabled={!form.amount || parseFloat(form.amount) <= 0}
                                >
                                    {editingId ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MOBILE OPTIMIZED TRANSACTION HISTORY */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <h3 className="font-semibold text-gray-800 text-sm">
                                Transaction History
                            </h3>
                        </div>
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-medium px-2 py-0.5 rounded-full">
                            {totalHistory.length}
                        </span>
                    </div>

                    {totalHistory.length === 0 ? (
                        <div className="p-8 text-center">
                            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No transactions yet</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Add your first investment or withdrawal
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {totalHistory.map((entry) => {
                                const isInvested = entry.type === 'INVESTED';
                                return (
                                    <div
                                        key={entry.id}
                                        className="p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <div className={`p-1.5 rounded-lg ${
                                                        isInvested ? 'bg-green-100' : 'bg-blue-100'
                                                    }`}>
                                                        {isInvested ? (
                                                            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                                                        ) : (
                                                            <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className={`font-bold text-sm truncate ${
                                                                isInvested ? 'text-green-600' : 'text-blue-600'
                                                            }`}>
                                                                {formatCurrency(entry.amount)}
                                                            </p>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                                                isInvested
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {isInvested ? 'INVESTED' : 'WITHDRAWN'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <Calendar className="w-3 h-3 text-gray-400" />
                                                            <p className="text-xs text-gray-500">
                                                                {formatDate(entry.date)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {entry.note && (
                                                    <div className="ml-11">
                                                        <div className="flex items-start gap-1">
                                                            <FileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                                            <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded flex-1">
                                                                {entry.note}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-1 ml-1">
                                                <button
                                                    onClick={() => handleEdit(entry)}
                                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Summary Footer */}
                    {totalHistory.length > 0 && (
                        <div className="p-3 bg-gray-50 border-t">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-gray-500">Total Transactions</p>
                                    <p className="text-sm font-bold">{totalHistory.length}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Net Balance</p>
                                    <p className={`text-sm font-bold ${
                                        netInvestment >= 0 ? 'text-purple-600' : 'text-red-600'
                                    }`}>
                                        {formatCurrency(netInvestment)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions Footer */}
                <div className="flex flex-col gap-2 pt-2">
                    <button
                        onClick={() => {
                            const summary = calculateInvestmentSummary();
                            alert(
                                `📊 Investment Summary\n\n` +
                                `Total Invested: ${formatCurrency(summary.totalInvested)}\n` +
                                `Total Withdrawn: ${formatCurrency(summary.totalWithdrawn)}\n` +
                                `Net Balance: ${formatCurrency(summary.netInvestment)}\n` +
                                `Transactions: ${summary.totalHistory.length}`
                            );
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-lg font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                        View Complete Summary
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Dashboard
                        </button>
                        <button
                            onClick={loadData}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}