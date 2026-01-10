// src/components/FilterBar.tsx - Reusable filter with categories

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

export interface FilterOption {
    id: string;
    label: string;
    count: number;
    color?: string;
}

export interface CategoryFilter {
    id: string;
    label: string;
    options: string[];
}

interface FilterBarProps {
    searchPlaceholder?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    filters: FilterOption[];
    activeFilter: string;
    onFilterChange: (filterId: string) => void;
    categories?: CategoryFilter[];
    activeCategories?: string[];
    onCategoryChange?: (categoryId: string, optionId: string) => void;
    showCategories?: boolean;
}

export default function FilterBar({
                                      searchPlaceholder = 'Search...',
                                      searchValue,
                                      onSearchChange,
                                      filters,
                                      activeFilter,
                                      onFilterChange,
                                      categories = [],
                                      activeCategories = [],
                                      onCategoryChange,
                                      showCategories = false,
                                  }: FilterBarProps) {
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);

    return (
        <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                {searchValue && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {filters.map((filter) => (
                    <button
                        key={filter.id}
                        type="button"
                        onClick={() => onFilterChange(filter.id)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                            activeFilter === filter.id
                                ? filter.color || 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        {filter.label} ({filter.count})
                    </button>
                ))}

                {/* Category Toggle */}
                {showCategories && categories.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                            showCategoryMenu
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Categories
                    </button>
                )}
            </div>

            {/* Category Dropdown */}
            {showCategoryMenu && categories.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-lg">
                    {categories.map((category) => (
                        <div key={category.id}>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                {category.label}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {category.options.map((option) => {
                                    const isActive = activeCategories.includes(`${category.id}:${option}`);
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => onCategoryChange?.(category.id, option)}
                                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                                                isActive
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}