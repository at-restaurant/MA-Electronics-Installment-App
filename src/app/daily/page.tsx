'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle, Circle, DollarSign, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Storage } from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DailyPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<any>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [todayPayments, setTodayPayments] = useState<Record<number, boolean>>({});
    const allCustomers = Storage.get<any[]>('customers', []);
    const allPayments = Storage.get<any[]>('payments', []);

    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const profile = Storage.get('currentProfile');
        if (!profile) {
            router.push('/');
            return;
        }

        setCurrentProfile(profile);
        loadCustomers(profile.id);
        loadTodayPayments(profile.id);
    }, [router, selectedDate]);

    const loadCustomers = (profileId: number) => {
        const allCustomers = Storage.get('customers', []);
        const dailyCustomers = allCustomers.filter((c: any) =>
            c.profileId === profileId &&
            c.frequency === 'daily' &&
            c.paidAmount < c.totalAmount
        );
        setCustomers(dailyCustomers);
    };

    const loadTodayPayments = (profileId: number) => {
        const allPayments = Storage.get('payments', []);
        const todayPaymentsList = allPayments.filter((p: any) => p.date === selectedDate);

        const paymentMap: Record<number, boolean> = {};
        todayPaymentsList.forEach((p: any) => {
            paymentMap[p.customerId] = true;
        });

        setTodayPayments(paymentMap);
    };

    const togglePayment = async (customer: any) => {
        if (processing) return;

        setProcessing(true);

        try {
            const isAlreadyPaid = todayPayments[customer.id];

            if (isAlreadyPaid) {
                // Remove payment
                const allPayments = Storage.get('payments', []);
                const filtered = allPayments.filter((p: any) =>
                    !(p.customerId === customer.id && p.date === selectedDate)
                );
                Storage.save('payments', filtered);

                // Update customer
                const allCustomers = Storage.get('customers', []);
                const customerIndex = allCustomers.findIndex((c: any) => c.id === customer.id);
                if (customerIndex !== -1) {
                    allCustomers[customerIndex].paidAmount -= customer.installmentAmount;
                    Storage.save('customers', allCustomers);
                }

                setTodayPayments(prev => {
                    const newState = { ...prev };
                    delete newState[customer.id];
                    return newState;
                });
            } else {
                // Add payment
                const payment = {
                    id: Date.now(),
                    customerId: customer.id,
                    amount: customer.installmentAmount,
                    date: selectedDate,
                    createdAt: new Date().toISOString()
                };

                const allPayments = Storage.get('payments', []);
                allPayments.push(payment);
                Storage.save('payments', allPayments);

                // Update customer
                const allCustomers = Storage.get('customers', []);
                const customerIndex = allCustomers.findIndex((c: any) => c.id === customer.id);
                if (customerIndex !== -1) {
                    allCustomers[customerIndex].paidAmount += customer.installmentAmount;
                    allCustomers[customerIndex].lastPayment = selectedDate;
                    Storage.save('customers', allCustomers);

                    // Reload customers to update the list
                    loadCustomers(currentProfile.id);
                }

                setTodayPayments(prev => ({ ...prev, [customer.id]: true }));
            }
        } catch (error) {
            console.error('Error toggling payment:', error);
            alert('Failed to update payment. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const collectedToday = customers
        .filter(c => todayPayments[c.id])
        .reduce((sum, c) => sum + c.installmentAmount, 0);

    const paidCount = Object.keys(todayPayments).length;
    const totalCount = customers.length;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4">
                <h1 className="text-2xl font-bold mb-3">Daily Collection</h1>

                {/* Date Selector */}
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="flex-1 bg-transparent border-0 font-medium focus:outline-none"
                    />
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Stats Card */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm opacity-90 mb-1">Collected Today</p>
                            <p className="text-3xl font-bold">{formatCurrency(collectedToday)}</p>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                            <DollarSign className="w-8 h-8" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/20">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">Customers Paid</span>
                        </div>
                        <span className="font-bold">{paidCount} / {totalCount}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                        <div className="w-full bg-white/20 rounded-full h-2">
                            <div
                                className="bg-white h-2 rounded-full transition-all"
                                style={{ width: `${totalCount > 0 ? (paidCount / totalCount) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Customer List */}
                <div className="space-y-3">
                    {customers.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 mb-2">No daily customers found</p>
                            <p className="text-sm text-gray-400">
                                Add customers with daily payment frequency to see them here
                            </p>
                        </div>
                    ) : (
                        customers.map(customer => {
                            const isPaid = todayPayments[customer.id];
                            const remaining = customer.totalAmount - customer.paidAmount;

                            return (
                                <div
                                    key={customer.id}
                                    onClick={() => togglePayment(customer)}
                                    className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer transition-all active:scale-[0.98] ${
                                        isPaid ? 'ring-2 ring-green-500 bg-green-50' : 'hover:shadow-md'
                                    } ${processing ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            {/* Checkbox */}
                                            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                                isPaid
                                                    ? 'bg-green-500 text-white shadow-lg'
                                                    : 'bg-gray-100 text-gray-400'
                                            }`}>
                                                {isPaid ? (
                                                    <CheckCircle className="w-7 h-7" />
                                                ) : (
                                                    <Circle className="w-7 h-7" />
                                                )}
                                            </div>

                                            {/* Customer Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">
                                                    {customer.name}
                                                </h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Due: {formatCurrency(customer.installmentAmount)}
                          </span>
                                                    <span>•</span>
                                                    <span>Left: {formatCurrency(remaining)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        {isPaid && (
                                            <div className="flex-shrink-0 ml-2">
                        <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                          ✓ Paid
                        </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Summary Note */}
                {customers.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-sm text-blue-800">
                            💡 <strong>Tip:</strong> Tap on customer cards to mark payments. You can undo by tapping again.
                        </p>
                    </div>
                )}
            </div>

            <Navigation currentPage="daily" />
        </div>
    );
}