'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import type { Customer, Payment } from '@/types';
import { useProfile } from '@/hooks/useCompact';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';

export default function DailyPage() {
    const { profile } = useProfile();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [form, setForm] = useState({
        customerId: 0,
        amount: '',
        source: 'offline' as 'online' | 'offline',
    });
    const [todayPayments, setTodayPayments] = useState<Payment[]>([]);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (profile) loadData();
    }, [profile]);

    const loadData = async () => {
        const active = await db.getActiveCustomersByProfile(profile! .id);
        setCustomers(active);

        const allPayments = await db.getPaymentsByProfile(profile!.id);
        setTodayPayments(allPayments.filter(p => p.date === today));
    };

    const handleSubmit = async () => {
        if (! form.customerId || !form.amount) {
            alert('Select customer and enter amount');
            return;
        }

        const customer = customers.find(c => c.id === form.customerId);
        if (!customer) return;

        const amount = parseFloat(form.amount);
        if (amount <= 0) {
            alert('Enter valid amount');
            return;
        }

        const payment: Payment = {
            id: Date.now(),
            customerId: form.customerId,
            amount,
            date: today,
            createdAt: new Date().toISOString(),
            paymentSource: form.source,
        };

        await db.payments.add(payment);

        const newPaidAmount = customer.paidAmount + amount;
        await db.customers.update(form.customerId, {
            paidAmount: newPaidAmount,
            lastPayment: today,
            status: newPaidAmount >= customer.totalAmount ? 'completed' : 'active',
        });

        setTodayPayments([...todayPayments, payment]);
        setForm({ customerId: 0, amount: '', source: 'offline' });
        alert('✅ Payment saved');
    };

    const totalToday = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Daily Collection" />

            <div className="pt-16 p-4 max-w-2xl mx-auto">
                {/* Today's Summary */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 shadow-sm mb-4 text-white">
                    <p className="text-sm opacity-90">Today's Collection</p>
                    <p className="text-3xl font-bold">{formatCurrency(totalToday)}</p>
                    <p className="text-xs opacity-75 mt-1">{todayPayments.length} transactions</p>
                </div>

                {/* Add Payment */}
                <div className="bg-white rounded-lg p-4 shadow-sm space-y-3 mb-4">
                    <h3 className="font-semibold">Record Payment</h3>

                    <select
                        value={form.customerId}
                        onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value={0}>Select Customer</option>
                        {customers. map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} - {formatCurrency(c.totalAmount - c.paidAmount)} remaining
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        placeholder="Amount (₨)"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />

                    {/* Payment Source Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setForm({ ...form, source: 'offline' })}
                            className={`py-2 rounded-lg font-medium text-sm transition-all ${
                                form.source === 'offline'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            💵 Offline
                        </button>
                        <button
                            onClick={() => setForm({ ...form, source: 'online' })}
                            className={`py-2 rounded-lg font-medium text-sm transition-all ${
                                form.source === 'online'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            💳 Online
                        </button>
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover: bg-green-700 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Save Payment
                    </button>
                </div>

                {/* Today's List */}
                {todayPayments.length > 0 ?  (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold mb-3">Transactions Today</h3>
                        <div className="space-y-2">
                            {todayPayments. map(p => {
                                const customer = customers.find(c => c.id === p.customerId);
                                return (
                                    <div key={p.id} className="flex justify-between items-center text-sm border-b pb-2">
                                        <div className="flex-1">
                                            <p className="font-medium">{customer?. name}</p>
                                            <p className="text-xs text-gray-500">
                                                {p.paymentSource === 'online' ? '💳 Online Transfer' : '💵 Cash/Check'}
                                            </p>
                                        </div>
                                        <p className="font-bold text-green-600">{formatCurrency(p.amount)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                        <p className="text-gray-500">No payments today yet</p>
                    </div>
                )}
            </div>

            <Navigation currentPage="daily" />
        </div>
    );
}