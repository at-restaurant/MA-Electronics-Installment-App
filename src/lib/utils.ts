// src/lib/utils.ts - FIXED WITH FREQUENCY AWARENESS
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

/**
 * ✅ FIXED: Calculate days overdue based on frequency
 * Daily customer: Overdue after 1 day
 * Weekly customer: Overdue after 7 days
 * Monthly customer: Overdue after 30 days
 */
export function calculateDaysOverdue(
    lastPaymentDate: string,
    frequency?: 'daily' | 'weekly' | 'monthly'
): number {
    const today = new Date();
    const lastPayment = new Date(lastPaymentDate);
    const daysSincePayment = Math.floor(
        (today.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If no frequency provided, use old behavior for backward compatibility
    if (!frequency) {
        return daysSincePayment;
    }

    // Calculate grace period based on frequency
    const gracePeriod = {
        daily: 1,      // Daily: 1 day grace
        weekly: 7,     // Weekly: 7 days grace
        monthly: 30,   // Monthly: 30 days grace
    };

    const grace = gracePeriod[frequency];

    // Return overdue days only after grace period
    return Math.max(0, daysSincePayment - grace);
}

/**
 * ✅ NEW: Check if payment is actually due based on frequency
 */
export function isPaymentDue(
    lastPaymentDate: string,
    frequency: 'daily' | 'weekly' | 'monthly'
): boolean {
    const today = new Date();
    const lastPayment = new Date(lastPaymentDate);
    const daysSincePayment = Math.floor(
        (today.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24)
    );

    const duePeriod = {
        daily: 1,
        weekly: 7,
        monthly: 30,
    };

    return daysSincePayment >= duePeriod[frequency];
}

/**
 * ✅ NEW: Get next payment due date
 */
export function getNextDueDate(
    lastPaymentDate: string,
    frequency: 'daily' | 'weekly' | 'monthly'
): string {
    const lastPayment = new Date(lastPaymentDate);
    const nextDue = new Date(lastPayment);

    switch (frequency) {
        case 'daily':
            nextDue.setDate(nextDue.getDate() + 1);
            break;
        case 'weekly':
            nextDue.setDate(nextDue.getDate() + 7);
            break;
        case 'monthly':
            nextDue.setMonth(nextDue.getMonth() + 1);
            break;
    }

    return nextDue.toISOString().split('T')[0];
}

/**
 * ✅ NEW: Get human-readable time until next payment
 */
export function getTimeUntilDue(
    lastPaymentDate: string,
    frequency: 'daily' | 'weekly' | 'monthly'
): string {
    const nextDue = new Date(getNextDueDate(lastPaymentDate, frequency));
    const today = new Date();
    const daysUntil = Math.floor(
        (nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) {
        return `${Math.abs(daysUntil)} days overdue`;
    } else if (daysUntil === 0) {
        return 'Due today';
    } else if (daysUntil === 1) {
        return 'Due tomorrow';
    } else {
        return `Due in ${daysUntil} days`;
    }
}

export function formatPhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, "");
}

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
 * ✅ UPDATED: Get risk level based on frequency-aware overdue
 */
export function getRiskLevel(
    daysOverdue: number,
    frequency?: 'daily' | 'weekly' | 'monthly'
): "low" | "medium" | "high" {
    // If frequency-aware overdue is used, thresholds are already adjusted
    if (frequency) {
        if (daysOverdue > 7) return "high";     // 7+ days overdue after grace
        if (daysOverdue > 3) return "medium";   // 3-7 days overdue after grace
        return "low";                            // 0-3 days overdue
    }

    // Fallback for old behavior
    if (daysOverdue > 7) return "high";
    if (daysOverdue > 3) return "medium";
    return "low";
}

export function getRiskColor(level: "low" | "medium" | "high"): string {
    const colorMap = {
        high: "bg-red-100 text-red-700 border-red-200",
        medium: "bg-orange-100 text-orange-700 border-orange-200",
        low: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return colorMap[level];
}

export function calculateProgress(paid: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((paid / total) * 100);
}

export function getStatusColor(
    isCompleted: boolean,
    daysOverdue?: number
): string {
    if (isCompleted) return "bg-green-100 text-green-700";
    if (daysOverdue && daysOverdue > 7) return "bg-red-100 text-red-700";
    return "bg-blue-100 text-blue-700";
}

export function getStatusLabel(
    isCompleted: boolean,
    daysOverdue?: number
): string {
    if (isCompleted) return "✓ Completed";
    if (daysOverdue && daysOverdue > 7) return "⚠ Overdue";
    return "Active";
}