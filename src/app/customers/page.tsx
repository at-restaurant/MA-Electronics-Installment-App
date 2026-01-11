// src/app/customers/page.tsx - WITH GLOBAL HEADER + COMPACT HOOKS

"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import CustomerCard from "@/components/CustomerCard";
import Navigation from "@/components/Navigation";
import GlobalHeader from "@/components/GlobalHeader";
import { useProfile, useCompactCustomers, useFilter } from "@/hooks/useCompact";
import FilterBar from "@/components/FilterBar";

export default function CustomersPage() {
    const router = useRouter();
    const { profile } = useProfile();
    const { customers, stats } = useCompactCustomers(profile?.id);

    const { query, setQuery, filter, setFilter, filtered } = useFilter(
        customers,
        ['name', 'phone']
    );

    // Filter options for FilterBar
    const filterOptions = [
        { id: 'all', label: 'All', count: stats.total },
        { id: 'active', label: 'Active', count: stats.active },
        { id: 'completed', label: 'Completed', count: stats.completed },
    ];

    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <GlobalHeader title="Customers" />

            <div className="pt-16 p-4 space-y-4">
                {/* Stats Summary */}
                <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl p-4 text-white shadow-lg">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-2xl font-bold">{stats.total}</p>
                            <p className="text-xs opacity-90">Total</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.active}</p>
                            <p className="text-xs opacity-90">Active</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.completed}</p>
                            <p className="text-xs opacity-90">Completed</p>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <FilterBar
                    searchPlaceholder="Search customers..."
                    searchValue={query}
                    onSearchChange={setQuery}
                    filters={filterOptions}
                    activeFilter={filter}
                    onFilterChange={setFilter}
                />

                {/* Customer List */}
                <div className="space-y-3">
                    {filtered.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Plus className="w-10 h-10 text-gray-400" />
                            </div>
                            <p className="text-gray-600 mb-2 font-medium">
                                {query ? "No customers found" : "No customers yet"}
                            </p>
                            {!query && (
                                <button
                                    onClick={() => router.push("/customers/add")}
                                    className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Add Your First Customer
                                </button>
                            )}
                        </div>
                    ) : (
                        filtered.map(customer => (
                            <CustomerCard
                                key={customer.id}
                                customer={customer}
                                onClick={() => router.push(`/customers/${customer.id}`)}
                                variant="default"
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Floating Add Button */}
            <button
                onClick={() => router.push("/customers/add")}
                className="fixed bottom-24 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all hover:scale-110 z-30"
                aria-label="Add customer"
            >
                <Plus className="w-6 h-6" />
            </button>

            <Navigation currentPage="customers" />
        </div>
    );
}