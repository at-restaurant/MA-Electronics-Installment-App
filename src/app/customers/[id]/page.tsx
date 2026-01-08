'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Phone, MapPin, CreditCard, Calendar, Edit, Trash2,
    TrendingUp, DollarSign, History, FileText, CheckCircle
} from 'lucide-react';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Storage } from '@/lib/storage';
import { formatCurrency, formatDate, calculateDaysOverdue } from '@/lib/utils';

interface Customer {
    id: number;
    profileId: number;
    name: string;
    phone: string;
    address?: string;
    cnic?: string;
    photo?: string | null;
    document?: string | null;
    totalAmount: number;
    paidAmount: number;
    installmentAmount: number;
    frequency: string;
    startDate: string;
    lastPayment: string;
    notes?: string;
    status: string;
}

interface Payment {
    id: number;
    customerId: number;
    amount: number;
    date: string;
    createdAt: string;
}

export default function CustomerDetailPage() {
    const router = useRouter();
    const params = useParams();
    const customerId = params.id as string;

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');

    useEffect(() => {
        const allCustomers = Storage.get<Customer[]>('customers', []);
        const found = allCustomers.find((c) => c.id === Number(customerId));

        if (!found) {
            router.push('/customers');
            return;
        }

        setCustomer(found);

        // Load payment history
        const allPayments = Storage.get<Payment[]>('payments', []);
        const customerPayments = allPayments.filter((p) => p.customerId === found.id);
        setPayments(customerPayments);
    }, [customerId, router]);

    const handleAddPayment = () => {
        if (!customer) return;

        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const payment: Payment = {
            id: Date.now(),
            customerId: customer.id,
            amount: parseFloat(paymentAmount),
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };

        // Save payment
        const allPayments = Storage.get<Payment[]>('payments', []);
        allPayments.push(payment);
        Storage.save('payments', allPayments);

        // Update customer
        const allCustomers = Storage.get<Customer[]>('customers', []);
        const customerIndex = allCustomers.findIndex((c) => c.id === customer.id);
        if (customerIndex !== -1) {
            allCustomers[customerIndex].paidAmount += payment.amount;
            allCustomers[customerIndex].lastPayment = payment.date;
            Storage.save('customers', allCustomers);
            setCustomer(allCustomers[customerIndex]);
        }

        setPayments([payment, ...payments]);
        setPaymentAmount('');
        setShowAddPayment(false);

        // Check if completed
        if (allCustomers[customerIndex] && allCustomers[customerIndex].paidAmount >= allCustomers[customerIndex].totalAmount) {
            if (confirm('Payment completed! Send congratulations message?')) {
                // WhatsApp completion message will be sent
            }
        }
    };

    const handleDelete = () => {
        if (!customer) return;

        if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
            return;
        }

        const allCustomers = Storage.get<Customer[]>('customers', []);
        const filtered = allCustomers.filter((c) => c.id !== customer.id);
        Storage.save('customers', filtered);

        router.push('/customers');
    };

    if (!customer) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    const progress = (customer.paidAmount / customer.totalAmount) * 100;
    const remaining = customer.totalAmount - customer.paidAmount;
    const isCompleted = progress >= 100;
    const daysOverdue = calculateDaysOverdue(customer.lastPayment);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold">Customer Details</h1>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => alert('Edit feature coming soon!')}
                            className="p-2 hover:bg-gray-100 rounded-full text-blue-600"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 hover:bg-gray-100 rounded-full text-red-600"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Customer Info Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl overflow-hidden">
                            {customer.photo ? (
                                <img src={customer.photo} alt={customer.name} className="w-full h-full object-cover" />
                            ) : (
                                customer.name.charAt(0)
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-2">{customer.name}</h2>
                            <div className="space-y-1 text-sm text-gray-600">
                                {customer.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        <span>{customer.phone}</span>
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        <span>{customer.address}</span>
                                    </div>
                                )}
                                {customer.cnic && (
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" />
                                        <span>{customer.cnic}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                isCompleted
                    ? 'bg-green-100 text-green-700'
                    : daysOverdue > 7
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
            }`}>
              {isCompleted ? '✓ Completed' : daysOverdue > 7 ? '⚠ Overdue' : 'Active'}
            </span>
                        <span className="text-sm text-gray-500">
              Started {formatDate(customer.startDate)}
            </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Payment Progress</span>
                            <span className="font-bold">{Math.round(progress)}%</span>
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

                    {/* Amount Details */}
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
                            <p className="font-bold text-lg text-orange-600">{formatCurrency(remaining)}</p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowAddPayment(true)}
                        disabled={isCompleted}
                        className={`py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
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

                {/* Installment Info */}
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

                {/* Payment History */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" />
                        Payment History
                    </h3>
                    {payments.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No payments yet</p>
                    ) : (
                        <div className="space-y-3">
                            {payments.map(payment => (
                                <div key={payment.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{formatCurrency(payment.amount)}</p>
                                            <p className="text-sm text-gray-500">{formatDate(payment.date)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notes */}
                {customer.notes && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Notes
                        </h3>
                        <p className="text-gray-700">{customer.notes}</p>
                    </div>
                )}
            </div>

            {/* Add Payment Modal */}
            {showAddPayment && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">Add Payment</h3>
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
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Suggested: {formatCurrency(customer.installmentAmount)}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAddPayment(false)}
                                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddPayment}
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700"
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