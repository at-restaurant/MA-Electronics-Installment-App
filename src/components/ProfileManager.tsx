// src/components/ProfileManager.tsx - FIXED

'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Edit2, TrendingUp, TrendingDown } from 'lucide-react';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Profile, InvestmentEntry } from '@/types';

interface Props {
    onClose: () => void;
    onProfilesUpdate?: () => void;
}

export default function ProfileManager({ onClose, onProfilesUpdate }: Props) {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [showInvestmentForm, setShowInvestmentForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [investmentForm, setInvestmentForm] = useState({
        amount: '',
        note: '',
        type: 'INVESTED' as 'INVESTED' | 'RECEIVED',
        customerId: null as number | null
    });

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        const all = await db.profiles.toArray();
        setProfiles(all);
        if (all.length) setSelectedProfile(all[0]);
    };

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

        const entry: InvestmentEntry = {
            id: editingId || Date.now(),
            amount,
            date: new Date().toISOString(),
            note: investmentForm.note,
            type: investmentForm.type, // ✅ ADDED
            ...(investmentForm.customerId && { customerId: investmentForm.customerId }) // ✅ ADDED
        };

        let newHistory = [...(selectedProfile.investmentHistory || [])];
        let newTotal = selectedProfile.totalInvestment || 0;

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

        // Update total based on type
        if (entry.type === 'INVESTED') {
            newTotal += amount;
        } else {
            newTotal -= amount;
        }

        const updated = {
            ...selectedProfile,
            totalInvestment: newTotal,
            investmentHistory: newHistory
        };

        await db.profiles.update(selectedProfile.id, updated);
        setSelectedProfile(updated);
        setProfiles(profiles.map(p => p.id === selectedProfile.id ? updated : p));
        setInvestmentForm({ amount: '', note: '', type: 'INVESTED', customerId: null });
        setShowInvestmentForm(false);
        onProfilesUpdate?.();
    };

    const handleDeleteInvestment = async (entryId: number) => {
        if (!selectedProfile) return;
        if (!confirm('Delete this investment record?')) return;

        const entry = selectedProfile.investmentHistory?.find(e => e.id === entryId);
        if (!entry) return;

        let newTotal = selectedProfile.totalInvestment || 0;

        if (entry.type === 'INVESTED') {
            newTotal -= entry.amount;
        } else {
            newTotal += entry.amount;
        }

        const updated = {
            ...selectedProfile,
            totalInvestment: newTotal,
            investmentHistory: (selectedProfile.investmentHistory || []).filter(e => e.id !== entryId),
        };

        await db.profiles.update(selectedProfile.id, updated);
        setSelectedProfile(updated);
        setProfiles(profiles.map(p => p.id === selectedProfile.id ? updated : p));
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="font-bold text-lg">Profile & Investment</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
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
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedProfile && (
                        <>
                            {/* Investment Summary */}
                            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    <p className="font-semibold text-gray-700">Total Investment</p>
                                </div>
                                <p className="text-3xl font-bold text-green-600">
                                    {formatCurrency(selectedProfile.totalInvestment || 0)}
                                </p>
                            </div>

                            {/* Add Investment Button */}
                            <button
                                onClick={() => setShowInvestmentForm(!showInvestmentForm)}
                                className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                {showInvestmentForm ? 'Cancel' : 'Add Investment'}
                            </button>

                            {/* Add Investment Form */}
                            {showInvestmentForm && (
                                <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                                    {/* Type Selection */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setInvestmentForm({ ...investmentForm, type: 'INVESTED', customerId: null })}
                                            className={`py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                                                investmentForm.type === 'INVESTED'
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <TrendingUp className="w-4 h-4 inline mr-1" />
                                            Invested
                                        </button>
                                        <button
                                            onClick={() => setInvestmentForm({ ...investmentForm, type: 'RECEIVED' })}
                                            className={`py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                                                investmentForm.type === 'RECEIVED'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <TrendingDown className="w-4 h-4 inline mr-1" />
                                            Received
                                        </button>
                                    </div>

                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={investmentForm.amount}
                                        onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })}
                                        className="w-full px-3 py-2 border rounded text-sm"
                                    />
                                    <textarea
                                        placeholder="Note (optional)"
                                        value={investmentForm.note}
                                        onChange={(e) => setInvestmentForm({ ...investmentForm, note: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border rounded text-sm resize-none"
                                    />
                                    <button
                                        onClick={handleAddInvestment}
                                        className="w-full py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700"
                                    >
                                        {editingId ? 'Update' : 'Save'}
                                    </button>
                                </div>
                            )}

                            {/* Investment History */}
                            {selectedProfile.investmentHistory && selectedProfile.investmentHistory.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold mb-2">History</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {selectedProfile.investmentHistory
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((entry) => (
                                                <div key={entry.id} className="bg-gray-50 rounded p-2 flex justify-between items-start text-sm">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                entry.type === 'INVESTED'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {entry.type === 'INVESTED' ? 'Invested' : 'Received'}
                                                            </span>
                                                            <p className="font-medium">{formatCurrency(entry.amount)}</p>
                                                        </div>
                                                        <p className="text-xs text-gray-600">{formatDate(entry.date)}</p>
                                                        {entry.note && <p className="text-xs text-gray-500 mt-1">{entry.note}</p>}
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
                                            ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}