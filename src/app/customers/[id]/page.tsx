// src/app/customers/[id]/page.tsx - FIXED
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Phone, MapPin, CreditCard, Calendar, Edit, Trash2,
    DollarSign, History, FileText, CheckCircle, X
} from 'lucide-react';
import WhatsAppButton from '@/components/WhatsAppButton';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import { Storage } from '@/lib/storage';
import { db } from '@/lib/db';
import { WhatsAppService } from '@/lib/whatsapp';
import {
    formatCurrency,
    formatDate,
    calculateDaysOverdue,
    calculateProgress,
    getStatusColor,
    getStatusLabel
} from '@/lib/utils';
import type { Customer, Payment, Profile } from '@/types';
import { usePayments } from '@/hooks/useCustomers';

export default function CustomerDetailPage() {
    const router = useRouter();
    const params = useParams();
    const customerId = Number(params.id);

    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [loading, setLoading] = useState(true);

    const { payments, addPayment, deletePayment } = usePayments(customerId);

    useEffect(() => {
        loadData();
    }, [customerId]);

    const loadData = async () => {
        setLoading(true);

        const profile = await Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }
        setCurrentProfile(profile);

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

        if (amount > (customer.totalAmount - customer.paidAmount)) {
            if (!confirm('Payment amount exceeds remaining balance. Continue?')) {
                return;
            }
        }

        try {
            await addPayment({
                customerId: customer.id,
                amount,
                date: new Date().toISOString().split('T')[0],
            });

            // Reload customer data
            await loadData();

            setPaymentAmount('');
            setShowAddPayment(false);

            // Check if completed
            const updatedCustomer = await db.customers.get(customerId);
            if (updatedCustomer && updatedCustomer.paidAmount >= updatedCustomer.totalAmount) {
                if (confirm('Payment completed! 🎉 Send congratulations message via WhatsApp?')) {
                    WhatsAppService.sendCompletionMessage(updatedCustomer);
                }
            }
        } catch (error) {
            console.error('Error adding payment:', error);
            alert('Failed to add payment. Please try again.');
        }
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!confirm('Delete this payment? This cannot be undone.')) return;

        try {
            await deletePayment(paymentId);
            await loadData();
        } catch (error) {
            console.error('Error deleting payment:', error);
            alert('Failed to delete payment.');
        }
    };

    const handleDelete = async () => {
        if (!customer) return;

        if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
            return;
        }

        try {
            await db.customers.delete(customer.id);
            await db.payments.where('customerId').equals(customer.id).delete();

            router.push('/customers');
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Failed to delete customer.');
        }
    };

    if (loading || !customer || !currentProfile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 mt-4">Loading customer details...</p>
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
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold">Customer Details</h1>
                    </div>
                    <ProfileSwitcher
                        currentProfile={currentProfile}
                        onProfileChange={() => router.push('/customers')}
                    />
                </div>
                <div className="flex gap-2 ml-14">
                    <button
                        onClick={() => router.push(`/customers/${customer.id}/edit`)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        aria-label="Edit customer"
                    >
                        <Edit className="w-4 h-4" />
                        Edit
                    </button>
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Delete customer"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl overflow-hidden flex-shrink-0">
                            {customer.photo ? (
                                <img src={customer.photo} alt={customer.name} className="w-full h-full object-cover" />
                            ) : (
                                customer.name.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold mb-2 truncate">{customer.name}</h2>
                            <div className="space-y-1 text-sm text-gray-600">
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

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowAddPayment(true)}
                        disabled={isCompleted}
                        className={`py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                            isCompleted
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        <DollarSign className="w-5 h-5" />
                        Add Payment
                    </button>
                    <WhatsAppButton
                        customer={customer}
                        type={daysOverdue > 7 ? 'overdue' : 'reminder'}
                        daysOverdue={daysOverdue}
                        className="py-3 px-4"
                    />
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Installment Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Installment Amount</p>
                            <p className="font-semibold">{formatCurrency(customer.installmentAmount)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Frequency</p>
                            <p className="font-semibold capitalize">{customer.frequency}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Last Payment</p>
                            <p className="font-semibold">{formatDate(customer.lastPayment)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Days Since</p>
                            <p className={`font-semibold ${daysOverdue > 7 ? 'text-red-600' : 'text-gray-900'}`}>
                                {daysOverdue} days
                            </p>
                        </div>
                    </div>
                </div>

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

            {showAddPayment && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Add Payment</h3>
                            <button
                                onClick={() => setShowAddPayment(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Amount (₨)
                                </label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder={customer.installmentAmount.toString()}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                    min="0"
                                    step="0.01"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Suggested: {formatCurrency(customer.installmentAmount)}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Remaining: {formatCurrency(Math.max(0, remaining))}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAddPayment(false)}
                                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddPayment}
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    Add Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}