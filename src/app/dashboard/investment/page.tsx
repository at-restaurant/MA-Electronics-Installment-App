// src/app/investment/page.tsx - COMPLETE INVESTMENT MANAGEMENT

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown, UserCheck, X, ArrowLeft
} from 'lucide-react';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useCompact';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Profile, InvestmentEntry, Customer } from '@/types';

export default function InvestmentPage() {
    const router = useRouter();
    const { profile: currentProfile } = useProfile();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [form, setForm] = useState({
        amount: '',
        note: '',
        type: 'INVESTED' as 'INVESTED' | 'RECEIVED',
        customerId: null as number | null
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
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const handleSave = async () => {
        if (!form.amount || !profile) {
            alert('Enter investment amount');
            return;
        }

        const amount = parseFloat(form.amount);
        if (amount <= 0) {
            alert('Enter valid amount');
            return;
        }

        if (form.type === 'RECEIVED' && !form.customerId) {
            alert('Please select a customer');
            return;
        }

        try {
            const entry: InvestmentEntry = {
                id: editingId || Date.now(),
                amount,
                date: new Date().toISOString(),
                note: form.note,
                type: form.type,
                ...(form.customerId && { customerId: form.customerId })
            };

            let newHistory = [...(profile.investmentHistory || [])];
            let newTotal = profile.totalInvestment || 0;

            if (editingId) {
                const oldEntry = newHistory.find(e => e.id === editingId);
                if (oldEntry) {
                    if (oldEntry.type === 'INVESTED') {
                        newTotal = newTotal - oldEntry.amount;
                    } else {
                        newTotal = newTotal + oldEntry.amount;
                    }
                    newHistory = newHistory.map(e => (e.id === editingId ? entry : e));
                }
                setEditingId(null);
            } else {
                newHistory.push(entry);
            }

            if (entry.type === 'INVESTED') {
                newTotal += amount;
            } else {
                newTotal -= amount;
            }

            const updated = {
                ...profile,
                totalInvestment: newTotal,
                investmentHistory: newHistory
            };

            // If RECEIVED, add payment to customer
            if (entry.type === 'RECEIVED' && entry.customerId) {
                const customer = await db.customers.get(entry.customerId);
                if (customer) {
                    const payment = {
                        id: Date.now(),
                        customerId: entry.customerId,
                        amount: entry.amount,
                        date: new Date().toISOString().split('T')[0],
                        createdAt: new Date().toISOString(),
                        paymentSource: 'offline' as const
                    };

                    await db.payments.add(payment);

                    const newPaidAmount = customer.paidAmount + amount;
                    await db.customers.update(customer.id, {
                        paidAmount: newPaidAmount,
                        lastPayment: payment.date,
                        status: newPaidAmount >= customer.totalAmount ? 'completed' : 'active'
                    });

                    alert(`✅ Payment added to ${customer.name}'s account!`);
                }
            }

            await db.profiles.update(profile.id, updated);
            setProfile(updated);
            setForm({ amount: '', note: '', type: 'INVESTED', customerId: null });
            setShowForm(false);

            await loadData();
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save investment');
        }
    };

    const handleDelete = async (id: number) => {
        if (!profile || !confirm('Delete this entry?')) return;

        try {
            const entry = profile.investmentHistory?.find(e => e.id === id);
            if (!entry) return;

            let newTotal = profile.totalInvestment || 0;

            if (entry.type === 'INVESTED') {
                newTotal -= entry.amount;
            } else {
                newTotal += entry.amount;
            }

            const updated = {
                ...profile,
                totalInvestment: newTotal,
                investmentHistory: (profile.investmentHistory || []).filter(e => e.id !== id)
            };

            await db.profiles.update(profile.id, updated);
            setProfile(updated);
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete entry');
        }
    };

    const handleEdit = (entry: InvestmentEntry) => {
        setForm({
            amount: entry.amount.toString(),
            note: entry.note || '',
            type: entry.type,
            customerId: entry.customerId || null
        });
        setEditingId(entry.id);
        setShowForm(true);
    };

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    const totalHistory = profile.investmentHistory || [];
    const totalInvested = totalHistory.filter(e => e.type === 'INVESTED').reduce((sum, e) => sum + e.amount, 0);
    const totalReceived = totalHistory.filter(e => e.type === 'RECEIVED').reduce((sum, e) => sum + e.amount, 0);
    const netInvestment = totalInvested - totalReceived;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader
                title="Investment"
                rightAction={
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                }
            />

            <div className="pt-16 p-4 space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className={`rounded-xl p-4 text-white shadow-lg ${netInvestment >= 0 ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
                        <DollarSign className="w-6 h-6 mb-2 opacity-80" />
                        <p className="text-xs opacity-90 mb-1">Net</p>
                        <p className="text-xl font-bold">
                            {netInvestment < 0 && '-'}₨{Math.abs(netInvestment).toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
                        <TrendingUp className="w-6 h-6 mb-2 opacity-80" />
                        <p className="text-xs opacity-90 mb-1">Invested</p>
                        <p className="text-xl font-bold">{formatCurrency(totalInvested)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                        <TrendingDown className="w-6 h-6 mb-2 opacity-80" />
                        <p className="text-xs opacity-90 mb-1">Received</p>
                        <p className="text-xl font-bold">{formatCurrency(totalReceived)}</p>
                    </div>
                </div>

                {/* Add Button */}
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        Add Transaction
                    </button>
                )}

                {/* Form */}
                {showForm && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-purple-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg">
                                {editingId ? 'Edit Transaction' : 'New Transaction'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingId(null);
                                    setForm({ amount: '', note: '', type: 'INVESTED', customerId: null });
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Type Selection */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Type *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setForm({ ...form, type: 'INVESTED', customerId: null })}
                                        className={`py-3 px-4 rounded-lg border-2 transition-all font-medium ${
                                            form.type === 'INVESTED'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <TrendingUp className="w-5 h-5 inline mr-2" />
                                        Maine Diye
                                    </button>
                                    <button
                                        onClick={() => setForm({ ...form, type: 'RECEIVED' })}
                                        className={`py-3 px-4 rounded-lg border-2 transition-all font-medium ${
                                            form.type === 'RECEIVED'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <TrendingDown className="w-5 h-5 inline mr-2" />
                                        Maine Liye
                                    </button>
                                </div>
                            </div>

                            {/* Customer (for RECEIVED only) */}
                            {form.type === 'RECEIVED' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Customer *</label>
                                    <select
                                        value={form.customerId || ''}
                                        onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })}
                                        className="w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">-- Select Customer --</option>
                                        {customers.map(c => {
                                            const remaining = c.totalAmount - c.paidAmount;
                                            return (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} - {remaining > 0 ? formatCurrency(remaining) + ' remaining' : 'Completed ✓'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Amount (₨) *</label>
                                <input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={form.amount}
                                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                    className="w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    autoFocus
                                />
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Note (Optional)</label>
                                <textarea
                                    placeholder="Add a note..."
                                    value={form.note}
                                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSave}
                                className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                            >
                                {editingId ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </div>
                )}

                {/* History */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b">
                        <h3 className="font-bold">
                            Transaction History ({totalHistory.length})
                        </h3>
                    </div>

                    {totalHistory.length === 0 ? (
                        <div className="p-12 text-center">
                            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No transactions yet</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {totalHistory
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((entry) => {
                                    const customer = entry.customerId ? customers.find(c => c.id === entry.customerId) : null;
                                    return (
                                        <div key={entry.id} className="p-4 hover:bg-gray-50">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {entry.type === 'INVESTED' ? (
                                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                                <TrendingUp className="w-3 h-3 inline mr-1" />
                                                                Invested
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                                <TrendingDown className="w-3 h-3 inline mr-1" />
                                                                Received
                                                            </span>
                                                        )}
                                                        <p className={`font-bold text-lg ${entry.type === 'INVESTED' ? 'text-green-600' : 'text-blue-600'}`}>
                                                            {formatCurrency(entry.amount)}
                                                        </p>
                                                    </div>

                                                    <p className="text-sm text-gray-500 mb-1">
                                                        {formatDate(entry.date)}
                                                    </p>

                                                    {entry.note && (
                                                        <p className="text-sm text-gray-700 mb-2">{entry.note}</p>
                                                    )}

                                                    {customer && (
                                                        <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded inline-flex">
                                                            <UserCheck className="w-3 h-3 text-purple-600" />
                                                            <p className="text-xs text-purple-600 font-medium">{customer.name}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-1 ml-2">
                                                    <button
                                                        onClick={() => handleEdit(entry)}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(entry.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}