// src/app/pending/page.tsx - WITH TABS (OVERDUE + MONTHLY REPORT)

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Phone, MapPin, MessageSquare, Filter, Calendar, CheckCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useCompact';
import { formatCurrency, formatDate, calculateDaysOverdue, getTimeUntilDue } from '@/lib/utils';
import { WhatsAppService } from '@/lib/whatsapp-unified';
import type { Customer, Payment } from '@/types';

type FrequencyFilter = 'all' | 'daily' | 'weekly' | 'monthly';
type TabType = 'overdue' | 'report';

interface CycleReport {
    customer: Customer;
    cycleNumber: number;
    cycleStart: string;
    cycleEnd: string;
    expected: number;
    received: number;
    missing: number;
    completionRate: number;
    missedDates: string[];
}

export default function PendingPage() {
    const router = useRouter();
    const { profile } = useProfile();

    const [activeTab, setActiveTab] = useState<TabType>('overdue');
    const [pending, setPending] = useState<Customer[]>([]);
    const [filtered, setFiltered] = useState<Customer[]>([]);
    const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');

    // Monthly Report States
    const [reports, setReports] = useState<CycleReport[]>([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [totals, setTotals] = useState({ expected: 0, received: 0, missing: 0 });

    useEffect(() => {
        if (profile) {
            loadPending();
        }
    }, [profile]);

    useEffect(() => {
        applyFilter();
    }, [pending, frequencyFilter, activeTab]);

    useEffect(() => {
        if (activeTab === 'report' && profile) {
            generateReports();
        }
    }, [activeTab, profile, frequencyFilter]);

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
        if (frequencyFilter === 'all') {
            setFiltered(pending);
        } else {
            setFiltered(pending.filter(c => c.frequency === frequencyFilter));
        }
    };

    const generateReports = async () => {
        setReportLoading(true);

        const allCustomers = await db.getCustomersByProfile(profile!.id);
        const allPayments = await db.getPaymentsByProfile(profile!.id);

        const filteredCustomers = frequencyFilter === 'all'
            ? allCustomers
            : allCustomers.filter(c => c.frequency === frequencyFilter);

        const today = new Date();
        const cycleReports: CycleReport[] = [];

        for (const customer of filteredCustomers) {
            const startDate = new Date(customer.startDate);
            const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            const completedCycles = Math.floor(daysSinceStart / 30);

            if (completedCycles === 0) continue;

            const cycleStart = new Date(startDate);
            cycleStart.setDate(cycleStart.getDate() + ((completedCycles - 1) * 30));

            const cycleEnd = new Date(cycleStart);
            cycleEnd.setDate(cycleEnd.getDate() + 29);

            const cycleStartStr = cycleStart.toISOString().split('T')[0];
            const cycleEndStr = cycleEnd.toISOString().split('T')[0];

            let expectedInstallments = 0;

            if (customer.frequency === 'daily') {
                expectedInstallments = 30;
            } else if (customer.frequency === 'weekly') {
                expectedInstallments = Math.floor(30 / 7);
            } else if (customer.frequency === 'monthly') {
                expectedInstallments = 1;
            }

            const expected = expectedInstallments * customer.installmentAmount;

            const received = allPayments
                .filter(p =>
                    p.customerId === customer.id &&
                    p.date >= cycleStartStr &&
                    p.date <= cycleEndStr &&
                    !p.isAdvanced
                )
                .reduce((sum, p) => sum + p.amount, 0);

            const missing = Math.max(0, expected - received);
            const completionRate = expected > 0 ? Math.round((received / expected) * 100) : 0;

            const missedDates: string[] = [];
            if (missing > 0) {
                const paymentsInCycle = allPayments
                    .filter(p => p.customerId === customer.id && p.date >= cycleStartStr && p.date <= cycleEndStr)
                    .map(p => p.date);

                let currentDate = new Date(cycleStart);

                for (let i = 0; i < expectedInstallments; i++) {
                    const expectedDate = new Date(currentDate);

                    if (customer.frequency === 'daily') {
                        expectedDate.setDate(currentDate.getDate() + i);
                    } else if (customer.frequency === 'weekly') {
                        expectedDate.setDate(currentDate.getDate() + (i * 7));
                    }

                    if (expectedDate <= cycleEnd) {
                        const dateStr = expectedDate.toISOString().split('T')[0];
                        const hasPayment = paymentsInCycle.some(pd => {
                            if (customer.frequency === 'daily') {
                                return pd === dateStr;
                            } else if (customer.frequency === 'weekly') {
                                const weekStart = new Date(expectedDate);
                                const weekEnd = new Date(expectedDate);
                                weekEnd.setDate(weekEnd.getDate() + 6);
                                const payDate = new Date(pd);
                                return payDate >= weekStart && payDate <= weekEnd;
                            } else {
                                return true;
                            }
                        });

                        if (!hasPayment) {
                            missedDates.push(dateStr);
                        }
                    }
                }
            }

            cycleReports.push({
                customer,
                cycleNumber: completedCycles,
                cycleStart: cycleStartStr,
                cycleEnd: cycleEndStr,
                expected,
                received,
                missing,
                completionRate,
                missedDates: missedDates.slice(0, 10)
            });
        }

        cycleReports.sort((a, b) => b.missing - a.missing);

        const totalExpected = cycleReports.reduce((sum, r) => sum + r.expected, 0);
        const totalReceived = cycleReports.reduce((sum, r) => sum + r.received, 0);
        const totalMissing = cycleReports.reduce((sum, r) => sum + r.missing, 0);

        setReports(cycleReports);
        setTotals({ expected: totalExpected, received: totalReceived, missing: totalMissing });
        setReportLoading(false);
    };

    const sendReminder = (customer: Customer) => {
        const daysOverdue = calculateDaysOverdue(customer.lastPayment, customer.frequency);

        if (!confirm(
            `Send WhatsApp reminder to ${customer.name}?\n\n` +
            `Overdue: ${daysOverdue} days\n` +
            `Pending: ${formatCurrency(customer.totalAmount - customer.paidAmount)}\n\n` +
            `Continue?`
        )) {
            return;
        }

        WhatsAppService.sendOverdue(customer, daysOverdue);
        alert(`✅ Reminder sent to ${customer.name}!`);
    };

    const sendWhatsAppReport = (report: CycleReport) => {
        if (!confirm(
            `Send report to ${report.customer.name}?\n\n` +
            `Cycle: ${formatDate(report.cycleStart)} - ${formatDate(report.cycleEnd)}\n` +
            `Expected: ${formatCurrency(report.expected)}\n` +
            `Received: ${formatCurrency(report.received)}\n` +
            `Missing: ${formatCurrency(report.missing)}\n\n` +
            `Continue?`
        )) {
            return;
        }

        const message = `
*Assalam-o-Alaikum ${report.customer.name} Sahab!*

📊 *30-Day Cycle Report*
📅 Cycle ${report.cycleNumber}: ${formatDate(report.cycleStart)} - ${formatDate(report.cycleEnd)}

💰 Expected: ${formatCurrency(report.expected)}
✅ Received: ${formatCurrency(report.received)}
⚠️ Missing: ${formatCurrency(report.missing)}
📈 Completion: ${report.completionRate}%

${report.missedDates.length > 0 ? `❌ Missed Dates: ${report.missedDates.length}` : ''}

Mehrbani kar ke baaqi raqam jald ada karen.

_MA Electronics - Aap ka Bharosa_
        `.trim();

        WhatsAppService.openWhatsApp(report.customer.phone, message);
        alert(`✅ Report sent to ${report.customer.name}!`);
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
                        onClick={() => setActiveTab('report')}
                        className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                            activeTab === 'report'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 border border-gray-200'
                        }`}
                    >
                        📊 Monthly Report
                    </button>
                </div>

                {/* OVERDUE TAB */}
                {activeTab === 'overdue' && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                                <p className="text-xs text-gray-600">Total Pending</p>
                                <p className="text-2xl font-bold text-red-600">{pending.length}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                                <p className="text-xs text-gray-600">Total Overdue</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {formatCurrency(pending.reduce((sum, c) => sum + (c.totalAmount - c.paidAmount), 0))}
                                </p>
                            </div>
                        </div>

                        {/* Frequency Filters */}
                        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                Filter by Frequency
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {(['all', 'daily', 'weekly', 'monthly'] as FrequencyFilter[]).map((freq) => (
                                    <button
                                        key={freq}
                                        onClick={() => setFrequencyFilter(freq)}
                                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize ${
                                            frequencyFilter === freq
                                                ? 'bg-red-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {freq === 'all' ? 'All' : freq}
                                    </button>
                                ))}
                            </div>

                            {frequencyFilter !== 'all' && (
                                <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 capitalize">{frequencyFilter} Customers:</span>
                                        <span className="font-bold text-red-600">{filtered.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-1">
                                        <span className="text-gray-600">Total Pending:</span>
                                        <span className="font-bold text-red-600">
                                            {formatCurrency(filtered.reduce((sum, c) => sum + (c.totalAmount - c.paidAmount), 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Customer List */}
                        {filtered.length === 0 ? (
                            <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-600">
                                    {pending.length === 0
                                        ? 'No pending payments! 🎉'
                                        : `No ${frequencyFilter} customers with overdue payments`}
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
                                            className={`bg-white rounded-lg p-3 shadow-sm border-l-4 ${getColor(days)}`}
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
                                                        <span className="flex items-center gap-1 truncate">
                                                            <Phone className="w-3 h-3 flex-shrink-0" /> {c.phone}
                                                        </span>
                                                        {c.address && (
                                                            <span className="flex items-center gap-1 truncate">
                                                                <MapPin className="w-3 h-3 flex-shrink-0" /> {c.address}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
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

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => router.push(`/customers/${c.id}`)}
                                                            className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs font-medium"
                                                        >
                                                            View Details
                                                        </button>
                                                        <button
                                                            onClick={() => sendReminder(c)}
                                                            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-1 text-xs font-medium"
                                                        >
                                                            <MessageSquare className="w-3 h-3" />
                                                            Send Alert
                                                        </button>
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

                {/* MONTHLY REPORT TAB */}
                {activeTab === 'report' && (
                    <>
                        {/* Info Banner */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                            <p className="text-sm text-blue-700 font-medium mb-1">
                                📊 30-Day Cycle Reports
                            </p>
                            <p className="text-xs text-blue-600">
                                Showing customers who completed at least one 30-day cycle from start date.
                            </p>
                        </div>

                        {/* Frequency Filter */}
                        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                Filter by Frequency
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {(['all', 'daily', 'weekly', 'monthly'] as FrequencyFilter[]).map((freq) => (
                                    <button
                                        key={freq}
                                        onClick={() => setFrequencyFilter(freq)}
                                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize ${
                                            frequencyFilter === freq
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {freq === 'all' ? 'All' : freq}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-blue-50 rounded-xl p-3 text-center border-2 border-blue-200">
                                <p className="text-xs text-blue-700 mb-1">Expected</p>
                                <p className="text-lg font-bold text-blue-700 truncate">
                                    {formatCurrency(totals.expected)}
                                </p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-3 text-center border-2 border-green-200">
                                <p className="text-xs text-green-700 mb-1">Received</p>
                                <p className="text-lg font-bold text-green-700 truncate">
                                    {formatCurrency(totals.received)}
                                </p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-3 text-center border-2 border-red-200">
                                <p className="text-xs text-red-700 mb-1">Missing</p>
                                <p className="text-lg font-bold text-red-700 truncate">
                                    {formatCurrency(totals.missing)}
                                </p>
                            </div>
                        </div>

                        {/* Loading State */}
                        {reportLoading ? (
                            <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                                <p className="text-gray-500">Generating reports...</p>
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-600">
                                    {frequencyFilter !== 'all'
                                        ? `No ${frequencyFilter} customers with completed 30-day cycles`
                                        : 'No customers with completed 30-day cycles yet'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reports.map((report) => (
                                    <div
                                        key={`${report.customer.id}-${report.cycleNumber}`}
                                        className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                                            report.missing > 0 ? 'border-red-500' : 'border-green-500'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-lg truncate">{report.customer.name}</h3>
                                                <p className="text-xs text-gray-500 capitalize">
                                                    {report.customer.frequency} customer • Cycle {report.cycleNumber}
                                                </p>
                                                <p className="text-xs text-purple-600 font-medium mt-1">
                                                    📅 {formatDate(report.cycleStart)} → {formatDate(report.cycleEnd)}
                                                </p>
                                            </div>
                                            {report.missing > 0 && (
                                                <button
                                                    onClick={() => sendWhatsAppReport(report)}
                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm font-medium flex-shrink-0 ml-2"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    Alert
                                                </button>
                                            )}
                                        </div>

                                        {/* Completion Rate */}
                                        <div className="mb-3">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-600">Completion Rate</span>
                                                <span className="font-bold">{report.completionRate}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${
                                                        report.completionRate >= 80
                                                            ? 'bg-green-500'
                                                            : report.completionRate >= 50
                                                                ? 'bg-yellow-500'
                                                                : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${report.completionRate}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-3 gap-3 mb-3">
                                            <div className="bg-blue-50 rounded-lg p-2">
                                                <p className="text-xs text-blue-700">Expected</p>
                                                <p className="font-bold text-blue-700 truncate">{formatCurrency(report.expected)}</p>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-2">
                                                <p className="text-xs text-green-700">Received</p>
                                                <p className="font-bold text-green-700 truncate">{formatCurrency(report.received)}</p>
                                            </div>
                                            <div className="bg-red-50 rounded-lg p-2">
                                                <p className="text-xs text-red-700">Missing</p>
                                                <p className="font-bold text-red-700 truncate">{formatCurrency(report.missing)}</p>
                                            </div>
                                        </div>

                                        {/* Missed Dates */}
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

                                        {/* Perfect Badge */}
                                        {report.completionRate === 100 && (
                                            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                <p className="text-xs font-medium text-green-700">
                                                    ✨ Perfect completion! All payments received.
                                                </p>
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