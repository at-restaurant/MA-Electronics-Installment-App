"use client";

import {
    AlertCircle,
    ChevronRight,
    Clock,
    MessageSquare,
    Phone,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Storage } from "@/lib/storage";
import {
    calculateDaysOverdue,
    formatCurrency,
    formatDate,
} from "@/lib/utils";
import type { Customer, Profile } from "@/types";

interface PendingCustomer extends Customer {
    daysOverdue: number;
    remaining: number;
}

export default function PendingPage() {
    const router = useRouter();
    const [pendingCustomers, setPendingCustomers] = useState<PendingCustomer[]>([]);
    const [filter, setFilter] = useState<"all" | "overdue" | "warning">("all");

    const loadPendingCustomers = (profileId: number) => {
        const allCustomers = Storage.get<Customer[]>("customers", []);

        const pending = allCustomers
            .filter(
                (c) =>
                    c.profileId === profileId && c.paidAmount < c.totalAmount,
            )
            .map((c) => ({
                ...c,
                daysOverdue: calculateDaysOverdue(c.lastPayment),
                remaining: c.totalAmount - c.paidAmount,
            }))
            .sort((a, b) => b.daysOverdue - a.daysOverdue);

        setPendingCustomers(pending);
    };

    useEffect(() => {
        const profile = Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }

        loadPendingCustomers(profile.id);
    }, [router]);

    const filteredCustomers = pendingCustomers.filter((customer) => {
        if (filter === "overdue") return customer.daysOverdue > 7;
        if (filter === "warning")
            return customer.daysOverdue > 3 && customer.daysOverdue <= 7;
        return true;
    });

    const totalPending = pendingCustomers.reduce(
        (sum, c) => sum + c.remaining,
        0,
    );
    const overdueCount = pendingCustomers.filter((c) => c.daysOverdue > 7).length;
    const warningCount = pendingCustomers.filter(
        (c) => c.daysOverdue > 3 && c.daysOverdue <= 7,
    ).length;

    const getRiskLevel = (daysOverdue: number) => {
        if (daysOverdue > 7) return "high";
        if (daysOverdue > 3) return "medium";
        return "low";
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case "high":
                return "bg-red-100 text-red-700 border-red-200";
            case "medium":
                return "bg-orange-100 text-orange-700 border-orange-200";
            default:
                return "bg-blue-100 text-blue-700 border-blue-200";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4">
                <h1 className="text-2xl font-bold mb-1">Pending Payments</h1>
                <p className="text-sm text-gray-600">
                    {pendingCustomers.length} customer
                    {pendingCustomers.length !== 1 ? "s" : ""} with pending payments
                </p>
            </div>

            <div className="p-4 space-y-4">
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
                        <p className="text-2xl font-bold text-blue-600">
                            {pendingCustomers.length}
                        </p>
                        <p className="text-xs text-gray-600">Total</p>
                    </div>
                </div>

                {/* Total Pending Card */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-6 h-6" />
                        <p className="text-sm opacity-90">Total Pending Amount</p>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(totalPending)}</p>
                    <p className="text-sm opacity-75 mt-2">
                        From {pendingCustomers.length} customer
                        {pendingCustomers.length !== 1 ? "s" : ""}
                    </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        type="button"
                        onClick={() => setFilter("all")}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                            filter === "all"
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-700 border border-gray-200"
                        }`}
                    >
                        All ({pendingCustomers.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter("overdue")}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                            filter === "overdue"
                                ? "bg-red-600 text-white"
                                : "bg-white text-gray-700 border border-gray-200"
                        }`}
                    >
                        Overdue ({overdueCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter("warning")}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                            filter === "warning"
                                ? "bg-orange-600 text-white"
                                : "bg-white text-gray-700 border border-gray-200"
                        }`}
                    >
                        Warning ({warningCount})
                    </button>
                </div>

                {/* Customer List */}
                <div className="space-y-3">
                    {filteredCustomers.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center">
                            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 mb-2">No pending payments</p>
                            <p className="text-sm text-gray-400">
                                {filter === "all"
                                    ? "All customers are up to date!"
                                    : `No ${filter} payments found`}
                            </p>
                        </div>
                    ) : (
                        filteredCustomers.map((customer) => {
                            const riskLevel = getRiskLevel(customer.daysOverdue);
                            const isOverdue = customer.daysOverdue > 7;

                            return (
                                <div
                                    key={customer.id}
                                    className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${
                                        isOverdue ? "border-red-200" : "border-transparent"
                                    }`}
                                >
                                    {/* Customer Header */}
                                    <div
                                        className="flex items-start gap-3 mb-3 cursor-pointer"
                                        onClick={() => router.push(`/customers/${customer.id}`)}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold shadow-md overflow-hidden flex-shrink-0">
                                            {customer.photo ? (
                                                <Image
                                                    src={customer.photo}
                                                    alt={customer.name}
                                                    width={48}
                                                    height={48}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                customer.name.charAt(0)
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-semibold text-gray-900 truncate">
                                                    {customer.name}
                                                </h3>
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                                                        getRiskColor(riskLevel)
                                                    }`}
                                                >
                          {isOverdue
                              ? "⚠ Overdue"
                              : riskLevel === "medium"
                                  ? "⚡ Warning"
                                  : "Active"}
                        </span>
                                            </div>

                                            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                                <Phone className="w-3 h-3" />
                                                <span>{customer.phone}</span>
                                            </div>
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    </div>

                                    {/* Payment Details */}
                                    <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-gray-100">
                                        <div>
                                            <p className="text-xs text-gray-500">Pending</p>
                                            <p className="font-bold text-orange-600">
                                                {formatCurrency(customer.remaining)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Last Payment</p>
                                            <p className="font-medium text-sm">
                                                {formatDate(customer.lastPayment)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Days Ago</p>
                                            <p
                                                className={`font-bold ${isOverdue ? "text-red-600" : "text-gray-900"}`}
                                            >
                                                {customer.daysOverdue}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/customers/${customer.id}`)}
                                            className="py-2 px-4 bg-blue-50 text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors"
                                        >
                                            View Details
                                        </button>
                                        <WhatsAppButton
                                            customer={customer}
                                            type={isOverdue ? "overdue" : "reminder"}
                                            daysOverdue={customer.daysOverdue}
                                            className="py-2 px-4 text-sm"
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Info Box */}
                {filteredCustomers.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <p className="text-sm text-amber-800">
                            <strong>💡 Quick Tip:</strong> Send reminders via WhatsApp to
                            customers who are overdue. Regular communication helps maintain
                            good payment discipline.
                        </p>
                    </div>
                )}
            </div>

            <Navigation currentPage="pending" />
        </div>
    );
}