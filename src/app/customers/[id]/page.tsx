// src/app/customers/[id]/page.tsx - VIEW + NOTIFICATIONS

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Phone, MapPin, CreditCard, Calendar, Edit, Trash2,
    DollarSign, History, FileText, CheckCircle, X, UserCheck,
    Image as ImageIcon, MessageSquare
} from 'lucide-react';
import WhatsAppButton from '@/components/WhatsAppButton';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { WhatsAppService } from '@/lib/whatsapp-unified';
import { NotificationScheduler } from '@/lib/notificationScheduler';
import { useProfile, useModal } from '@/hooks/useCompact';
import {
    formatCurrency,
    formatDate,
    calculateDaysOverdue,
    calculateProgress,
    getStatusColor,
    getStatusLabel
} from '@/lib/utils';
import type { Customer, Payment } from '@/types';
import { usePayments } from '@/hooks/useCustomers';

export default function CustomerDetailPage() {
    const router = useRouter();
    const params = useParams();
    const customerId = Number(params.id);

    const { profile } = useProfile();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);

    const paymentModal = useModal();
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentSource, setPaymentSource] = useState<'online' | 'offline'>('offline');

    const { payments, addPayment, deletePayment } = usePayments(customerId);

    useEffect(() => {
        loadCustomer();
    }, [customerId]);

    const loadCustomer = async () => {
        const found = await db.customers.get(customerId);
        if (!found) {
            router.push('/customers');
            return;
        }
        setCustomer(found);
        setLoading(false);
    };

    const handleAddPayment = async () => {
        if (!customer) return;

        const amount = parseFloat(paymentAmount);
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const remaining = customer.totalAmount - customer.paidAmount;
        if (amount > remaining) {
            if (!confirm('Payment exceeds remaining balance. Continue?')) return;
        }

        try {
            await addPayment({
                customerId: customer.id,
                amount,
                date: new Date().toISOString().split('T')[0],
                paymentSource,
            });

            // ✅ SEND PAYMENT NOTIFICATION
            await NotificationScheduler.notifyPaymentReceived(customer.name, amount);

            await loadCustomer();
            setPaymentAmount('');
            setPaymentSource('offline');
            paymentModal.hide();

            const updatedCustomer = await db.customers.get(customerId);
            if (updatedCustomer && updatedCustomer.paidAmount >= updatedCustomer.totalAmount) {
                // ✅ SEND COMPLETION NOTIFICATION
                await NotificationScheduler.notifyCompletion(updatedCustomer.name);

                if (confirm('Payment completed! 🎉 Send congratulations via WhatsApp?')) {
                    WhatsAppService.sendCompletion(updatedCustomer);
                }
            }
        } catch (error) {
            console.error('Error adding payment:', error);
            alert('Failed to add payment');
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

    const toggleAutoMessaging = async () => {
        if (!customer) return;

        const updated = !customer.autoMessaging;
        await db.customers.update(customer.id, { autoMessaging: updated });
        await loadCustomer();

        alert(updated ? '✅ Auto-messages enabled' : '⏹️ Auto-messages disabled');
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
    const daysOverdue = calculateDaysOverdue(customer.lastPayment);

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
                            <h2 className="text-2xl font-bold mb-2 truncate">{customer.name}</h2>
                            <div className="space-y-1.5 text-sm text-gray-600">
                                {customer.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 flex-shrink-0" />
                                        <span>{customer.phone}</span>
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{customer.address}</span>
                                    </div>
                                )}
                                {customer.cnic && (
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 flex-shrink-0" />
                                        <span>{customer.cnic}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {customer.cnicPhoto && (
                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                CNIC Photo
                            </p>
                            <img
                                src={customer.cnicPhoto}
                                alt="CNIC"
                                className="w-full max-w-md h-auto rounded-lg border-2 border-gray-200 shadow-sm"
                            />
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

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Total</p>
                            <p className="font-bold text-lg">{formatCurrency(customer.totalAmount)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Paid</p>
                            <p className="font-bold text-lg text-green-600">{formatCurrency(customer.paidAmount)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Remaining</p>
                            <p className="font-bold text-lg text-orange-600">{formatCurrency(Math.max(0, remaining))}</p>
                        </div>
                    </div>
                </div>

                {/* Auto WhatsApp toggle */}
                <button
                    onClick={toggleAutoMessaging}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${
                        customer.autoMessaging
                            ? 'bg-green-50 border-green-500'
                            : 'bg-gray-50 border-gray-300'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <MessageSquare className={`w-6 h-6 ${customer.autoMessaging ? 'text-green-600' : 'text-gray-400'}`} />
                            <div className="text-left">
                                <p className="font-semibold">Auto WhatsApp Messages</p>
                                <p className="text-sm text-gray-600">
                                    {customer.autoMessaging ? 'Enabled ✓' : 'Disabled'}
                                </p>
                            </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-all ${customer.autoMessaging ? 'bg-green-500' : 'bg-gray-300'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full m-0.5 transition-transform ${customer.autoMessaging ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>
                </button>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => paymentModal.show()}
                        disabled={isCompleted}
                        className={`py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                            isCompleted
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                        }`}
                    >
                        <DollarSign className="w-5 h-5" />
                        Add Payment
                    </button>
                    <WhatsAppButton
                        customer={customer}
                        type={daysOverdue > 7 ? 'overdue' : 'reminder'}
                        daysOverdue={daysOverdue}
                        className="py-3 px-4 shadow-lg shadow-green-500/30"
                    />
                </div>

                {/* Guarantors */}
                {customer.guarantors && customer.guarantors.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-purple-600" />
                            Guarantors ({customer.guarantors.length})
                        </h3>
                        <div className="space-y-3">
                            {customer.guarantors.map(g => (
                                <div
                                    key={g.id}
                                    className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex gap-2 flex-shrink-0">
                                            {g.photos && g.photos.length > 0 ? (
                                                <>
                                                    {g.photos.slice(0, 2).map((photo, idx) => (
                                                        <img
                                                            key={idx}
                                                            src={photo}
                                                            alt={`${g.name} ${idx + 1}`}
                                                            className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-sm"
                                                        />
                                                    ))}
                                                    {g.photos.length > 2 && (
                                                        <div className="w-16 h-16 rounded-lg bg-purple-100 flex items-center justify-center text-sm text-purple-600 font-bold border-2 border-white shadow-sm">
                                                            +{g.photos.length - 2}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xl border-2 border-white shadow-sm">
                                                    {g.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-base truncate">{g.name}</p>
                                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                <Phone className="w-3 h-3" />
                                                {g.phone}
                                            </p>
                                            {g.cnic && (
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <CreditCard className="w-3 h-3" />
                                                    {g.cnic}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                {g.relation && (
                                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                                        {g.relation}
                                                    </span>
                                                )}
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                                    {g.photos?.length || 0} photos
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes */}
                {customer.notes && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Notes
                        </h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
                    </div>
                )}

                {/* Payment History */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" />
                        Payment History ({payments.length})
                    </h3>
                    {payments.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No payments yet</p>
                    ) : (
                        <div className="space-y-3">
                            {payments.map(payment => (
                                <div key={payment.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{formatCurrency(payment.amount)}</p>
                                            <p className="text-sm text-gray-500">{formatDate(payment.date)}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {payment.paymentSource === 'online' ? '💳 Online Transfer' : '💵 Cash/Check'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeletePayment(payment.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        aria-label="Delete payment"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {paymentModal.open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="text-xl font-bold">Add Payment</h3>
                            <button
                                onClick={() => paymentModal.hide()}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
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

                            <button
                                onClick={handleAddPayment}
                                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                Add Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}