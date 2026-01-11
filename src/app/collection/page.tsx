// src/app/collection/page.tsx - WITH FREQUENCY TABS

'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar, DollarSign } from 'lucide-react';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import type { Customer, Payment } from '@/types';
import { useProfile } from '@/hooks/useCompact';
import Navigation from '@/components/Navigation';
import GlobalHeader from '@/components/GlobalHeader';

type FrequencyTab = 'daily' | 'weekly' | 'monthly';

export default function CollectionPage() {
    const { profile } = useProfile();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [activeTab, setActiveTab] = useState<FrequencyTab>('daily');

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
        const active = await db.getActiveCustomersByProfile(profile!.id);
        setCustomers(active);

        const allPayments = await db.getPaymentsByProfile(profile!.id);
        setTodayPayments(allPayments.filter(p => p.date === today));
    };

    const handleSubmit = async () => {
        if (!form.customerId || !form.amount) {
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
        loadData(); // Reload to update lists
    };

    // ✅ FILTER CUSTOMERS BY ACTIVE TAB
    const filteredCustomers = customers.filter(c => c.frequency === activeTab);

    // ✅ FILTER TODAY'S PAYMENTS BY ACTIVE TAB
    const filteredPayments = todayPayments.filter(payment => {
        const customer = customers.find(c => c.id === payment.customerId);
        return customer?.frequency === activeTab;
    });

    // ✅ CALCULATE TOTALS FOR ACTIVE TAB
    const totalToday = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

    // ✅ TAB CONFIGURATION
    const tabs: { id: FrequencyTab; label: string; icon: string }[] = [
        { id: 'daily', label: 'Daily', icon: '📅' },
        { id: 'weekly', label: 'Weekly', icon: '📆' },
        { id: 'monthly', label: 'Monthly', icon: '🗓️' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Collection" />

            <div className="pt-16 p-4 max-w-2xl mx-auto space-y-4">
                {/* ✅ FREQUENCY TABS */}
                <div className="bg-white rounded-xl shadow-sm p-2">
                    <div className="grid grid-cols-3 gap-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                                    activeTab === tab.id
                                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span className="text-sm">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ✅ TODAY'S SUMMARY FOR ACTIVE TAB */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 shadow-sm text-white">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm opacity-90">Today's {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Collection</p>
                        <Calendar className="w-5 h-5 opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(totalToday)}</p>
                    <p className="text-xs opacity-75 mt-1">{filteredPayments.length} transactions</p>
                </div>

                {/* ✅ CUSTOMER COUNT FOR ACTIVE TAB */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-700 font-medium">
                                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Customers
                            </p>
                            <p className="text-2xl font-bold text-blue-900">{filteredCustomers.length}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                {/* ✅ ADD PAYMENT FORM */}
                <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Plus className="w-5 h-5 text-green-600" />
                        Record Payment
                    </h3>

                    <select
                        value={form.customerId}
                        onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value={0}>Select Customer</option>
                        {filteredCustomers.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} - {formatCurrency(c.totalAmount - c.paidAmount)} remaining
                            </option>
                        ))}
                    </select>

                    {filteredCustomers.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                            No {activeTab} customers found
                        </p>
                    )}

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
                        disabled={filteredCustomers.length === 0}
                        className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-4 h-4" />
                        Save Payment
                    </button>
                </div>

                {/* ✅ TODAY'S TRANSACTIONS LIST */}
                {filteredPayments.length > 0 ? (
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            Today's {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Transactions
                        </h3>
                        <div className="space-y-2">
                            {filteredPayments.map(p => {
                                const customer = customers.find(c => c.id === p.customerId);
                                return (
                                    <div key={p.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-b-0">
                                        <div className="flex-1">
                                            <p className="font-medium">{customer?.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                <span>{p.paymentSource === 'online' ? '💳 Online' : '💵 Cash'}</span>
                                                <span>•</span>
                                                <span className="capitalize">{customer?.frequency}</span>
                                            </div>
                                        </div>
                                        <p className="font-bold text-green-600">{formatCurrency(p.amount)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Calendar className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500">No {activeTab} payments today yet</p>
                    </div>
                )}
            </div>

            <Navigation currentPage="daily" />
        </div>
    );
}