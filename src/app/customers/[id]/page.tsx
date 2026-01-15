// src/app/customers/[id]/page.tsx - MOBILE OPTIMIZED VERSION

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Phone, MapPin, CreditCard, Calendar, Edit, Trash2,
    DollarSign, History, FileText, CheckCircle, X, UserCheck,
    Clock, ChevronDown, ChevronUp, TrendingUp, Filter, Zap
} from 'lucide-react';
import WhatsAppButton from '@/components/WhatsAppButton';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { WhatsAppService } from '@/lib/whatsapp-unified';
import { useProfile, useModal } from '@/hooks/useCompact';
import {
    formatCurrency,
    formatCurrencyCompact,
    formatDate,
    calculateDaysOverdue,
    calculateProgress,
    getStatusColor,
    getStatusLabel,
    truncateName
} from '@/lib/utils';
import type { Customer, Payment } from '@/types';
import { usePayments } from '@/hooks/useCustomers';

interface PendingTransaction {
    date: string;
    expectedAmount: number;
    paidAmount: number;
    remainingAmount: number;
    daysOverdue: number;
    status: 'fully_pending' | 'partially_paid' | 'paid';
}

type TransactionFilter = 'all' | 'pending' | 'partial' | 'paid' | 'advanced';

export default function CustomerDetailPage() {
    const router = useRouter();
    const params = useParams();
    const customerId = Number(params.id);

    const { profile } = useProfile();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);

    const paymentModal = useModal();
    const advancedModal = useModal();
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentSource, setPaymentSource] = useState<'online' | 'offline'>('offline');
    const [selectedPendingDate, setSelectedPendingDate] = useState<string | null>(null);
    const [isAdvancedPayment, setIsAdvancedPayment] = useState(false);
    const [advancedInstallments, setAdvancedInstallments] = useState('1');

    const { payments, addPayment, deletePayment } = usePayments(customerId);

    // ✅ Filter State
    const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
    const [showAllHistory, setShowAllHistory] = useState(false);

    // ✅ Calculate stats
    const [stats, setStats] = useState({
        totalPending: 0,
        totalPartial: 0,
        totalPaid: 0,
        advancedCount: 0,
        advancedAmount: 0
    });

    useEffect(() => {
        loadCustomer();
    }, [customerId]);

    useEffect(() => {
        if (customer) {
            calculateStats();
        }
    }, [customer, payments]);

    const loadCustomer = async () => {
        const found = await db.customers.get(customerId);
        if (!found) {
            router.push('/customers');
            return;
        }
        setCustomer(found);
        setLoading(false);
    };

    // ✅ Calculate transaction stats
    const calculateStats = () => {
        if (!customer) return;

        const pendingTxns = generatePendingTransactions();

        const pending = pendingTxns.filter(t => t.status === 'fully_pending').length;
        const partial = pendingTxns.filter(t => t.status === 'partially_paid').length;
        const paid = payments.filter(p => !p.isAdvanced).length;

        // ✅ Count advanced payments
        const advancedPayments = payments.filter(p => p.isAdvanced);
        const advancedCount = advancedPayments.length;
        const advancedAmount = advancedPayments.reduce((sum, p) => sum + p.amount, 0);

        setStats({
            totalPending: pending,
            totalPartial: partial,
            totalPaid: paid,
            advancedCount,
            advancedAmount
        });
    };

    const handleAddPayment = async () => {
        if (!customer) return;

        const amount = parseFloat(paymentAmount);

        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const remaining = customer.totalAmount - customer.paidAmount;

        if (amount > remaining && !isAdvancedPayment) {
            if (!confirm('Payment exceeds remaining balance. Mark as advanced?')) {
                setIsAdvancedPayment(true);
                return;
            }
        }

        try {
            const paymentDate = selectedPendingDate || new Date().toISOString().split('T')[0];

            await addPayment({
                customerId: customer.id,
                amount,
                date: paymentDate,
                paymentSource,
                isAdvanced: isAdvancedPayment,
            });

            await loadCustomer();
            setPaymentAmount('');
            setPaymentSource('offline');
            setSelectedPendingDate(null);
            setIsAdvancedPayment(false);
            paymentModal.hide();

            const updatedCustomer = await db.customers.get(customerId);
            if (updatedCustomer && updatedCustomer.paidAmount >= updatedCustomer.totalAmount) {
                if (confirm('Payment completed! 🎉 Send congratulations via WhatsApp?')) {
                    WhatsAppService.sendCompletion(updatedCustomer);
                }
            }
        } catch (error) {
            console.error('Error adding payment:', error);
            alert('Failed to add payment');
        }
    };

    // ✅ Add multiple advanced payments
    const handleAddAdvancedPayments = async () => {
        if (!customer) return;

        const count = parseInt(advancedInstallments);
        const amount = customer.installmentAmount * count;

        if (!count || count <= 0) {
            alert('Enter valid number of installments');
            return;
        }

        if (!confirm(`Add ${count} installments (${formatCurrency(amount)}) as advanced payment?`)) {
            return;
        }

        try {
            await addPayment({
                customerId: customer.id,
                amount,
                date: new Date().toISOString().split('T')[0],
                paymentSource,
                isAdvanced: true,
            });

            await loadCustomer();
            setAdvancedInstallments('1');
            advancedModal.hide();
            alert('✅ Advanced payment added!');
        } catch (error) {
            console.error('Error adding advanced payment:', error);
            alert('Failed to add advanced payment');
        }
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!confirm('Delete this payment? Cannot be undone.')) return;

        try {
            await deletePayment(paymentId);
            await loadCustomer();
        } catch (error) {
            console.error('Error deleting payment:', error);
            alert('Failed to delete payment');
        }
    };

    const handleDelete = async () => {
        if (!customer) return;

        if (!confirm('Delete this customer? All data will be lost!')) return;
        if (!confirm('Last warning! This action is PERMANENT.')) return;

        try {
            await db.transaction('rw', db.customers, db.payments, async () => {
                await db.customers.delete(customer.id);
                await db.payments.where('customerId').equals(customer.id).delete();
            });

            router.push('/customers');
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Failed to delete customer');
        }
    };

    // ✅ Generate pending transactions
    const generatePendingTransactions = (): PendingTransaction[] => {
        if (!customer || customer.status !== 'active') return [];

        const today = new Date();
        const startDate = new Date(customer.startDate);
        const pending: PendingTransaction[] = [];

        const daysIncrement = customer.frequency === 'daily' ? 1
            : customer.frequency === 'weekly' ? 7 : 30;

        let currentDate = new Date(startDate);

        while (currentDate <= today) {
            const dateStr = currentDate.toISOString().split('T')[0];

            const paymentsForDate = payments.filter(p => p.date === dateStr && !p.isAdvanced);
            const paidForDate = paymentsForDate.reduce((sum, p) => sum + p.amount, 0);

            const expectedAmount = customer.installmentAmount;
            const remainingAmount = Math.max(0, expectedAmount - paidForDate);

            const daysOverdue = Math.floor(
                (today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            const status: PendingTransaction['status'] =
                paidForDate === 0 ? 'fully_pending'
                    : paidForDate >= expectedAmount ? 'paid'
                        : 'partially_paid';

            if (status !== 'paid') {
                pending.push({
                    date: dateStr,
                    expectedAmount,
                    paidAmount: paidForDate,
                    remainingAmount,
                    daysOverdue,
                    status
                });
            }

            currentDate.setDate(currentDate.getDate() + daysIncrement);
        }

        return pending.sort((a, b) => b.daysOverdue - a.daysOverdue);
    };

    const handlePaySpecific = (pendingDate: string, remainingAmount: number) => {
        setSelectedPendingDate(pendingDate);
        setPaymentAmount(remainingAmount.toString());
        setIsAdvancedPayment(false);
        paymentModal.show();
    };

    // ✅ Filter transactions
    const filterTransactions = () => {
        const pendingTxns = generatePendingTransactions();

        switch (transactionFilter) {
            case 'pending':
                return pendingTxns.filter(t => t.status === 'fully_pending');
            case 'partial':
                return pendingTxns.filter(t => t.status === 'partially_paid');
            case 'paid':
                return payments.filter(p => !p.isAdvanced);
            case 'advanced':
                return payments.filter(p => p.isAdvanced);
            case 'all':
            default:
                return pendingTxns;
        }
    };

    if (loading || !customer || !profile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    const progress = calculateProgress(customer.paidAmount, customer.totalAmount);
    const remaining = customer.totalAmount - customer.paidAmount;
    const isCompleted = progress >= 100;
    const daysOverdue = calculateDaysOverdue(customer.lastPayment, customer.frequency);
    const filteredTransactions = filterTransactions();

    const recentPayments = showAllHistory ? payments : payments.slice(0, 5);
    const hasMorePayments = payments.length > 5;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader
                title="Customer Details"
                rightAction={
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push(`/customers/${customer.id}/edit`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            aria-label="Edit"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="Delete"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                }
            />

            <div className="pt-16 p-4 space-y-4">
                {/* Customer Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl overflow-hidden flex-shrink-0 shadow-lg">
                            {customer.photo ? (
                                <img src={customer.photo} alt={customer.name} className="w-full h-full object-cover" />
                            ) : (
                                customer.name.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            {/* ✅ MOBILE FIX: Smart truncate for long names */}
                            <h2 className="text-xl font-bold mb-2 break-words line-clamp-2">{customer.name}</h2>
                            <div className="space-y-1.5 text-sm text-gray-600">
                                {customer.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 flex-shrink-0" />
                                        <span>{customer.phone}</span>
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm line-clamp-2 break-words flex-1">{customer.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ✅ Advanced Payment Badge */}
                    {stats.advancedCount > 0 && (
                        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-green-700">
                                        {stats.advancedCount} Advanced Payment{stats.advancedCount > 1 ? 's' : ''} 🎉
                                    </p>
                                    <p className="text-xs text-green-600">
                                        {formatCurrencyCompact(stats.advancedAmount)} paid in advance
                                    </p>
                                </div>
                                <button
                                    onClick={() => setTransactionFilter('advanced')}
                                    className="text-xs text-green-600 font-medium hover:underline"
                                >
                                    View →
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(isCompleted, daysOverdue)}`}>
                            {getStatusLabel(isCompleted, daysOverdue)}
                        </span>
                        <span className="text-sm text-gray-500">
                            Started {formatDate(customer.startDate)}
                        </span>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Payment Progress</span>
                            <span className="font-bold">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className={`h-3 rounded-full transition-all ${
                                    isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* ✅ MOBILE FIX: Compact currency display */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Total</p>
                            <p className="font-bold text-sm truncate">{formatCurrencyCompact(customer.totalAmount)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Paid</p>
                            <p className="font-bold text-sm text-green-600 truncate">{formatCurrencyCompact(customer.paidAmount)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Left</p>
                            <p className="font-bold text-sm text-orange-600 truncate">{formatCurrencyCompact(Math.max(0, remaining))}</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => {
                            setSelectedPendingDate(null);
                            setIsAdvancedPayment(false);
                            paymentModal.show();
                        }}
                        disabled={isCompleted}
                        className={`py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-1 text-sm ${
                            isCompleted
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                        }`}
                    >
                        <DollarSign className="w-4 h-4" />
                        Add Payment
                    </button>
                    <button
                        onClick={() => advancedModal.show()}
                        disabled={isCompleted}
                        className={`py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-1 text-sm ${
                            isCompleted
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                        }`}
                    >
                        <Zap className="w-4 h-4" />
                        Advanced
                    </button>
                    <WhatsAppButton
                        customer={customer}
                        type={daysOverdue > 7 ? 'overdue' : 'reminder'}
                        daysOverdue={daysOverdue}
                        className="py-3 px-2 shadow-lg text-sm"
                    />
                </div>

                {/* ✅ TRANSACTION STATS */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-purple-600" />
                        Transaction Summary
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                        <button
                            onClick={() => setTransactionFilter('pending')}
                            className={`p-3 rounded-lg border-2 transition-all ${
                                transactionFilter === 'pending'
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <p className="text-2xl font-bold text-orange-600">{stats.totalPending}</p>
                            <p className="text-xs text-gray-600 mt-1">Pending</p>
                        </button>
                        <button
                            onClick={() => setTransactionFilter('partial')}
                            className={`p-3 rounded-lg border-2 transition-all ${
                                transactionFilter === 'partial'
                                    ? 'border-yellow-500 bg-yellow-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <p className="text-2xl font-bold text-yellow-600">{stats.totalPartial}</p>
                            <p className="text-xs text-gray-600 mt-1">Partial</p>
                        </button>
                        <button
                            onClick={() => setTransactionFilter('paid')}
                            className={`p-3 rounded-lg border-2 transition-all ${
                                transactionFilter === 'paid'
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <p className="text-2xl font-bold text-green-600">{stats.totalPaid}</p>
                            <p className="text-xs text-gray-600 mt-1">Paid</p>
                        </button>
                        <button
                            onClick={() => setTransactionFilter('advanced')}
                            className={`p-3 rounded-lg border-2 transition-all ${
                                transactionFilter === 'advanced'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <p className="text-2xl font-bold text-blue-600">{stats.advancedCount}</p>
                            <p className="text-xs text-gray-600 mt-1">Advanced</p>
                        </button>
                    </div>
                </div>

                {/* ✅ FILTERED TRANSACTIONS - PENDING/PARTIAL */}
                {transactionFilter !== 'paid' && transactionFilter !== 'advanced' && filteredTransactions.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-orange-600" />
                                {transactionFilter === 'all' ? 'All Pending' : transactionFilter === 'pending' ? 'Fully Pending' : 'Partially Paid'} ({filteredTransactions.length})
                            </h3>
                            {transactionFilter !== 'all' && (
                                <button
                                    onClick={() => setTransactionFilter('all')}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Show All
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {(filteredTransactions as PendingTransaction[]).slice(0, showAllHistory ? undefined : 10).map((txn) => (
                                <div
                                    key={txn.date}
                                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                                        txn.status === 'partially_paid'
                                            ? 'bg-yellow-50 border-yellow-200'
                                            : 'bg-orange-50 border-orange-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            txn.status === 'partially_paid' ? 'bg-yellow-100' : 'bg-orange-100'
                                        }`}>
                                            <Clock className={`w-5 h-5 ${
                                                txn.status === 'partially_paid' ? 'text-yellow-600' : 'text-orange-600'
                                            }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-700 truncate">{formatDate(txn.date)}</p>
                                            {txn.status === 'partially_paid' && (
                                                <p className="text-xs text-gray-600 truncate">
                                                    {formatCurrencyCompact(txn.paidAmount)} of {formatCurrencyCompact(txn.expectedAmount)}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-500">{txn.daysOverdue}d late</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                        <div className="text-right">
                                            <p className={`font-bold text-sm ${
                                                txn.status === 'partially_paid' ? 'text-yellow-600' : 'text-orange-600'
                                            } truncate max-w-[80px]`}>
                                                {formatCurrencyCompact(txn.remainingAmount)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handlePaySpecific(txn.date, txn.remainingAmount)}
                                            className={`px-2 py-1 rounded-lg hover:opacity-90 text-xs font-medium whitespace-nowrap ${
                                                txn.status === 'partially_paid'
                                                    ? 'bg-yellow-600 text-white'
                                                    : 'bg-orange-600 text-white'
                                            }`}
                                        >
                                            Pay
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredTransactions.length > 10 && (
                            <button
                                onClick={() => setShowAllHistory(!showAllHistory)}
                                className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium flex items-center justify-center gap-1"
                            >
                                {showAllHistory ? (
                                    <>Show Less <ChevronUp className="w-4 h-4" /></>
                                ) : (
                                    <>Show All ({filteredTransactions.length - 10} more) <ChevronDown className="w-4 h-4" /></>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* ✅ PAID/ADVANCED TRANSACTIONS */}
                {(transactionFilter === 'paid' || transactionFilter === 'advanced') && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                {transactionFilter === 'advanced' ? (
                                    <>
                                        <Zap className="w-5 h-5 text-green-600" />
                                        Advanced Payments ({stats.advancedCount})
                                    </>
                                ) : (
                                    <>
                                        <History className="w-5 h-5 text-blue-600" />
                                        Completed Payments ({stats.totalPaid})
                                    </>
                                )}
                            </h3>
                            <button
                                onClick={() => setTransactionFilter('all')}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                Show All
                            </button>
                        </div>
                        <div className="space-y-3">
                            {(filteredTransactions as Payment[]).map(payment => (
                                <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-0">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            payment.isAdvanced ? 'bg-green-100' : 'bg-blue-100'
                                        }`}>
                                            {payment.isAdvanced ? (
                                                <Zap className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4 text-blue-600" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <p className="font-medium text-sm truncate">{formatCurrencyCompact(payment.amount)}</p>
                                                {payment.isAdvanced && (
                                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex-shrink-0">
                                                        Adv
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">{formatDate(payment.date)}</p>
                                            <p className="text-xs text-gray-400">
                                                {payment.paymentSource === 'online' ? '💳' : '💵'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeletePayment(payment.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {customer.notes && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Notes
                        </h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
                    </div>
                )}
            </div>

            {/* ✅ PAYMENT MODAL */}
            {paymentModal.open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="text-xl font-bold">
                                {selectedPendingDate
                                    ? `Pay for ${formatDate(selectedPendingDate)}`
                                    : 'Add Payment'}
                            </h3>
                            <button
                                onClick={() => {
                                    paymentModal.hide();
                                    setSelectedPendingDate(null);
                                    setIsAdvancedPayment(false);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {selectedPendingDate && (
                                <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-700">
                                        📅 Payment for: <strong>{formatDate(selectedPendingDate)}</strong>
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        This payment will be recorded for this specific date
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Amount *
                                </label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {selectedPendingDate && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        💡 Tip: You can pay partial amount. Remaining will still show as pending.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Source *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPaymentSource('offline')}
                                        className={`py-3 px-4 rounded-xl border-2 transition-all ${
                                            paymentSource === 'offline'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        💵 Cash/Check
                                    </button>
                                    <button
                                        onClick={() => setPaymentSource('online')}
                                        className={`py-3 px-4 rounded-xl border-2 transition-all ${
                                            paymentSource === 'online'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        💳 Online Transfer
                                    </button>
                                </div>
                            </div>

                            {/* ✅ Mark as Advanced Option */}
                            {!selectedPendingDate && (
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAdvancedPayment}
                                            onChange={(e) => setIsAdvancedPayment(e.target.checked)}
                                            className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Mark as Advanced Payment</p>
                                            <p className="text-xs text-gray-500">Payment for future installments</p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            <button
                                onClick={handleAddPayment}
                                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                {selectedPendingDate ? 'Record Payment' : isAdvancedPayment ? 'Add Advanced Payment' : 'Add Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ ADVANCED PAYMENT MODAL */}
            {advancedModal.open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Zap className="w-6 h-6 text-green-600" />
                                Add Advanced Payment
                            </h3>
                            <button
                                onClick={() => advancedModal.hide()}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                                <p className="text-sm font-medium text-green-700 mb-1">
                                    💡 What is Advanced Payment?
                                </p>
                                <p className="text-xs text-green-600">
                                    Pay multiple installments in advance. This helps track future payments separately.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Number of Installments *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={advancedInstallments}
                                    onChange={(e) => setAdvancedInstallments(e.target.value)}
                                    placeholder="e.g., 5"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Installment amount: {formatCurrency(customer.installmentAmount)}
                                </p>
                            </div>

                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-gray-700">
                                    Total Amount: <strong className="text-blue-600">
                                    {formatCurrency(parseInt(advancedInstallments || '0') * customer.installmentAmount)}
                                </strong>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Source *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPaymentSource('offline')}
                                        className={`py-3 px-4 rounded-xl border-2 transition-all ${
                                            paymentSource === 'offline'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        💵 Cash/Check
                                    </button>
                                    <button
                                        onClick={() => setPaymentSource('online')}
                                        className={`py-3 px-4 rounded-xl border-2 transition-all ${
                                            paymentSource === 'online'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        💳 Online Transfer
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleAddAdvancedPayments}
                                className="w-full py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Zap className="w-5 h-5" />
                                Add Advanced Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}