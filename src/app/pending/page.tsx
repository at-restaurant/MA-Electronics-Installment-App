// src/app/pending/page.tsx - FIXED WITH FREQUENCY AWARENESS

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Phone, MapPin } from 'lucide-react';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useCompact';
import { formatCurrency, formatDate, calculateDaysOverdue, getTimeUntilDue } from '@/lib/utils';
import type { Customer } from '@/types';

type OverdueType = 'overdue_7' | 'overdue_14' | 'overdue_30' | 'overdue_30_plus';

export default function PendingPage() {
    const router = useRouter();
    const { profile } = useProfile();
    const [pending, setPending] = useState<Customer[]>([]);
    const [filtered, setFiltered] = useState<Customer[]>([]);
    const [filter, setFilter] = useState<OverdueType | 'all'>('all');

    useEffect(() => {
        if (profile) loadPending();
    }, [profile]);

    useEffect(() => {
        applyFilter();
    }, [pending, filter]);

    const loadPending = async () => {
        const active = await db.getActiveCustomersByProfile(profile!.id);

        // ✅ FIXED: Filter using frequency-aware calculation
        const overdue = active.filter((c) => {
            const daysOverdue = calculateDaysOverdue(c.lastPayment, c.frequency);
            return daysOverdue > 0; // Only show if actually overdue after grace period
        });

        // Sort by overdue amount (most overdue first)
        setPending(
            overdue.sort((a, b) =>
                calculateDaysOverdue(b.lastPayment, b.frequency) -
                calculateDaysOverdue(a.lastPayment, a.frequency)
            )
        );
    };

    const applyFilter = () => {
        if (filter === 'all') {
            setFiltered(pending);
        } else {
            setFiltered(
                pending.filter((c) => {
                    const d = calculateDaysOverdue(c.lastPayment, c.frequency);

                    // Filter based on actual overdue days (after grace period)
                    if (filter === 'overdue_7') return d > 0 && d <= 7;
                    if (filter === 'overdue_14') return d > 7 && d <= 14;
                    if (filter === 'overdue_30') return d > 14 && d <= 30;
                    return d > 30; // overdue_30_plus
                })
            );
        }
    };

    const getColor = (days: number) => {
        if (days <= 7) return 'border-orange-300 bg-orange-50';
        if (days <= 14) return 'border-red-300 bg-red-50';
        if (days <= 30) return 'border-red-400 bg-red-100';
        return 'border-red-500 bg-red-200';
    };

    const getIcon = (days: number) => {
        if (days <= 7) return '⚠️';
        if (days <= 14) return '🔴';
        if (days <= 30) return '🔴🔴';
        return '🚨';
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Pending Payments" />

            <div className="pt-16 p-4 max-w-2xl mx-auto">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white rounded p-3 shadow-sm text-center">
                        <p className="text-xs text-gray-600">Total Pending</p>
                        <p className="text-2xl font-bold text-red-600">{pending.length}</p>
                    </div>
                    <div className="bg-white rounded p-3 shadow-sm text-center">
                        <p className="text-xs text-gray-600">Total Overdue</p>
                        <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(pending.reduce((sum, c) => sum + (c.totalAmount - c.paidAmount), 0))}
                        </p>
                    </div>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {[
                        { label: 'All', value: 'all' },
                        { label: '1-7 Days', value: 'overdue_7' },
                        { label: '8-14 Days', value: 'overdue_14' },
                        { label: '15-30 Days', value: 'overdue_30' },
                        { label: '30+ Days', value: 'overdue_30_plus' },
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setFilter(opt.value as any)}
                            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                                filter === opt.value
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white text-gray-700 border hover:bg-gray-50'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* List */}
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-600">
                            {pending.length === 0
                                ? 'No pending payments! 🎉'
                                : 'No customers in this range'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((c) => {
                            // ✅ Use frequency-aware calculation
                            const days = calculateDaysOverdue(c.lastPayment, c.frequency);
                            const remaining = c.totalAmount - c.paidAmount;
                            const timeStatus = getTimeUntilDue(c.lastPayment, c.frequency);

                            return (
                                <div
                                    key={c.id}
                                    onClick={() => router.push(`/customers/${c.id}`)}
                                    className={`bg-white rounded-lg p-3 shadow-sm border-l-4 cursor-pointer hover:shadow-md ${getColor(days)}`}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-xl">{getIcon(days)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold truncate">{c.name}</h3>
                                                    <p className="text-xs text-purple-600 font-medium capitalize">
                                                        {c.frequency} installment
                                                    </p>
                                                </div>
                                                <div className="text-right ml-2">
                                                    <span className="text-xs font-bold px-2 py-0.5 bg-white/50 rounded whitespace-nowrap block">
                                                        {days}d overdue
                                                    </span>
                                                    <span className="text-xs text-gray-500 mt-1 block">
                                                        {timeStatus}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-600 flex gap-4 mb-2">
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {c.phone}
                                                </span>
                                                {c.address && (
                                                    <span className="flex items-center gap-1 truncate">
                                                        <MapPin className="w-3 h-3" /> {c.address}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <p className="text-gray-600">Pending</p>
                                                    <p className="font-bold text-red-600">{formatCurrency(remaining)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Installment</p>
                                                    <p className="font-bold">{formatCurrency(c.installmentAmount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Last Paid</p>
                                                    <p className="font-bold text-xs">{formatDate(c.lastPayment)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Navigation currentPage="pending" />
        </div>
    );
}