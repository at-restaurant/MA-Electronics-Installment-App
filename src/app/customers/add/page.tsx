// src/app/customers/add/page.tsx - FIXED TYPE ERROR + COMPACT HOOKS

"use client";

import { Camera, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import GlobalHeader from "@/components/GlobalHeader";
import { OptimizedStorage } from "@/lib/storage-optimized";
import { Storage } from "@/lib/storage";
import { WhatsAppService } from "@/lib/whatsapp";
import { useForm, useProfile, Rules } from "@/hooks/useCompact";
import type { Customer } from "@/types";

export default function AddCustomerPage() {
    const router = useRouter();
    const { profile } = useProfile();
    const [categories, setCategories] = useState(['Electronics', 'Furniture', 'Mobile', 'Other']);

    const { data: form, set, errors, validate } = useForm({
        name: "",
        phone: "",
        address: "",
        cnic: "",
        totalAmount: "",
        installmentAmount: "",
        frequency: "daily",
        startDate: new Date().toISOString().split("T")[0],
        photo: null as string | null,
        category: 'Electronics',
        notes: "",
    });

    const [plan, setPlan] = useState({ installments: 0, endDate: "", months: 0 });

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        calculatePlan();
    }, [form.totalAmount, form.installmentAmount, form.frequency]);

    const loadCategories = async () => {
        const settings = await Storage.get<any>('app_settings', { categories });
        setCategories(settings.categories || categories);
    };

    const calculatePlan = () => {
        const total = parseFloat(form.totalAmount);
        const inst = parseFloat(form.installmentAmount);

        if (total > 0 && inst > 0) {
            const count = Math.ceil(total / inst);
            const start = new Date(form.startDate);
            const end = new Date(start);

            // ✅ FIX: Type assertion for frequency
            const freq = form.frequency as 'daily' | 'weekly' | 'monthly';

            switch (freq) {
                case 'daily':
                    end.setDate(end.getDate() + count);
                    break;
                case 'weekly':
                    end.setDate(end.getDate() + count * 7);
                    break;
                case 'monthly':
                    end.setMonth(end.getMonth() + count);
                    break;
            }

            setPlan({
                installments: count,
                endDate: end.toISOString().split('T')[0],
                months: Math.ceil(count / (freq === 'daily' ? 30 : freq === 'weekly' ? 4 : 1))
            });
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File too large (max 5MB)");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            set('photo', reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        // ✅ Validation with compact Rules
        const isValid = validate({
            name: Rules.required(),
            phone: Rules.required(),
            totalAmount: Rules.min(0),
            installmentAmount: Rules.min(0),
            photo: Rules.required('Photo required'),
        });

        if (!isValid || !profile) return;

        const customer: Customer = {
            id: Date.now(),
            profileId: profile.id,
            name: form.name,
            phone: form.phone,
            address: form.address,
            cnic: form.cnic,
            photo: form.photo,
            document: null,
            totalAmount: parseFloat(form.totalAmount),
            installmentAmount: parseFloat(form.installmentAmount),
            frequency: form.frequency as 'daily' | 'weekly' | 'monthly',
            startDate: form.startDate,
            endDate: plan.endDate,
            notes: form.notes,
            paidAmount: 0,
            lastPayment: form.startDate,
            status: "active",
            createdAt: new Date().toISOString(),
            category: form.category,
            autoMessaging: true,
            autoSchedule: true,
        };

        // ✅ Use OptimizedStorage for auto-compression
        await OptimizedStorage.saveCustomer(customer);

        if (confirm("Send welcome message via WhatsApp?")) {
            WhatsAppService.sendWelcomeMessage(customer);
        }

        router.push("/customers");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <GlobalHeader title="Add Customer" />

            <div className="pt-16 p-4 pb-8 max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Photo Section */}
                    <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-6">
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                                    {form.photo ? (
                                        <img src={form.photo} alt="Customer" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="w-12 h-12 text-white" />
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 bg-white text-blue-600 p-3 rounded-full cursor-pointer hover:bg-blue-50 shadow-lg transition-colors">
                                    <Camera className="w-5 h-5" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            </div>
                            <p className="text-white mt-3 text-sm font-medium">Customer Photo *</p>
                            {errors.photo && <p className="text-red-200 text-xs mt-1">{errors.photo}</p>}
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-6 space-y-4">
                        {/* Name & Phone */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Name *</label>
                                <input
                                    value={form.name}
                                    onChange={e => set('name', e.target.value)}
                                    placeholder="Ahmed Khan"
                                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Phone *</label>
                                <input
                                    value={form.phone}
                                    onChange={e => set('phone', e.target.value)}
                                    placeholder="+92 300 1234567"
                                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all ${errors.phone ? 'border-red-500' : 'border-gray-200'}`}
                                />
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                            </div>
                        </div>

                        {/* Category & CNIC */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Category</label>
                                <select
                                    value={form.category}
                                    onChange={e => set('category', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    {categories.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">CNIC</label>
                                <input
                                    value={form.cnic}
                                    onChange={e => set('cnic', e.target.value)}
                                    placeholder="12345-1234567-1"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Address</label>
                            <input
                                value={form.address}
                                onChange={e => set('address', e.target.value)}
                                placeholder="House #, Street, Area"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Payment Details */}
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs">💰</span>
                                Payment Details
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Total Amount (₨) *</label>
                                    <input
                                        type="number"
                                        value={form.totalAmount}
                                        onChange={e => set('totalAmount', e.target.value)}
                                        placeholder="50000"
                                        className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all ${errors.totalAmount ? 'border-red-500' : 'border-gray-200'}`}
                                    />
                                    {errors.totalAmount && <p className="text-red-500 text-xs mt-1">{errors.totalAmount}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Installment (₨) *</label>
                                    <input
                                        type="number"
                                        value={form.installmentAmount}
                                        onChange={e => set('installmentAmount', e.target.value)}
                                        placeholder="2000"
                                        className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all ${errors.installmentAmount ? 'border-red-500' : 'border-gray-200'}`}
                                    />
                                    {errors.installmentAmount && <p className="text-red-500 text-xs mt-1">{errors.installmentAmount}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Frequency</label>
                                    <select
                                        value={form.frequency}
                                        onChange={e => set('frequency', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Start Date</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={e => set('startDate', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Plan Preview */}
                            {plan.installments > 0 && (
                                <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                                    <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                        <span>📊</span> Payment Plan Preview
                                    </p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="text-center p-2 bg-white rounded-lg">
                                            <p className="text-xs text-blue-700 mb-1">Installments</p>
                                            <p className="font-bold text-blue-900">{plan.installments}</p>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded-lg">
                                            <p className="text-xs text-blue-700 mb-1">Duration</p>
                                            <p className="font-bold text-blue-900">{plan.months} months</p>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded-lg">
                                            <p className="text-xs text-blue-700 mb-1">End Date</p>
                                            <p className="font-bold text-blue-900 text-xs">{new Date(plan.endDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Notes (Optional)</label>
                            <textarea
                                value={form.notes}
                                onChange={e => set('notes', e.target.value)}
                                rows={3}
                                placeholder="Any additional information..."
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => router.back()}
                                className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                            >
                                <Save className="w-5 h-5" />
                                Save Customer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}