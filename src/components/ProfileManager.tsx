// src/components/ProfileManager.tsx - PRODUCTION READY (FIXED)

'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Edit2, TrendingUp, TrendingDown, UserCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Profile, InvestmentEntry, Customer } from '@/types';

interface Props {
    onClose: () => void;
    onProfilesUpdate?: () => void;
}

export default function ProfileManager({ onClose, onProfilesUpdate }: Props) {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [showInvestmentForm, setShowInvestmentForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // ✅ FIXED: Proper typing with InvestmentEntry type
    const [investmentForm, setInvestmentForm] = useState<{
        amount: string;
        note: string;
        type: 'INVESTED' | 'WITHDRAWN';
        customerId: number | null;
    }>({
        amount: '',
        note: '',
        type: 'INVESTED',
        customerId: null
    });

    useEffect(() => {
        loadProfiles();
    }, []);

    useEffect(() => {
        if (selectedProfile) {
            loadCustomers();
        }
    }, [selectedProfile]);

    const loadProfiles = async () => {
        const all = await db.profiles.toArray();
        setProfiles(all);
        if (all.length > 0) {
            setSelectedProfile(all[0]);
        }
    };

    const loadCustomers = async () => {
        if (!selectedProfile) return;
        const allCustomers = await db.getCustomersByProfile(selectedProfile.id);
        setCustomers(allCustomers);
    };

    // ✅ FIXED: Proper investment entry creation
    const handleAddInvestment = async () => {
        if (!selectedProfile || !investmentForm.amount) {
            alert('Enter investment amount');
            return;
        }

        const amount = parseFloat(investmentForm.amount);
        if (amount <= 0) {
            alert('Enter valid amount');
            return;
        }

        // ✅ Validate customer selection for RECEIVED type
        if (investmentForm.type === 'WITHDRAWN' && !investmentForm.customerId) {
            alert('Please select a customer for received payment');
            return;
        }

        try {
            // ✅ Create proper InvestmentEntry
            const entry: InvestmentEntry = {
                id: editingId || Date.now(),
                amount,
                date: new Date().toISOString(),
                note: investmentForm.note,
                type: investmentForm.type,
                ...(investmentForm.customerId && { customerId: investmentForm.customerId })
            };

            let newHistory = [...(selectedProfile.investmentHistory || [])];
            let newTotal = selectedProfile.totalInvestment || 0;

            // Update existing or add new
            if (editingId) {
                const oldEntry = newHistory.find(e => e.id === editingId);
                if (oldEntry) {
                    // Reverse old entry's effect
                    if (oldEntry.type === 'INVESTED') {
                        newTotal -= oldEntry.amount;
                    } else {
                        newTotal += oldEntry.amount;
                    }
                    // Replace entry
                    newHistory = newHistory.map(e => (e.id === editingId ? entry : e));
                }
                setEditingId(null);
            } else {
                newHistory.push(entry);
            }

            // Apply new entry's effect
            if (entry.type === 'INVESTED') {
                newTotal += amount;
            } else {
                newTotal -= amount;
            }

            // ✅ Update profile
            const updated: Profile = {
                ...selectedProfile,
                totalInvestment: newTotal,
                investmentHistory: newHistory
            };

            await db.profiles.update(selectedProfile.id, {
                totalInvestment: newTotal,
                investmentHistory: newHistory
            });

            // ✅ If RECEIVED, also add payment to customer
            if (entry.type === 'WITHDRAWN' && entry.customerId) {
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

                    // Update customer's paid amount
                    const newPaidAmount = customer.paidAmount + amount;
                    await db.customers.update(customer.id, {
                        paidAmount: newPaidAmount,
                        lastPayment: payment.date,
                        status: newPaidAmount >= customer.totalAmount ? 'completed' : 'active'
                    });

                    alert(`✅ Payment added to ${customer.name}'s account!`);
                }
            }

            setSelectedProfile(updated);
            setProfiles(profiles.map(p => p.id === selectedProfile.id ? updated : p));
            setInvestmentForm({ amount: '', note: '', type: 'INVESTED', customerId: null });
            setShowInvestmentForm(false);
            onProfilesUpdate?.();

            alert('✅ Investment entry saved!');
        } catch (error) {
            console.error('Failed to save investment:', error);
            alert('❌ Failed to save investment');
        }
    };

    const handleDeleteInvestment = async (entryId: number) => {
        if (!selectedProfile) return;
        if (!confirm('Delete this investment record?')) return;

        try {
            const entry = selectedProfile.investmentHistory?.find(e => e.id === entryId);
            if (!entry) return;

            let newTotal = selectedProfile.totalInvestment || 0;

            // Reverse the entry's effect
            if (entry.type === 'INVESTED') {
                newTotal -= entry.amount;
            } else {
                newTotal += entry.amount;
            }

            const updated: Profile = {
                ...selectedProfile,
                totalInvestment: newTotal,
                investmentHistory: (selectedProfile.investmentHistory || []).filter(e => e.id !== entryId),
            };

            await db.profiles.update(selectedProfile.id, {
                totalInvestment: newTotal,
                investmentHistory: updated.investmentHistory
            });

            setSelectedProfile(updated);
            setProfiles(profiles.map(p => p.id === selectedProfile.id ? updated : p));
            onProfilesUpdate?.();
        } catch (error) {
            console.error('Failed to delete investment:', error);
            alert('❌ Failed to delete entry');
        }
    };

    const handleEditInvestment = (entry: InvestmentEntry) => {
        setInvestmentForm({
            amount: entry.amount.toString(),
            note: entry.note || '',
            type: entry.type,
            customerId: entry.customerId || null
        });
        setEditingId(entry.id);
        setShowInvestmentForm(true);
    };

    // ✅ Calculate breakdown
    const totalInvested = (selectedProfile?.investmentHistory || [])
        .filter(e => e.type === 'INVESTED')
        .reduce((sum, e) => sum + e.amount, 0);

    const totalReceived = (selectedProfile?.investmentHistory || [])
        .filter(e => e.type === 'WITHDRAWN')
        .reduce((sum, e) => sum + e.amount, 0);

    const netInvestment = totalInvested - totalReceived;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="font-bold text-lg">Profile & Investment</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
                        ×
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Profile Selector */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Select Profile</label>
                        <select
                            value={selectedProfile?.id || ''}
                            onChange={(e) => {
                                const p = profiles.find(pr => pr.id === Number(e.target.value));
                                setSelectedProfile(p || null);
                            }}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedProfile && (
                        <>
                            {/* ✅ Investment Summary Cards */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                                    <p className="text-xs text-green-700 mb-1">Invested</p>
                                    <p className="text-sm font-bold text-green-700 truncate">
                                        {formatCurrency(totalInvested)}
                                    </p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                                    <p className="text-xs text-blue-700 mb-1">Received</p>
                                    <p className="text-sm font-bold text-blue-700 truncate">
                                        {formatCurrency(totalReceived)}
                                    </p>
                                </div>
                                <div className={`rounded-lg p-3 border-2 ${
                                    netInvestment >= 0
                                        ? 'bg-purple-50 border-purple-200'
                                        : 'bg-red-50 border-red-200'
                                }`}>
                                    <p className={`text-xs mb-1 ${
                                        netInvestment >= 0 ? 'text-purple-700' : 'text-red-700'
                                    }`}>Net</p>
                                    <p className={`text-sm font-bold truncate ${
                                        netInvestment >= 0 ? 'text-purple-700' : 'text-red-700'
                                    }`}>
                                        {formatCurrency(Math.abs(netInvestment))}
                                    </p>
                                </div>
                            </div>

                            {/* Add Investment Button */}
                            <button
                                onClick={() => setShowInvestmentForm(!showInvestmentForm)}
                                className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 flex items-center justify-center gap-2 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                {showInvestmentForm ? 'Cancel' : 'Add Investment'}
                            </button>

                            {/* ✅ Investment Form */}
                            {showInvestmentForm && (
                                <div className="bg-blue-50 rounded-lg p-3 space-y-3 border-2 border-blue-200">
                                    <p className="text-sm font-semibold text-blue-700">
                                        {editingId ? '✏️ Edit Transaction' : '➕ New Transaction'}
                                    </p>

                                    {/* Type Selection */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setInvestmentForm({
                                                ...investmentForm,
                                                type: 'INVESTED',
                                                customerId: null
                                            })}
                                            className={`py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                                                investmentForm.type === 'INVESTED'
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <TrendingUp className="w-4 h-4 inline mr-1" />
                                            Maine Diye
                                        </button>
                                        <button
                                            onClick={() => setInvestmentForm({
                                                ...investmentForm,
                                                type: 'WITHDRAWN'
                                            })}
                                            className={`py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                                                investmentForm.type === 'WITHDRAWN'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <TrendingDown className="w-4 h-4 inline mr-1" />
                                            Maine Liye
                                        </button>
                                    </div>

                                    {/* ✅ Customer Selection (only for RECEIVED) */}
                                    {investmentForm.type === 'WITHDRAWN' && (
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-blue-700">
                                                Customer *
                                            </label>
                                            <select
                                                value={investmentForm.customerId || ''}
                                                onChange={(e) => setInvestmentForm({
                                                    ...investmentForm,
                                                    customerId: Number(e.target.value) || null
                                                })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">-- Select Customer --</option>
                                                {customers.map(c => {
                                                    const remaining = c.totalAmount - c.paidAmount;
                                                    return (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name} - {remaining > 0
                                                            ? `${formatCurrency(remaining)} remaining`
                                                            : 'Completed ✓'}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            {customers.length === 0 && (
                                                <p className="text-xs text-yellow-600 mt-1">
                                                    ⚠️ No customers found
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Amount */}
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-blue-700">
                                            Amount (₨) *
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="Enter amount"
                                            value={investmentForm.amount}
                                            onChange={(e) => setInvestmentForm({
                                                ...investmentForm,
                                                amount: e.target.value
                                            })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Note */}
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-blue-700">
                                            Note (Optional)
                                        </label>
                                        <textarea
                                            placeholder="Add a note..."
                                            value={investmentForm.note}
                                            onChange={(e) => setInvestmentForm({
                                                ...investmentForm,
                                                note: e.target.value
                                            })}
                                            rows={2}
                                            className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Save Button */}
                                    <button
                                        onClick={handleAddInvestment}
                                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        {editingId ? 'Update' : 'Save'}
                                    </button>
                                </div>
                            )}

                            {/* ✅ Investment History */}
                            {selectedProfile.investmentHistory && selectedProfile.investmentHistory.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-purple-600" />
                                        Transaction History ({selectedProfile.investmentHistory.length})
                                    </p>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {selectedProfile.investmentHistory
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((entry) => {
                                                const customer = entry.customerId
                                                    ? customers.find(c => c.id === entry.customerId)
                                                    : null;

                                                return (
                                                    <div
                                                        key={entry.id}
                                                        className="bg-gray-50 rounded-lg p-3 flex justify-between items-start text-sm"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    entry.type === 'INVESTED'
                                                                        ? 'bg-green-100 text-green-700'
                                                                        : 'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                    {entry.type === 'INVESTED' ? (
                                                                        <>
                                                                            <TrendingUp className="w-3 h-3 inline mr-1" />
                                                                            Invested
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <TrendingDown className="w-3 h-3 inline mr-1" />
                                                                            Received
                                                                        </>
                                                                    )}
                                                                </span>
                                                                <p className="font-bold truncate">
                                                                    {formatCurrency(entry.amount)}
                                                                </p>
                                                            </div>
                                                            <p className="text-xs text-gray-600">
                                                                {formatDate(entry.date)}
                                                            </p>
                                                            {entry.note && (
                                                                <p className="text-xs text-gray-500 mt-1 truncate">
                                                                    {entry.note}
                                                                </p>
                                                            )}
                                                            {customer && (
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <UserCheck className="w-3 h-3 text-purple-600" />
                                                                    <p className="text-xs text-purple-600 font-medium truncate">
                                                                        {customer.name}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-1 ml-2 flex-shrink-0">
                                                            <button
                                                                onClick={() => handleEditInvestment(entry)}
                                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteInvestment(entry.id)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {(!selectedProfile.investmentHistory || selectedProfile.investmentHistory.length === 0) && (
                                <div className="text-center py-8">
                                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No investment history yet</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}