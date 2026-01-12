// src/app/pending/page.tsx - WITH OVERDUE & MONTHLY REPORT TABS

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Phone, MapPin, Calendar, MessageSquare } from 'lucide-react';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useCompact';
import { formatCurrency, formatDate, calculateDaysOverdue, getTimeUntilDue } from '@/lib/utils';
import { WhatsAppService } from '@/lib/whatsapp-unified';
import type { Customer, Payment } from '@/types';

type OverdueType = 'overdue_7' | 'overdue_14' | 'overdue_30' | 'overdue_30_plus';
type TabType = 'overdue' | 'monthly';

interface MonthlyCustomerReport {
    customer: Customer;
    expected: number;
    received: number;
    missing: number;
    missedDates: string[];
}

export default function PendingPage() {
    const router = useRouter();
    const { profile } = useProfile();

    const [activeTab, setActiveTab] = useState<TabType>('overdue');
    const [pending, setPending] = useState<Customer[]>([]);
    const [filtered, setFiltered] = useState<Customer[]>([]);
    const [filter, setFilter] = useState<OverdueType | 'all'>('all');

    // Monthly Report States
    const [selectedMonth, setSelectedMonth] = useState('');
    const [monthlyReports, setMonthlyReports] = useState<MonthlyCustomerReport[]>([]);
    const [monthlyTotals, setMonthlyTotals] = useState({ expected: 0, received: 0, missing: 0 });

    useEffect(() => {
        if (profile) {
            loadPending();

            // Set current month as default
            const now = new Date();
            setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        }
    }, [profile]);

    useEffect(() => {
        applyFilter();
    }, [pending, filter]);

    useEffect(() => {
        if (selectedMonth && profile) {
            generateMonthlyReport();
        }
    }, [selectedMonth, profile]);

    const loadPending = async () => {
        const active = await db.getActiveCustomersByProfile(profile!.id);

        const overdue = active.filter((c) => {
            const daysOverdue = calculateDaysOverdue(c.lastPayment, c.frequency);
            return daysOverdue > 0;
        });

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

                    if (filter === 'overdue_7') return d > 0 && d <= 7;
                    if (filter === 'overdue_14') return d > 7 && d <= 14;
                    if (filter === 'overdue_30') return d > 14 && d <= 30;
                    return d > 30;
                })
            );
        }
    };

    const generateMonthlyReport = async () => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const today = new Date();

        // Check if selected month is in future
        const isFutureMonth = startDate > today;

        const allCustomers = await db.getCustomersByProfile(profile!.id);
        const allPayments = await db.getPaymentsByProfile(profile!.id);

        const reports: MonthlyCustomerReport[] = [];
        let totalExpected = 0;
        let totalReceived = 0;
        let totalMissing = 0;

        for (const customer of allCustomers) {
            // Calculate expected installments for this month
            let expected = 0;
            let installmentCount = 0;

            const customerStartDate = new Date(customer.startDate);
            const effectiveStart = customerStartDate > startDate ? customerStartDate : startDate;

            if (customer.frequency === 'daily') {
                const daysInMonth = Math.ceil((endDate.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                installmentCount = Math.max(0, daysInMonth);
            } else if (customer.frequency === 'weekly') {
                const weeksInMonth = Math.ceil((endDate.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
                installmentCount = Math.max(0, weeksInMonth);
            } else {
                installmentCount = 1;
            }

            expected = installmentCount * customer.installmentAmount;

            // Calculate received in this month
            const received = allPayments
                .filter(p => {
                    if (p.customerId !== customer.id) return false;
                    const paymentDate = new Date(p.date);
                    return paymentDate >= startDate && paymentDate <= endDate;
                })
                .reduce((sum, p) => sum + p.amount, 0);

            const missing = Math.max(0, expected - received);

            // Generate missed dates
            const missedDates: string[] = [];
            if (missing > 0) {
                const lastPaymentDate = new Date(customer.lastPayment);
                let currentDate = new Date(lastPaymentDate);

                const daysToAdd = customer.frequency === 'daily' ? 1 : customer.frequency === 'weekly' ? 7 : 30;
                currentDate.setDate(currentDate.getDate() + daysToAdd);

                while (currentDate <= endDate && currentDate <= new Date()) {
                    if (currentDate >= startDate) {
                        missedDates.push(currentDate.toISOString().split('T')[0]);
                    }
                    currentDate.setDate(currentDate.getDate() + daysToAdd);
                }
            }

            if (expected > 0) {
                reports.push({
                    customer,
                    expected,
                    received,
                    missing,
                    missedDates
                });

                totalExpected += expected;
                totalReceived += received;
                totalMissing += missing;
            }
        }

        setMonthlyReports(reports.sort((a, b) => b.missing - a.missing));
        setMonthlyTotals({ expected: totalExpected, received: totalReceived, missing: totalMissing });
    };

    const sendWhatsAppReminder = (customer: Customer, missedCount: number) => {
        if (!confirm(`Send WhatsApp reminder to ${customer.name}?\n\n${missedCount} payment${missedCount > 1 ? 's' : ''} missed this month.\n\nContinue?`)) {
            return;
        }
        WhatsAppService.sendReminder(customer);
        alert(`✅ Reminder sent to ${customer.name}!`);
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
                {/* Tabs */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={() => setActiveTab('overdue')}
                        className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                            activeTab === 'overdue'
                                ? 'bg-red-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 border border-gray-200'
                        }`}
                    >
                        ⏰ Overdue
                    </button>
                    <button
                        onClick={() => setActiveTab('monthly')}
                        className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                            activeTab === 'monthly'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 border border-gray-200'
                        }`}
                    >
                        📊 Monthly Report
                    </button>
                </div>

                {/* ===== OVERDUE TAB ===== */}
                {activeTab === 'overdue' && (
                    <>
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

                        {/* Overdue List */}
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
                    </>
                )}

                {/* ===== MONTHLY REPORT TAB ===== */}
                {activeTab === 'monthly' && (
                    <>
                        {/* Month Selector */}
                        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                            <label className="block text-sm font-medium mb-2">Select Month</label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        {/* Monthly Totals */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-blue-50 rounded-xl p-3 text-center border-2 border-blue-200">
                                <p className="text-xs text-blue-700 mb-1">Expected</p>
                                <p className="text-lg font-bold text-blue-700">
                                    {formatCurrency(monthlyTotals.expected)}
                                </p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-3 text-center border-2 border-green-200">
                                <p className="text-xs text-green-700 mb-1">Received</p>
                                <p className="text-lg font-bold text-green-700">
                                    {formatCurrency(monthlyTotals.received)}
                                </p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-3 text-center border-2 border-red-200">
                                <p className="text-xs text-red-700 mb-1">Missing</p>
                                <p className="text-lg font-bold text-red-700">
                                    {formatCurrency(monthlyTotals.missing)}
                                </p>
                            </div>
                        </div>

                        {/* Monthly Reports List */}
                        {monthlyReports.length === 0 ? (
                            <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-600">
                                    {new Date(selectedMonth + '-01') > new Date()
                                        ? 'This month hasn\'t started yet'
                                        : 'No data for selected month'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {monthlyReports.map((report) => (
                                    <div
                                        key={report.customer.id}
                                        className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                                            report.missing > 0 ? 'border-red-500' : 'border-green-500'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-lg">{report.customer.name}</h3>
                                                <p className="text-xs text-gray-500 capitalize">
                                                    {report.customer.frequency} customer
                                                </p>
                                            </div>
                                            {report.missing > 0 && (
                                                <button
                                                    onClick={() => sendWhatsAppReminder(report.customer, report.missedDates.length)}
                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm font-medium"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    Send Alert
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 mb-3">
                                            <div className="bg-blue-50 rounded-lg p-2">
                                                <p className="text-xs text-blue-700">Expected</p>
                                                <p className="font-bold text-blue-700">{formatCurrency(report.expected)}</p>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-2">
                                                <p className="text-xs text-green-700">Received</p>
                                                <p className="font-bold text-green-700">{formatCurrency(report.received)}</p>
                                            </div>
                                            <div className="bg-red-50 rounded-lg p-2">
                                                <p className="text-xs text-red-700">Missing</p>
                                                <p className="font-bold text-red-700">{formatCurrency(report.missing)}</p>
                                            </div>
                                        </div>

                                        {report.missedDates.length > 0 && (
                                            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                                <p className="text-xs font-semibold text-red-700 mb-2">
                                                    Missed Dates ({report.missedDates.length}):
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {report.missedDates.map((date) => (
                                                        <span
                                                            key={date}
                                                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium"
                                                        >
                                                            {formatDate(date)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <Navigation currentPage="pending" />
        </div>
    );
}