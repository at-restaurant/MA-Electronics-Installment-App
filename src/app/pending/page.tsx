// src/app/pending/page.tsx - FIXED

"use client";

import { AlertCircle, Clock, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CustomerCard from "@/components/CustomerCard";
import Navigation from "@/components/Navigation";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import { Storage } from "@/lib/storage";
import { WhatsAppService } from "@/lib/whatsapp";
import { formatCurrency, calculateDaysOverdue } from "@/lib/utils";
import type { Customer, Profile } from "@/types";

interface PendingCustomer extends Customer {
    daysOverdue: number;
    remaining: number;
}

export default function PendingPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [pendingCustomers, setPendingCustomers] = useState<PendingCustomer[]>([]);
    const [filter, setFilter] = useState<"all" | "overdue" | "warning">("all");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const profile = await Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }

        setCurrentProfile(profile);
        await loadPendingCustomers(profile.id);
    };

    const loadPendingCustomers = async (profileId: number) => {
        const allCustomers = await Storage.get<Customer[]>("customers", []);

        const pending = allCustomers
            .filter((c) => c.profileId === profileId && c.paidAmount < c.totalAmount)
            .map((c) => ({
                ...c,
                daysOverdue: calculateDaysOverdue(c.lastPayment),
                remaining: c.totalAmount - c.paidAmount,
            }))
            .sort((a, b) => b.daysOverdue - a.daysOverdue);

        setPendingCustomers(pending);
    };

    const filteredCustomers = pendingCustomers.filter((customer) => {
        if (filter === "overdue") return customer.daysOverdue > 7;
        if (filter === "warning") return customer.daysOverdue > 3 && customer.daysOverdue <= 7;
        return true;
    });

    const totalPending = pendingCustomers.reduce((sum, c) => sum + c.remaining, 0);
    const overdueCount = pendingCustomers.filter((c) => c.daysOverdue > 7).length;
    const warningCount = pendingCustomers.filter((c) => c.daysOverdue > 3 && c.daysOverdue <= 7).length;

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

    if (!currentProfile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Load ho raha hai...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-2xl font-bold">Baqi Payments</h1>
                        <p className="text-sm text-gray-600">
                            {pendingCustomers.length} customer{pendingCustomers.length !== 1 ? "s" : ""} ki baqi hai
                        </p>
                    </div>
                    <ProfileSwitcher
                        currentProfile={currentProfile}
                        onProfileChange={loadData}
                    />
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                        <p className="text-xs text-gray-600">Zyada Dair</p>
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
                        <p className="text-sm opacity-90">Total Baqi Amount</p>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(totalPending)}</p>
                    <p className="text-sm opacity-75 mt-2">
                        {pendingCustomers.length} customer{pendingCustomers.length !== 1 ? "s" : ""} se
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
                        Sab ({pendingCustomers.length})
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
                        Zyada Dair ({overdueCount})
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
                            <p className="text-gray-600 mb-2">Koi baqi payment nahi</p>
                            <p className="text-sm text-gray-400">
                                {filter === "all"
                                    ? "Sab customers up to date hain!"
                                    : `Koi ${filter} payment nahi mili`}
                            </p>
                        </div>
                    ) : (
                        filteredCustomers.map((customer) => (
                            <CustomerCard
                                key={customer.id}
                                customer={customer}
                                onClick={(c) => router.push(`/customers/${c.id}`)}
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
                            <strong>💡 Madad:</strong> WhatsApp reminders bhejein un customers ko jo late hain.
                            Regular messages se payment discipline achhi rehti hai.
                        </p>
                    </div>
                )}
            </div>

            <Navigation currentPage="pending" />
        </div>
    );
}