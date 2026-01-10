// src/app/customers/page.tsx
"use client";

import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CustomerCard from "@/components/CustomerCard";
import Navigation from "@/components/Navigation";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import { Storage } from "@/lib/storage";
import type { Customer, Profile } from "@/types";

export default function CustomersPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");

    useEffect(() => {
        loadData();
        Storage.healthCheck();
    }, []);

    const loadData = () => {
        const profile = Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }

        setCurrentProfile(profile);

        const allCustomers = Storage.get<Customer[]>("customers", []);
        setCustomers(allCustomers.filter((c) => c.profileId === profile.id));
    };

    const filteredCustomers = customers.filter((c) => {
        const matchesSearch =
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone.includes(searchQuery);
        const matchesFilter =
            filterType === "all" ||
            (filterType === "active" && c.paidAmount < c.totalAmount) ||
            (filterType === "completed" && c.paidAmount >= c.totalAmount);
        return matchesSearch && matchesFilter;
    });

    const activeCount = customers.filter(c => c.paidAmount < c.totalAmount).length;
    const completedCount = customers.filter(c => c.paidAmount >= c.totalAmount).length;

    if (!currentProfile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">Customers</h1>
                        <p className="text-sm text-gray-500">
                            {customers.length} total • {activeCount} active • {completedCount} completed
                        </p>
                    </div>
                    <ProfileSwitcher
                        currentProfile={currentProfile}
                        onProfileChange={loadData}
                    />
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { id: "all", label: "All", count: customers.length },
                        { id: "active", label: "Active", count: activeCount },
                        { id: "completed", label: "Completed", count: completedCount }
                    ].map((filter) => (
                        <button
                            key={filter.id}
                            type="button"
                            onClick={() => setFilterType(filter.id)}
                            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                                filterType === filter.id
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            {filter.label} ({filter.count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Customer List */}
            <div className="p-4 space-y-4">
                {filteredCustomers.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 mb-2">
                            {searchQuery ? "No customers found" : "No customers yet"}
                        </p>
                        {!searchQuery && (
                            <button
                                type="button"
                                onClick={() => router.push("/customers/add")}
                                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                            >
                                Add Your First Customer
                            </button>
                        )}
                    </div>
                ) : (
                    filteredCustomers.map((customer) => (
                        <CustomerCard
                            key={customer.id}
                            customer={customer}
                            onClick={(c) => router.push(`/customers/${c.id}`)}
                            variant="default"
                        />
                    ))
                )}
            </div>

            {/* Floating Add Button */}
            <button
                type="button"
                onClick={() => router.push("/customers/add")}
                className="fixed bottom-24 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-30"
                aria-label="Add customer"
            >
                <Plus className="w-6 h-6" />
            </button>

            <Navigation currentPage="customers" />
        </div>
    );
}