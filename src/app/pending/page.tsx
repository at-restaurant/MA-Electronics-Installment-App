// src/app/pending/page.tsx - Updated with FilterBar

"use client";

import { AlertCircle, ChevronRight, Clock, MessageSquare, Phone } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import WhatsAppButton from "@/components/WhatsAppButton";
import FilterBar from "@/components/FilterBar";
import { Storage } from "@/lib/storage";
import { calculateDaysOverdue, formatCurrency, formatDate } from "@/lib/utils";
import type { Customer, Profile } from "@/types";

interface PendingCustomer extends Customer {
    daysOverdue: number;
    remaining: number;
}

export default function PendingPage() {
    const router = useRouter();
    const [pendingCustomers, setPendingCustomers] = useState<PendingCustomer[]>([]);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<"all" | "overdue" | "warning">("all");
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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

        // Load categories
        const appSettings = Storage.get<any>('app_settings', {
            categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances']
        });
        setCategories(appSettings.categories || []);
    }, [router]);

    const handleCategoryToggle = (categoryId: string, optionId: string) => {
        const key = `${categoryId}:${optionId}`;
        setSelectedCategories(prev =>
            prev.includes(key)
                ? prev.filter(c => c !== key)
                : [...prev, key]
        );
    };

    // Filter customers
    const filteredCustomers = pendingCustomers.filter((customer) => {
        const matchesSearch =
            customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.phone.includes(searchQuery);

        const matchesFilter =
            filter === "all" ||
            (filter === "overdue" && customer.daysOverdue > 7) ||
            (filter === "warning" && customer.daysOverdue > 3 && customer.daysOverdue <= 7);

        const matchesCategory = selectedCategories.length === 0 ||
            selectedCategories.some(cat => {
                const [, option] = cat.split(':');
                return customer.category === option;
            });

        return matchesSearch && matchesFilter && matchesCategory;
    });

    const totalPending = pendingCustomers.reduce((sum, c) => sum + c.remaining, 0);
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
                return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
            case "medium":
                return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800";
            default:
                return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-4 transition-colors duration-200">
                <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">Pending Payments</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {pendingCustomers.length} customer{pendingCustomers.length !== 1 ? "s" : ""} with pending payments
                </p>

                {/* FilterBar */}
                <FilterBar
                    searchPlaceholder="Search pending customers..."
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    filters={[
                        { id: "all", label: "All", count: pendingCustomers.length },
                        { id: "overdue", label: "Overdue", count: overdueCount, color: "bg-red-600 text-white" },
                        { id: "warning", label: "Warning", count: warningCount, color: "bg-orange-600 text-white" }
                    ]}
                    activeFilter={filter}
                    onFilterChange={(f) => setFilter(f as "all" | "overdue" | "warning")}
                    categories={[
                        {
                            id: 'category',
                            label: 'Category',
                            options: categories
                        }
                    ]}
                    activeCategories={selectedCategories}
                    onCategoryChange={handleCategoryToggle}
                    showCategories={true}
                />
            </div>

            <div className="p-4 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm transition-colors duration-200">
                        <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Overdue</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm transition-colors duration-200">
                        <Clock className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-600">{warningCount}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Warning</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm transition-colors duration-200">
                        <MessageSquare className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{pendingCustomers.length}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
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
                        From {pendingCustomers.length} customer{pendingCustomers.length !== 1 ? "s" : ""}
                    </p>
                </div>

                {/* Customer List */}
                <div className="space-y-3">
                    {filteredCustomers.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center transition-colors duration-200">
                            <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                                {searchQuery || selectedCategories.length > 0
                                    ? "No customers found"
                                    : "No pending payments"}
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                {searchQuery || selectedCategories.length > 0
                                    ? "Try adjusting your filters"
                                    : filter === "all"
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
                                    className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border-2 transition-all duration-200 ${
                                        isOverdue
                                            ? "border-red-200 dark:border-red-800"
                                            : "border-transparent"
                                    }`}
                                >
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
                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
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

                                            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                <Phone className="w-3 h-3" />
                                                <span>{customer.phone}</span>
                                            </div>
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                                            <p className="font-bold text-orange-600">
                                                {formatCurrency(customer.remaining)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Last Payment</p>
                                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                                                {formatDate(customer.lastPayment)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Days Ago</p>
                                            <p
                                                className={`font-bold ${isOverdue ? "text-red-600" : "text-gray-900 dark:text-white"}`}
                                            >
                                                {customer.daysOverdue}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/customers/${customer.id}`)}
                                            className="py-2 px-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-medium text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
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
                    <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800 transition-colors duration-200">
                        <p className="text-sm text-amber-800 dark:text-amber-300">
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