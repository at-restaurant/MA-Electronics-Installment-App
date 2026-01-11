// src/app/daily/page.tsx - FIXED with async Storage

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle, Circle, DollarSign, Users } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Storage } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import type { Customer, Payment, Profile } from "@/types";

export default function DailyPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [todayPayments, setTodayPayments] = useState<Record<number, boolean>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        const profile = await Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }

        setCurrentProfile(profile);
        await loadCustomers(profile.id);
        await loadTodayPayments(profile.id);
    };

    const loadCustomers = async (profileId: number) => {
        const allCustomers = await Storage.get<Customer[]>("customers", []);
        const dailyCustomers = allCustomers.filter(
            (c) =>
                c.profileId === profileId &&
                c.frequency === "daily" &&
                c.paidAmount < c.totalAmount
        );
        setCustomers(dailyCustomers);
    };

    const loadTodayPayments = async (profileId: number) => {
        const allPayments = await Storage.get<Payment[]>("payments", []);
        const todayPaymentsList = allPayments.filter((p) => p.date === selectedDate);

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
                // Remove payment
                const allPayments = await Storage.get<Payment[]>("payments", []);
                const filtered = allPayments.filter(
                    (p) => !(p.customerId === customer.id && p.date === selectedDate)
                );
                await Storage.save("payments", filtered);

                // Update customer
                const allCustomers = await Storage.get<Customer[]>("customers", []);
                const customerIndex = allCustomers.findIndex((c) => c.id === customer.id);
                if (customerIndex !== -1) {
                    allCustomers[customerIndex].paidAmount -= customer.installmentAmount;
                    await Storage.save("customers", allCustomers);
                }

                setTodayPayments((prev) => {
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

                const allPayments = await Storage.get<Payment[]>("payments", []);
                allPayments.push(payment);
                await Storage.save("payments", allPayments);

                // Update customer
                const allCustomers = await Storage.get<Customer[]>("customers", []);
                const customerIndex = allCustomers.findIndex((c) => c.id === customer.id);
                if (customerIndex !== -1) {
                    allCustomers[customerIndex].paidAmount += customer.installmentAmount;
                    allCustomers[customerIndex].lastPayment = selectedDate;
                    await Storage.save("customers", allCustomers);

                    if (currentProfile) {
                        await loadCustomers(currentProfile.id);
                    }
                }

                setTodayPayments((prev) => ({ ...prev, [customer.id]: true }));
            }
        } catch (error) {
            console.error("Payment toggle error:", error);
            alert("Payment update nahi ho saki. Dobara try karein.");
        } finally {
            setProcessing(false);
        }
    };

    const collectedToday = customers
        .filter((c) => todayPayments[c.id])
        .reduce((sum, c) => sum + c.installmentAmount, 0);

    const paidCount = Object.keys(todayPayments).length;
    const totalCount = customers.length;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4">
                <h1 className="text-2xl font-bold mb-3">Rozana Collection</h1>

                {/* Date Selector */}
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl">
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

            <div className="p-4 space-y-4">
                {/* Stats Card */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm opacity-90 mb-1">Aaj Wusool Hua</p>
                            <p className="text-3xl font-bold">{formatCurrency(collectedToday)}</p>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                            <DollarSign className="w-8 h-8" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/20">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">Customers ne Diya</span>
                        </div>
                        <span className="font-bold">
                            {paidCount} / {totalCount}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                        <div className="w-full bg-white/20 rounded-full h-2">
                            <div
                                className="bg-white h-2 rounded-full transition-all"
                                style={{
                                    width: `${totalCount > 0 ? (paidCount / totalCount) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Customer List */}
                <div className="space-y-3">
                    {customers.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 mb-2">Koi rozana customer nahi mila</p>
                            <p className="text-sm text-gray-400">
                                Daily payment frequency wale customers yahan dikhenge
                            </p>
                        </div>
                    ) : (
                        customers.map((customer) => {
                            const isPaid = todayPayments[customer.id];
                            const remaining = customer.totalAmount - customer.paidAmount;

                            return (
                                <div
                                    key={customer.id}
                                    onClick={() => togglePayment(customer)}
                                    className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer transition-all active:scale-[0.98] ${
                                        isPaid
                                            ? "ring-2 ring-green-500 bg-green-50"
                                            : "hover:shadow-md"
                                    } ${processing ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            {/* Checkbox */}
                                            <div
                                                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                                    isPaid
                                                        ? "bg-green-500 text-white shadow-lg"
                                                        : "bg-gray-100 text-gray-400"
                                                }`}
                                            >
                                                {isPaid ? (
                                                    <CheckCircle className="w-7 h-7" />
                                                ) : (
                                                    <Circle className="w-7 h-7" />
                                                )}
                                            </div>

                                            {/* Customer Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">
                                                    {customer.name}
                                                </h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <DollarSign className="w-3 h-3" />
                                                        Dena: {formatCurrency(customer.installmentAmount)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>Baqi: {formatCurrency(remaining)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        {isPaid && (
                                            <div className="flex-shrink-0 ml-2">
                                                <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                                                    ✓ Mil Gaya
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
                {customers.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-sm text-blue-800">
                            💡 <strong>Madad:</strong> Customer cards pe tap karke payment mark karein.
                            Dobara tap karke undo kar sakte hain.
                        </p>
                    </div>
                )}
            </div>

            <Navigation currentPage="daily" />
        </div>
    );
}