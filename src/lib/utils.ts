// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
    })
        .format(amount)
        .replace("PKR", "₨");
}

export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export function calculateDaysOverdue(lastPaymentDate: string): number {
    const today = new Date();
    const lastPayment = new Date(lastPaymentDate);
    return Math.floor(
        (today.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24),
    );
}

export function formatPhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, "");
}

/**
 * Get solid color class from gradient string
 * Extracts the primary color from gradient classes
 */
export function getGradientColor(gradient: string): string {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-500",
        green: "bg-green-500",
        orange: "bg-orange-500",
        purple: "bg-purple-500",
        pink: "bg-pink-500",
        yellow: "bg-yellow-500",
        indigo: "bg-indigo-500",
        cyan: "bg-cyan-500",
        teal: "bg-teal-500",
        red: "bg-red-500",
        rose: "bg-rose-500",
    };

    for (const [key, value] of Object.entries(colorMap)) {
        if (gradient.includes(key)) return value;
    }
    return "bg-gray-500";
}

/**
 * Get risk level based on days overdue
 */
export function getRiskLevel(daysOverdue: number): "low" | "medium" | "high" {
    if (daysOverdue > 7) return "high";
    if (daysOverdue > 3) return "medium";
    return "low";
}

/**
 * Get color classes for risk level
 */
export function getRiskColor(level: "low" | "medium" | "high"): string {
    const colorMap = {
        high: "bg-red-100 text-red-700 border-red-200",
        medium: "bg-orange-100 text-orange-700 border-orange-200",
        low: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return colorMap[level];
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(paid: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((paid / total) * 100);
}

/**
 * Get status badge color
 */
export function getStatusColor(
    isCompleted: boolean,
    daysOverdue?: number
): string {
    if (isCompleted) return "bg-green-100 text-green-700";
    if (daysOverdue && daysOverdue > 7) return "bg-red-100 text-red-700";
    return "bg-blue-100 text-blue-700";
}

/**
 * Get status label
 */
export function getStatusLabel(
    isCompleted: boolean,
    daysOverdue?: number
): string {
    if (isCompleted) return "✓ Completed";
    if (daysOverdue && daysOverdue > 7) return "⚠ Overdue";
    return "Active";
}