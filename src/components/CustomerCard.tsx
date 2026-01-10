// src/components/CustomerCard.tsx
"use client";

import { Phone, Calendar, DollarSign, AlertCircle } from "lucide-react";
import Image from "next/image";
import {
    formatCurrency,
    calculateProgress,
    getStatusColor,
    getStatusLabel,
    calculateDaysOverdue,
    getRiskLevel,
    getRiskColor,
} from "@/lib/utils";
import type { Customer } from "@/types";

interface CustomerCardProps {
    customer: Customer;
    onClick: (customer: Customer) => void;
    variant?: "default" | "compact" | "detailed" | "daily";
    showActions?: boolean;
    onActionClick?: (customer: Customer, action: string) => void;
}

export default function CustomerCard({
                                         customer,
                                         onClick,
                                         variant = "default",
                                         showActions = false,
                                         onActionClick,
                                     }: CustomerCardProps) {
    const progress = calculateProgress(customer.paidAmount, customer.totalAmount);
    const remaining = customer.totalAmount - customer.paidAmount;
    const isCompleted = progress >= 100;
    const daysOverdue = calculateDaysOverdue(customer.lastPayment);
    const riskLevel = getRiskLevel(daysOverdue);

    // Compact variant for Daily Collection page
    if (variant === "compact") {
        return (
            <div
                onClick={() => onClick(customer)}
                className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                        {customer.photo ? (
                            <Image
                                src={customer.photo}
                                alt={customer.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            customer.name.charAt(0)
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
                        <p className="text-xs text-gray-500">{formatCurrency(customer.installmentAmount)}</p>
                    </div>
                    <span className="text-xs text-gray-400">{daysOverdue}d</span>
                </div>
            </div>
        );
    }

    // Daily collection variant with checkbox style
    if (variant === "daily") {
        return (
            <div
                onClick={() => onClick(customer)}
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all active:scale-[0.98] hover:shadow-md"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
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
                            <h3 className="font-semibold truncate">{customer.name}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Due: {formatCurrency(customer.installmentAmount)}
                </span>
                                <span>•</span>
                                <span>Left: {formatCurrency(remaining)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Detailed variant for Pending page
    if (variant === "detailed") {
        return (
            <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-blue-200 transition-all">
                <div
                    className="flex items-start gap-3 mb-3 cursor-pointer"
                    onClick={() => onClick(customer)}
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
                            <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getRiskColor(riskLevel)}`}>
                {riskLevel === "high" ? "⚠ Overdue" : riskLevel === "medium" ? "⚡ Warning" : "Active"}
              </span>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                            <Phone className="w-3 h-3" />
                            <span>{customer.phone}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-gray-100">
                    <div>
                        <p className="text-xs text-gray-500">Pending</p>
                        <p className="font-bold text-orange-600">{formatCurrency(remaining)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Last Payment</p>
                        <p className="font-medium text-sm">{daysOverdue}d ago</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Progress</p>
                        <p className="font-bold">{progress}%</p>
                    </div>
                </div>

                {showActions && onActionClick && (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onActionClick(customer, "view");
                            }}
                            className="py-2 px-4 bg-blue-50 text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors"
                        >
                            View Details
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onActionClick(customer, "whatsapp");
                            }}
                            className="py-2 px-4 bg-green-50 text-green-600 rounded-lg font-medium text-sm hover:bg-green-100 transition-colors"
                        >
                            Send Alert
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Default variant
    return (
        <div
            onClick={() => onClick(customer)}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
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
                    <div>
                        <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(isCompleted, daysOverdue)}`}>
          {getStatusLabel(isCompleted, daysOverdue)}
        </span>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className={`h-2.5 rounded-full transition-all ${
                            isCompleted
                                ? "bg-green-500"
                                : "bg-gradient-to-r from-blue-500 to-purple-500"
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between text-sm pt-2">
          <span className="text-gray-600">
            Paid:{" "}
              <span className="font-semibold text-green-600">
              {formatCurrency(customer.paidAmount)}
            </span>
          </span>
                    <span className="text-gray-600">
            Left:{" "}
                        <span className="font-semibold text-orange-600">
              {formatCurrency(remaining)}
            </span>
          </span>
                </div>
            </div>
        </div>
    );
}