'use client';

import { Phone } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Customer {
    id: number;
    name: string;
    phone: string;
    photo?: string | null;
    totalAmount: number;
    paidAmount: number;
}

interface CustomerCardProps {
    customer: Customer;
    onClick: (customer: Customer) => void;
}

export default function CustomerCard({ customer, onClick }: CustomerCardProps) {
    const progress = (customer.paidAmount / customer.totalAmount) * 100;
    const remaining = customer.totalAmount - customer.paidAmount;
    const isCompleted = progress >= 100;

    return (
        <div
            onClick={() => onClick(customer)}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
                        {customer.photo ? (
                            <img src={customer.photo} alt={customer.name} className="w-full h-full object-cover" />
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
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isCompleted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                }`}>
          {isCompleted ? '✓ Complete' : 'Active'}
        </span>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className={`h-2.5 rounded-full transition-all ${
                            isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between text-sm pt-2">
          <span className="text-gray-600">
            Paid: <span className="font-semibold text-green-600">{formatCurrency(customer.paidAmount)}</span>
          </span>
                    <span className="text-gray-600">
            Left: <span className="font-semibold text-orange-600">{formatCurrency(remaining)}</span>
          </span>
                </div>
            </div>
        </div>
    );
}