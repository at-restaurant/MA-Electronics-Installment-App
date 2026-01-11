// src/app/pending/page.tsx - WITH GLOBAL HEADER + COMPACT HOOKS

"use client";

import { AlertCircle, Clock, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import CustomerCard from "@/components/CustomerCard";
import Navigation from "@/components/Navigation";
import GlobalHeader from "@/components/GlobalHeader";
import FilterBar from "@/components/FilterBar";
import { useProfile, useCompactCustomers } from "@/hooks/useCompact";
import { WhatsAppService } from "@/lib/whatsapp";
import { formatCurrency, calculateDaysOverdue } from "@/lib/utils";
import type { Customer } from "@/types";

interface PendingCustomer extends Customer {
    daysOverdue: number;
    remaining: number;
}

export default function PendingPage() {
    const router = useRouter();
    const { profile } = useProfile();
    const { customers } = useCompactCustomers(profile?.id);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Calculate pending customers
    const pendingCustomers: PendingCustomer[] = customers
        .filter(c => c.paidAmount < c.totalAmount)
        .map(c => ({
            ...c,
            daysOverdue: calculateDaysOverdue(c.lastPayment),
            remaining: c.totalAmount - c.paidAmount,
        }))
        .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Filter customers
    const filteredCustomers = pendingCustomers.filter(customer => {
        // Search filter
        const matchesSearch =
            customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.phone.includes(searchQuery);

        // Status filter
        const matchesFilter =
            filter === "all" ||
            (filter === "overdue" && customer.daysOverdue > 7) ||
            (filter === "warning" && customer.daysOverdue > 3 && customer.daysOverdue <= 7) ||
            (filter === "active" && customer.daysOverdue <= 3);

        return matchesSearch && matchesFilter;
    });

    // Stats
    const totalPending = pendingCustomers.reduce((sum, c) => sum + c.remaining, 0);
    const overdueCount = pendingCustomers.filter(c => c.daysOverdue > 7).length;
    const warningCount = pendingCustomers.filter(c => c.daysOverdue > 3 && c.daysOverdue <= 7).length;
    const activeCount = pendingCustomers.filter(c => c.daysOverdue <= 3).length;

    // Filter options for FilterBar
    const filterOptions = [
        { id: "all", label: "All", count: pendingCustomers.length },
        { id: "overdue", label: "Overdue", count: overdueCount, color: "bg-red-600 text-white" },
        { id: "warning", label: "Warning", count: warningCount, color: "bg-orange-600 text-white" },
        { id: "active", label: "Active", count: activeCount, color: "bg-blue-600 text-white" },
    ];

    const handleAction = (customer: Customer, action: string) => {
        if (action === "view") {
            router.push(`/customers/${customer.id}`);
        } else if (action === "whatsapp") {
            const daysOverdue = calculateDaysOverdue(customer.lastPayment);
            if (daysOverdue > 7) {
                WhatsAppService.sendOverdueAlert(customer, daysOverdue);
            } else {
                WhatsAppService.sendPaymentReminder(customer);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Pending Payments" />

            <div className="pt-16 p-4 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                        <p className="text-xs text-gray-600">Overdue</p>
                    </div>

                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <Clock className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-600">{warningCount}</p>
                        <p className="text-xs text-gray-600">Warning</p>
                    </div>

                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <MessageSquare className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{pendingCustomers.length}</p>
                        <p className="text-xs text-gray-600">Total</p>
                    </div>
                </div>

                {/* Total Pending Card */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-6 h-6" />
                        <p className="text-sm opacity-90">Total Pending Amount</p>
                    </div>
                    <p className="text-3xl font-bold mb-2">{formatCurrency(totalPending)}</p>
                    <p className="text-sm opacity-75">
                        From {pendingCustomers.length} customer{pendingCustomers.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Filter Bar */}
                <FilterBar
                    searchPlaceholder="Search pending customers..."
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    filters={filterOptions}
                    activeFilter={filter}
                    onFilterChange={setFilter}
                />

                {/* Customer List */}
                <div className="space-y-3">
                    {filteredCustomers.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center">
                            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600 mb-2 font-medium">
                                {searchQuery
                                    ? "No customers found"
                                    : filter === "all"
                                        ? "No pending payments!"
                                        : `No ${filter} payments`
                                }
                            </p>
                            {!searchQuery && filter === "all" && (
                                <p className="text-sm text-gray-400">
                                    All customers are up to date! 🎉
                                </p>
                            )}
                        </div>
                    ) : (
                        filteredCustomers.map(customer => (
                            <CustomerCard
                                key={customer.id}
                                customer={customer}
                                onClick={() => router.push(`/customers/${customer.id}`)}
                                variant="detailed"
                                showActions={true}
                                onActionClick={handleAction}
                            />
                        ))
                    )}
                </div>

                {/* Info Box */}
                {filteredCustomers.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <p className="text-sm text-amber-800">
                            <strong>💡 Tip:</strong> Send WhatsApp reminders to customers who are late.
                            Regular messages help maintain payment discipline.
                        </p>
                    </div>
                )}
            </div>

            <Navigation currentPage="pending" />
        </div>
    );
}