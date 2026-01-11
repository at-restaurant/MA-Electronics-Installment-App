// src/components/WhatsAppButton.tsx - UPDATED TO USE UNIFIED SERVICE

"use client";

import { MessageSquare } from "lucide-react";
import { WhatsAppService } from "@/lib/whatsapp-unified";

interface Customer {
    name: string;
    phone: string;
    totalAmount: number;
    paidAmount: number;
    installmentAmount: number;
    startDate: string;
}

interface WhatsAppButtonProps {
    customer: Customer;
    type: "reminder" | "overdue" | "welcome" | "completion";
    daysOverdue?: number;
    className?: string;
}

export default function WhatsAppButton({
                                           customer,
                                           type,
                                           daysOverdue,
                                           className = "",
                                       }: WhatsAppButtonProps) {
    const handleClick = () => {
        switch (type) {
            case "reminder":
                WhatsAppService.sendReminder(customer);
                break;
            case "overdue":
                WhatsAppService.sendOverdue(customer, daysOverdue || 0);
                break;
            case "welcome":
                WhatsAppService.sendWelcome(customer);
                break;
            case "completion":
                WhatsAppService.sendCompletion(customer);
                break;
        }
    };

    const buttonText = {
        reminder: "Send Reminder",
        overdue: "Send Alert",
        welcome: "Send Welcome",
        completion: "Send Congrats",
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors ${className}`}
        >
            <MessageSquare className="w-4 h-4" />
            {buttonText[type]}
        </button>
    );
}