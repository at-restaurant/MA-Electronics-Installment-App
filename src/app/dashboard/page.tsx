// src/app/dashboard/page.tsx - WITH GLOBAL HEADER

"use client";

import { DollarSign, Users, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import GlobalHeader from "@/components/GlobalHeader";
import { useProfile, useCompactCustomers } from "@/hooks/useCompact";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
    const router = useRouter();
    const { profile } = useProfile();
    const { customers, stats } = useCompactCustomers(profile?.id);

    const pending = stats.expected - stats.revenue;
    const collectionRate = stats.expected > 0
        ? Math.round((stats.revenue / stats.expected) * 100)
        : 0;

    // Recent customers (last 5)
    const recentCustomers = customers
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Dashboard" />

            <div className="pt-16 p-4 space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-lg">
                        <DollarSign className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90 mb-1">Total Received</p>
                        <p className="text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
                        <Clock className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90 mb-1">Pending</p>
                        <p className="text-2xl font-bold">{formatCurrency(pending)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                        <Users className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90 mb-1">Total Customers</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
                        <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                        <p className="text-sm opacity-90 mb-1">Collection Rate</p>
                        <p className="text-2xl font-bold">{collectionRate}%</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => router.push('/customers/add')}
                        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left border border-gray-200"
                    >
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="font-semibold text-sm">Add Customer</p>
                        <p className="text-xs text-gray-500 mt-1">Create new account</p>
                    </button>

                    <button
                        onClick={() => router.push('/daily')}
                        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left border border-gray-200"
                    >
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="font-semibold text-sm">Daily Collection</p>
                        <p className="text-xs text-gray-500 mt-1">Mark payments</p>
                    </button>
                </div>

                {/* Recent Customers */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Recent Customers</h3>
                        <button
                            onClick={() => router.push('/customers')}
                            className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            View All
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recentCustomers.length === 0 ? (
                            <p className="text-center text-gray-500 py-8 text-sm">No customers yet</p>
                        ) : (
                            recentCustomers.map(customer => (
                                <div
                                    key={customer.id}
                                    onClick={() => router.push(`/customers/${customer.id}`)}
                                    className="flex items-center justify-between py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                                            {customer.photo ? (
                                                <img src={customer.photo} alt={customer.name} className="w-full h-full object-cover" />
                                            ) : (
                                                customer.name.charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{customer.name}</p>
                                            <p className="text-xs text-gray-500">{customer.phone}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-green-600 text-sm">
                                            {formatCurrency(customer.installmentAmount)}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">{customer.frequency}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <Navigation currentPage="dashboard" />
        </div>
    );
}