"use client";

import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CustomerCard from "@/components/CustomerCard";
import Navigation from "@/components/Navigation";
import { Storage } from "@/lib/storage";
import type { Customer, Profile } from "@/types";

export default function CustomersPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");

    useEffect(() => {
        const profile = Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }

        const allCustomers = Storage.get<Customer[]>("customers", []);
        setCustomers(allCustomers.filter((c) => c.profileId === profile.id));
    }, [router]);

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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Customers</h1>
                    <button
                        type="button"
                        onClick={() => router.push("/customers/add")}
                        className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
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
                    {["all", "active", "completed"].map((filter) => (
                        <button
                            key={filter}
                            type="button"
                            onClick={() => setFilterType(filter)}
                            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                                filterType === filter
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                        >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Customer List */}
            <div className="p-4 space-y-4">
                {filteredCustomers.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No customers found</p>
                        <button
                            type="button"
                            onClick={() => router.push("/customers/add")}
                            className="mt-4 text-blue-600 font-medium"
                        >
                            Add your first customer
                        </button>
                    </div>
                ) : (
                    filteredCustomers.map((customer) => (
                        <CustomerCard
                            key={customer.id}
                            customer={customer}
                            onClick={(c) => router.push(`/customers/${c.id}`)}
                        />
                    ))
                )}
            </div>

            <Navigation currentPage="customers" />
        </div>
    );
}