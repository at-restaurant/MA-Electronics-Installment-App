// src/app/page.tsx - HOME PAGE (Dashboard Redirect)

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Users, TrendingUp, Clock, ArrowRight, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import GlobalHeader from "@/components/GlobalHeader";
import { useProfile, useCompactCustomers } from "@/hooks/useCompact";
import { formatCurrency } from "@/lib/utils";

export default function HomePage() {
    const router = useRouter();
    const { profile, loading } = useProfile();
    const { customers, stats } = useCompactCustomers(profile?.id);


    // Loading screen
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Calculate stats
    const pending = stats.expected - stats.revenue;
    const collectionRate = stats.expected > 0
        ? Math.round((stats.revenue / stats.expected) * 100)
        : 0;

    // Recent customers
    const recentCustomers = customers
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    // Top performers (highest paid amount)
    const topPerformers = customers
        .filter(c => c.paidAmount > 0)
        .sort((a, b) => b.paidAmount - a.paidAmount)
        .slice(0, 3);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Dashboard" />

            <div className="pt-16 p-4 space-y-4">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-6 h-6" />
                        <h2 className="text-lg font-semibold">Welcome Back!</h2>
                    </div>
                    <p className="text-white/90 text-sm mb-4">
                        {profile?.name} - Your business at a glance
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                            <p className="text-xs opacity-90 mb-1">Active Customers</p>
                            <p className="text-2xl font-bold">{stats.active}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                            <p className="text-xs opacity-90 mb-1">Collection Rate</p>
                            <p className="text-2xl font-bold">{collectionRate}%</p>
                        </div>
                    </div>
                </div>

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
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => router.push('/customers/add')}
                            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-left hover:from-blue-100 hover:to-blue-200 transition-all border border-blue-200"
                        >
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mb-2">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <p className="font-semibold text-sm text-blue-900">Add Customer</p>
                            <p className="text-xs text-blue-700 mt-1">Create new account</p>
                        </button>

                        <button
                            onClick={() => router.push('/daily')}
                            className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-left hover:from-green-100 hover:to-green-200 transition-all border border-green-200"
                        >
                            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mb-2">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <p className="font-semibold text-sm text-green-900">Daily Collection</p>
                            <p className="text-xs text-green-700 mt-1">Mark payments</p>
                        </button>
                    </div>
                </div>

                {/* Top Performers */}
                {topPerformers.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                                Top Performers
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {topPerformers.map((customer, index) => (
                                <div
                                    key={customer.id}
                                    onClick={() => router.push(`/customers/${customer.id}`)}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                >
                                    <div className="flex-shrink-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                                        }`}>
                                            {index + 1}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{customer.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {Math.round((customer.paidAmount / customer.totalAmount) * 100)}% complete
                                        </p>
                                    </div>
                                    <p className="font-bold text-green-600 text-sm">
                                        {formatCurrency(customer.paidAmount)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                            <div className="text-center py-8">
                                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm mb-3">No customers yet</p>
                                <button
                                    onClick={() => router.push('/customers/add')}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Add Your First Customer
                                </button>
                            </div>
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