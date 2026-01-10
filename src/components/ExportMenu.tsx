// src/components/ExportMenu.tsx
"use client";

import { useState } from 'react';
import { Download, FileText, Calendar, TrendingUp, X } from 'lucide-react';
import { PDFService } from '@/lib/pdf';
import { Storage } from '@/lib/storage';
import type { Customer, Payment, Profile } from '@/types';

interface ExportMenuProps {
    onClose: () => void;
    customer?: Customer;
}

export default function ExportMenu({ onClose, customer }: ExportMenuProps) {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    const handleExportStatement = () => {
        if (!customer) return;

        const currentProfile = Storage.get<Profile | null>('currentProfile', null);
        if (!currentProfile) return;

        const allPayments = Storage.get<Payment[]>('payments', []);
        const customerPayments = allPayments.filter(p => p.customerId === customer.id);

        PDFService.generateStatement(customer, customerPayments, currentProfile.name);
        onClose();
    };

    const handleExportMonthly = () => {
        const currentProfile = Storage.get<Profile | null>('currentProfile', null);
        if (!currentProfile) return;

        const allCustomers = Storage.get<Customer[]>('customers', []);
        const customers = allCustomers.filter(c => c.profileId === currentProfile.id);

        const allPayments = Storage.get<Payment[]>('payments', []);
        const monthPayments = allPayments.filter(p => {
            return p.date.startsWith(selectedMonth);
        });

        const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        PDFService.generateMonthlyReport(customers, monthPayments, monthName, currentProfile.name);
        onClose();
    };

    const handleExportYearly = () => {
        const currentProfile = Storage.get<Profile | null>('currentProfile', null);
        if (!currentProfile) return;

        const allCustomers = Storage.get<Customer[]>('customers', []);
        const customers = allCustomers.filter(c => c.profileId === currentProfile.id);

        const allPayments = Storage.get<Payment[]>('payments', []);
        const yearPayments = allPayments.filter(p => {
            return p.date.startsWith(selectedYear);
        });

        PDFService.generateYearlyReport(customers, yearPayments, selectedYear, currentProfile.name);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Download className="w-6 h-6 text-blue-600" />
                        Export Reports
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-3">
                    {/* Customer Statement */}
                    {customer && (
                        <button
                            onClick={handleExportStatement}
                            className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-3 text-left"
                        >
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Customer Statement</p>
                                <p className="text-sm text-gray-600">Complete payment history for {customer.name}</p>
                            </div>
                        </button>
                    )}

                    {/* Monthly Report */}
                    <div className="bg-green-50 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Monthly Report</p>
                                <p className="text-sm text-gray-600">Select month to export</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <button
                                onClick={handleExportMonthly}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                            >
                                Export
                            </button>
                        </div>
                    </div>

                    {/* Yearly Report */}
                    <div className="bg-purple-50 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Yearly Report</p>
                                <p className="text-sm text-gray-600">Select year to export</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleExportYearly}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                            >
                                Export
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 text-center">
                        📄 Reports will be downloaded as PDF files
                    </p>
                </div>
            </div>
        </div>
    );
}