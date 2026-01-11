// src/app/daily/page.tsx - WITH GLOBAL HEADER + COMPACT HOOKS

"use client";

import { useState, useEffect } from "react";
import { Calendar, CheckCircle, Circle, DollarSign, Users } from "lucide-react";
import Navigation from "@/components/Navigation";
import GlobalHeader from "@/components/GlobalHeader";
import { useProfile } from "@/hooks/useCompact";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import type { Customer, Payment } from "@/types";

export default function DailyPage() {
    const { profile } = useProfile();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [todayPayments, setTodayPayments] = useState<Record<number, boolean>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (profile) loadData();
    }, [profile, selectedDate]);

    const loadData = async () => {
        if (!profile) return;

        // Load daily customers
        const dailyCustomers = await db.customers
            .where('[profileId+status]')
            .equals([profile.id, 'active'])
            .filter(c => c.frequency === 'daily')
            .toArray();

        setCustomers(dailyCustomers);

        // Load today's payments
        const payments = await db.payments
            .where('date')
            .equals(selectedDate)
            .toArray();

        const paymentMap: Record<number, boolean> = {};
        payments.forEach(p => { paymentMap[p.customerId] = true; });
        setTodayPayments(paymentMap);
    };

    const togglePayment = async (customer: Customer) => {
        if (processing) return;
        setProcessing(true);

        try {
            const isPaid = todayPayments[customer.id];

            if (isPaid) {
                // Remove payment
                await db.transaction('rw', db.payments, db.customers, async () => {
                    await db.payments
                        .where('[customerId+date]')
                        .equals([customer.id, selectedDate])
                        .delete();

                    await db.customers.update(customer.id, {
                        paidAmount: customer.paidAmount - customer.installmentAmount
                    });
                });

                setTodayPayments(prev => {
                    const newState = { ...prev };
                    delete newState[customer.id];
                    return newState;
                });
            } else {
                // Add payment
                const payment: Payment = {
                    id: Date.now(),
                    customerId: customer.id,
                    amount: customer.installmentAmount,
                    date: selectedDate,
                    createdAt: new Date().toISOString(),
                };

                await db.transaction('rw', db.payments, db.customers, async () => {
                    await db.payments.add(payment);
                    await db.customers.update(customer.id, {
                        paidAmount: customer.paidAmount + customer.installmentAmount,
                        lastPayment: selectedDate,
                    });
                });

                setTodayPayments(prev => ({ ...prev, [customer.id]: true }));
            }

            await loadData();
        } catch (error) {
            console.error('Payment toggle error:', error);
            alert('Failed to update payment');
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
            <GlobalHeader title="Daily Collection" />

            <div className="pt-16 p-4 space-y-4">
                {/* Date Selector */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-600" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            max={new Date().toISOString().split("T")[0]}
                            className="flex-1 bg-transparent border-0 font-medium focus:outline-none"
                        />
                    </div>
                </div>

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
                                Customers with daily frequency will appear here
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
                                                isPaid ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400'
                                            }`}>
                                                {isPaid ? <CheckCircle className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                                            </div>

                                            {/* Customer Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">{customer.name}</h3>
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

                {/* Help Note */}
                {customers.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-sm text-blue-800">
                            💡 <strong>Tip:</strong> Tap customer cards to mark payments.
                            Tap again to undo.
                        </p>
                    </div>
                )}
            </div>

            <Navigation currentPage="daily" />
        </div>
    );
}