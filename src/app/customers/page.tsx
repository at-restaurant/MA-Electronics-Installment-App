// src/app/customers/page.tsx - Updated with FilterBar component

"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CustomerCard from "@/components/CustomerCard";
import Navigation from "@/components/Navigation";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import FilterBar from "@/components/FilterBar";
import { Storage } from "@/lib/storage";
import type { Customer, Profile } from "@/types";

export default function CustomersPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);

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

        // Load categories
        const appSettings = Storage.get('app_settings', {
            categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances', 'Other']
        });
        setCategories(appSettings.categories || []);
    };

    const handleCategoryToggle = (categoryId: string, optionId: string) => {
        const key = `${categoryId}:${optionId}`;
        setSelectedCategories(prev =>
            prev.includes(key)
                ? prev.filter(c => c !== key)
                : [...prev, key]
        );
    };

    const filteredCustomers = customers.filter((c) => {
        // Search filter
        const matchesSearch =
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone.includes(searchQuery);

        // Status filter
        const matchesStatus =
            filterType === "all" ||
            (filterType === "active" && c.paidAmount < c.totalAmount) ||
            (filterType === "completed" && c.paidAmount >= c.totalAmount);

        // Category filter
        const matchesCategory = selectedCategories.length === 0 ||
            selectedCategories.some(cat => {
                const [, option] = cat.split(':');
                return c.category === option;
            });

        return matchesSearch && matchesStatus && matchesCategory;
    });

    const activeCount = customers.filter(c => c.paidAmount < c.totalAmount).length;
    const completedCount = customers.filter(c => c.paidAmount >= c.totalAmount).length;

    if (!currentProfile) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-4 sticky top-0 z-10 shadow-sm transition-colors">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {customers.length} total • {activeCount} active • {completedCount} completed
                        </p>
                    </div>
                    <ProfileSwitcher
                        currentProfile={currentProfile}
                        onProfileChange={loadData}
                    />
                </div>

                {/* Filter Bar */}
                <FilterBar
                    searchPlaceholder="Search customers..."
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    filters={[
                        { id: "all", label: "All", count: customers.length },
                        { id: "active", label: "Active", count: activeCount },
                        { id: "completed", label: "Completed", count: completedCount }
                    ]}
                    activeFilter={filterType}
                    onFilterChange={setFilterType}
                    categories={[
                        {
                            id: 'category',
                            label: 'Product Category',
                            options: categories
                        }
                    ]}
                    activeCategories={selectedCategories}
                    onCategoryChange={handleCategoryToggle}
                    showCategories={true}
                />
            </div>

            {/* Customer List */}
            <div className="p-4 space-y-4">
                {filteredCustomers.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mb-2">
                            {searchQuery || selectedCategories.length > 0
                                ? "No customers found"
                                : "No customers yet"}
                        </p>
                        {!searchQuery && selectedCategories.length === 0 && (
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
                    <>
                        {/* Results Count */}
                        {(searchQuery || selectedCategories.length > 0) && (
                            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    Found {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
                                    {searchQuery && ` matching "${searchQuery}"`}
                                    {selectedCategories.length > 0 && ` in selected categories`}
                                </p>
                            </div>
                        )}

                        {/* Customer Cards */}
                        {filteredCustomers.map((customer) => (
                            <CustomerCard
                                key={customer.id}
                                customer={customer}
                                onClick={(c) => router.push(`/customers/${c.id}`)}
                            />
                        ))}
                    </>
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