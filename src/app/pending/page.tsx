'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Phone, MapPin } from 'lucide-react';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useCompact';
import { formatCurrency, formatDate, calculateDaysOverdue } from '@/lib/utils';
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
        const active = await db.getActiveCustomersByProfile(profile! .id);
        const overdue = active.filter((c) => calculateDaysOverdue(c.lastPayment) > 0);
        setPending(overdue. sort((a, b) => calculateDaysOverdue(b.lastPayment) - calculateDaysOverdue(a.lastPayment)));
    };

    const applyFilter = () => {
        if (filter === 'all') {
            setFiltered(pending);
        } else {
            const days = {
                overdue_7: 7,
                overdue_14: 14,
                overdue_30: 30,
                overdue_30_plus:  Infinity,
            };
            const minDays = filter === 'overdue_30_plus' ? 31 : Object.values(days)[Object.keys(days).indexOf(filter)];
            const maxDays = filter === 'overdue_30_plus' ?  Infinity : minDays;

            setFiltered(
                pending.filter((c) => {
                    const d = calculateDaysOverdue(c.lastPayment);
                    return filter === 'overdue_7' ? d <= 7 :
                        filter === 'overdue_14' ? d > 7 && d <= 14 :
                            filter === 'overdue_30' ? d > 14 && d <= 30 :  d > 30;
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
                                    ?  'bg-red-600 text-white'
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
                        <p className="text-gray-600">No pending payments</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((c) => {
                            const days = calculateDaysOverdue(c.lastPayment);
                            const remaining = c.totalAmount - c.paidAmount;
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
                                                <h3 className="font-semibold truncate">{c.name}</h3>
                                                <span className="text-xs font-bold px-2 py-0.5 bg-white/50 rounded whitespace-nowrap">
                          {days}d overdue
                        </span>
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