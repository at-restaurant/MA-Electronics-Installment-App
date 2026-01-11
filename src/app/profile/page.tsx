'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, TrendingUp } from 'lucide-react';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useCompact';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Profile, InvestmentEntry } from '@/types';

export default function ProfilePage() {
    const { profile: currentProfile } = useProfile();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({ amount: '', note: '' });

    useEffect(() => {
        if (currentProfile) loadProfile();
    }, [currentProfile]);

    const loadProfile = async () => {
        const p = await db.profiles.get(currentProfile! .id);
        if (p) setProfile(p);
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

        const entry: InvestmentEntry = {
            id: editingId || Date.now(),
            amount,
            date: new Date().toISOString(),
            note: form.note,
        };

        let newHistory = [...(profile. investmentHistory || [])];
        let newTotal = profile.totalInvestment || 0;

        if (editingId) {
            // Edit mode - remove old, add new
            const oldEntry = newHistory.find(e => e.id === editingId);
            if (oldEntry) {
                newTotal = newTotal - oldEntry.amount + amount;
                newHistory = newHistory.map(e => (e.id === editingId ?  entry : e));
            }
            setEditingId(null);
        } else {
            // Add mode
            newHistory.push(entry);
            newTotal += amount;
        }

        const updated = { ...profile, totalInvestment: newTotal, investmentHistory: newHistory };
        await db.profiles.update(profile.id, updated);
        setProfile(updated);
        setForm({ amount: '', note: '' });
        setShowForm(false);
    };

    const handleDelete = async (id: number) => {
        if (! profile || ! confirm('Delete this entry?')) return;

        const entry = profile.investmentHistory?.find(e => e.id === id);
        if (!entry) return;

        const updated = {
            ...profile,
            totalInvestment: (profile.totalInvestment || 0) - entry.amount,
            investmentHistory: (profile.investmentHistory || []).filter(e => e.id !== id),
        };

        await db.profiles.update(profile. id, updated);
        setProfile(updated);
    };

    const handleEdit = (entry: InvestmentEntry) => {
        setForm({ amount: entry.amount.toString(), note: entry.note || '' });
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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Investment Tracking" />

            <div className="pt-16 p-4 max-w-2xl mx-auto">
                {/* Total Investment Card */}
                <div className={`bg-gradient-to-br ${profile.gradient} rounded-2xl p-6 text-white shadow-lg mb-4`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Total Investment</p>
                            <p className="text-4xl font-bold mt-1">{formatCurrency(profile.totalInvestment || 0)}</p>
                            <p className="text-xs opacity-75 mt-2">{totalHistory.length} entries</p>
                        </div>
                        <TrendingUp className="w-12 h-12 opacity-50" />
                    </div>
                </div>

                {/* Add/Edit Form */}
                <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    {! showForm ? (
                        <button
                            onClick={() => {
                                setShowForm(true);
                                setEditingId(null);
                                setForm({ amount: '', note:  '' });
                            }}
                            className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {editingId ? 'Update' : 'Add'} Investment
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <input
                                type="number"
                                placeholder="Amount (₨)"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <textarea
                                placeholder="Note (purpose, date, details... )"
                                value={form.note}
                                onChange={(e) => setForm({ ...form, note: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingId(null);
                                        setForm({ amount: '', note:  '' });
                                    }}
                                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* History List */}
                {totalHistory.length > 0 ? (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold mb-3">Investment History</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {totalHistory
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((entry) => (
                                    <div key={entry. id} className="flex items-start justify-between bg-gray-50 rounded p-3 text-sm">
                                        <div className="flex-1">
                                            <p className="font-bold text-green-600">{formatCurrency(entry.amount)}</p>
                                            <p className="text-xs text-gray-600">{formatDate(entry.date)}</p>
                                            {entry.note && <p className="text-xs text-gray-700 mt-1">{entry.note}</p>}
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEdit(entry)}
                                                className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg p-8 text-center shadow-sm text-gray-500">
                        <p>No investments yet</p>
                    </div>
                )}

                {/* Summary Stats */}
                {totalHistory.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                        <div className="bg-white rounded p-3 shadow-sm">
                            <p className="text-gray-600">Total Entries</p>
                            <p className="font-bold text-lg">{totalHistory.length}</p>
                        </div>
                        <div className="bg-white rounded p-3 shadow-sm">
                            <p className="text-gray-600">Average</p>
                            <p className="font-bold text-lg">
                                {formatCurrency(Math.round((profile.totalInvestment || 0) / totalHistory.length))}
                            </p>
                        </div>
                        <div className="bg-white rounded p-3 shadow-sm">
                            <p className="text-gray-600">Latest</p>
                            <p className="font-bold text-lg">{formatDate(totalHistory[0].date)}</p>
                        </div>
                    </div>
                )}
            </div>

            <Navigation currentPage="profile" />
        </div>
    );
}