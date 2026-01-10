// src/app/daily/page.tsx - Updated with FilterBar

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle, Circle, DollarSign, Users } from "lucide-react";
import Navigation from "@/components/Navigation";
import FilterBar from "@/components/FilterBar";
import { Storage } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import type { Customer, Payment, Profile } from "@/types";

export default function DailyPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0],
    );
    const [todayPayments, setTodayPayments] = useState<Record<number, boolean>>({});
    const [processing, setProcessing] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    useEffect(() => {
        const profile = Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }

        setCurrentProfile(profile);
        loadCustomers(profile.id);
        loadTodayPayments(profile.id);

        // Load categories
        const appSettings = Storage.get<any>('app_settings', {
            categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances']
        });
        setCategories(appSettings.categories || []);
    }, [router, selectedDate]);

    const loadCustomers = (profileId: number) => {
        const allCustomers = Storage.get<Customer[]>("customers", []);
        const dailyCustomers = allCustomers.filter(
            (c) =>
                c.profileId === profileId &&
                c.frequency === "daily" &&
                c.paidAmount < c.totalAmount,
        );
        setCustomers(dailyCustomers);
    };

    const loadTodayPayments = (profileId: number) => {
        const allPayments = Storage.get<Payment[]>("payments", []);
        const todayPaymentsList = allPayments.filter(
            (p) => p.date === selectedDate,
        );

        const paymentMap: Record<number, boolean> = {};
        todayPaymentsList.forEach((p) => {
            paymentMap[p.customerId] = true;
        });

        setTodayPayments(paymentMap);
    };

    const togglePayment = async (customer: Customer) => {
        if (processing) return;

        setProcessing(true);

        try {
            const isAlreadyPaid = todayPayments[customer.id];

            if (isAlreadyPaid) {
                const allPayments = Storage.get<Payment[]>("payments", []);
                const filtered = allPayments.filter(
                    (p) => !(p.customerId === customer.id && p.date === selectedDate),
                );
                Storage.save("payments", filtered);

                const allCustomers = Storage.get<Customer[]>("customers", []);
                const customerIndex = allCustomers.findIndex(
                    (c) => c.id === customer.id,
                );
                if (customerIndex !== -1) {
                    allCustomers[customerIndex].paidAmount -= customer.installmentAmount;
                    Storage.save("customers", allCustomers);
                }

                setTodayPayments((prev) => {
                    const newState = { ...prev };
                    delete newState[customer.id];
                    return newState;
                });
            } else {
                const payment: Payment = {
                    id: Date.now(),
                    customerId: customer.id,
                    amount: customer.installmentAmount,
                    date: selectedDate,
                    createdAt: new Date().toISOString(),
                };

                const allPayments = Storage.get<Payment[]>("payments", []);
                allPayments.push(payment);
                Storage.save("payments", allPayments);

                const allCustomers = Storage.get<Customer[]>("customers", []);
                const customerIndex = allCustomers.findIndex(
                    (c) => c.id === customer.id,
                );
                if (customerIndex !== -1) {
                    allCustomers[customerIndex].paidAmount += customer.installmentAmount;
                    allCustomers[customerIndex].lastPayment = selectedDate;
                    Storage.save("customers", allCustomers);

                    if (currentProfile) {
                        loadCustomers(currentProfile.id);
                    }
                }

                setTodayPayments((prev) => ({ ...prev, [customer.id]: true }));
            }
        } catch (error) {
            console.error("Error toggling payment:", error);
            alert("Failed to update payment. Please try again.");
        } finally {
            setProcessing(false);
        }
    };

    const handleCategoryToggle = (categoryId: string, optionId: string) => {
        const key = `${categoryId}:${optionId}`;
        setSelectedCategories(prev =>
            prev.includes(key)
                ? prev.filter(c => c !== key)
                : [...prev, key]
        );
    };

    // Filter customers
    const filteredCustomers = customers.filter((c) => {
        const matchesSearch =
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone.includes(searchQuery);

        const matchesStatus =
            filterType === "all" ||
            (filterType === "paid" && todayPayments[c.id]) ||
            (filterType === "unpaid" && !todayPayments[c.id]);

        const matchesCategory = selectedCategories.length === 0 ||
            selectedCategories.some(cat => {
                const [, option] = cat.split(':');
                return c.category === option;
            });

        return matchesSearch && matchesStatus && matchesCategory;
    });

    const collectedToday = customers
        .filter((c) => todayPayments[c.id])
        .reduce((sum, c) => sum + c.installmentAmount, 0);

    const paidCount = Object.keys(todayPayments).length;
    const totalCount = customers.length;
    const unpaidCount = totalCount - paidCount;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-4 transition-colors duration-200">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Daily Collection</h1>

                {/* Date Selector */}
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-xl mb-3 transition-colors duration-200">
                    <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        className="flex-1 bg-transparent border-0 font-medium focus:outline-none text-gray-900 dark:text-white"
                    />
                </div>

                {/* FilterBar */}
                <FilterBar
                    searchPlaceholder="Search customers..."
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    filters={[
                        { id: "all", label: "All", count: totalCount },
                        { id: "paid", label: "Paid", count: paidCount },
                        { id: "unpaid", label: "Unpaid", count: unpaidCount }
                    ]}
                    activeFilter={filterType}
                    onFilterChange={setFilterType}
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
                {/* Stats Card */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm opacity-90 mb-1">Collected Today</p>
                            <p className="text-3xl font-bold">
                                {formatCurrency(collectedToday)}
                            </p>
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
                        <span className="font-bold">
                            {paidCount} / {totalCount}
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="w-full bg-white/20 rounded-full h-2">
                            <div
                                className="bg-white h-2 rounded-full transition-all duration-300"
                                style={{
                                    width: `${totalCount > 0 ? (paidCount / totalCount) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Customer List */}
                <div className="space-y-3">
                    {filteredCustomers.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center transition-colors duration-200">
                            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                                {searchQuery || selectedCategories.length > 0
                                    ? "No customers found"
                                    : "No daily customers found"}
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                {searchQuery || selectedCategories.length > 0
                                    ? "Try adjusting your filters"
                                    : "Add customers with daily payment frequency to see them here"}
                            </p>
                        </div>
                    ) : (
                        filteredCustomers.map((customer) => {
                            const isPaid = todayPayments[customer.id];
                            const remaining = customer.totalAmount - customer.paidAmount;

                            return (
                                <div
                                    key={customer.id}
                                    onClick={() => togglePayment(customer)}
                                    className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm cursor-pointer transition-all active:scale-[0.98] duration-200 ${
                                        isPaid
                                            ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20"
                                            : "hover:shadow-md"
                                    } ${processing ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div
                                                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                                                    isPaid
                                                        ? "bg-green-500 text-white shadow-lg"
                                                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                                                }`}
                                            >
                                                {isPaid ? (
                                                    <CheckCircle className="w-7 h-7" />
                                                ) : (
                                                    <Circle className="w-7 h-7" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                    {customer.name}
                                                </h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <DollarSign className="w-3 h-3" />
                                                        Due: {formatCurrency(customer.installmentAmount)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>Left: {formatCurrency(remaining)}</span>
                                                </div>
                                            </div>
                                        </div>

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
                {filteredCustomers.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800 transition-colors duration-200">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            💡 <strong>Tip:</strong> Tap on customer cards to mark payments.
                            You can undo by tapping again.
                        </p>
                    </div>
                )}
            </div>

            <Navigation currentPage="daily" />
        </div>
    );
}