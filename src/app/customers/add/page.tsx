// src/app/customers/add/page.tsx - AUTO PAYMENT PLANS

"use client";

import { Camera, Save, UserPlus, Trash2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import GlobalHeader from "@/components/GlobalHeader";
import { OptimizedStorage } from "@/lib/storage-optimized";
import { Storage } from "@/lib/storage";
import { WhatsAppService } from "@/lib/whatsapp";
import { useProfile } from "@/hooks/useCompact";
import type { Customer, Guarantor } from "@/types";

export default function AddCustomerPage() {
    const router = useRouter();
    const { profile } = useProfile();
    const [categories, setCategories] = useState(['Electronics', 'Furniture', 'Mobile', 'Other']);

    const [form, setForm] = useState({
        name: "", phone: "", address: "", cnic: "",
        totalAmount: "", installmentAmount: "",
        frequency: "daily",
        startDate: new Date().toISOString().split("T")[0],
        photo: null as string | null, cnicPhoto: null as string | null,
        category: 'Electronics', notes: "", autoMessaging: true,
        customPlan: false, // ✅ NEW: Custom plan toggle
        months: "", weeks: "", days: "", // ✅ NEW: Custom duration
    });

    const [guarantors, setGuarantors] = useState<Guarantor[]>([]);
    const [showGuarantorForm, setShowGuarantorForm] = useState(false);
    const [guarantorForm, setGuarantorForm] = useState({
        name: "", phone: "", cnic: "", photo: null as string | null, relation: ""
    });

    // ✅ AUTO-GENERATED PLANS
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        generatePlans();
    }, [form.totalAmount, form.frequency]);

    const loadCategories = async () => {
        const settings = await Storage.get<any>('app_settings', { categories });
        setCategories(settings.categories || categories);
    };

    // ✅ GENERATE SMART PAYMENT PLANS
    const generatePlans = () => {
        const total = parseFloat(form.totalAmount);
        if (!total || total <= 0) {
            setPlans([]);
            return;
        }

        const freq = form.frequency as 'daily' | 'weekly' | 'monthly';
        const suggestions = [];

        if (freq === 'daily') {
            // Daily: 30, 60, 90 days plans
            suggestions.push(
                { label: "1 Month", days: 30, installment: Math.ceil(total / 30) },
                { label: "2 Months", days: 60, installment: Math.ceil(total / 60) },
                { label: "3 Months", days: 90, installment: Math.ceil(total / 90) },
            );
        } else if (freq === 'weekly') {
            // Weekly: 12, 24, 36 weeks
            suggestions.push(
                { label: "3 Months", weeks: 12, installment: Math.ceil(total / 12) },
                { label: "6 Months", weeks: 24, installment: Math.ceil(total / 24) },
                { label: "9 Months", weeks: 36, installment: Math.ceil(total / 36) },
            );
        } else {
            // Monthly: 6, 12, 18 months
            suggestions.push(
                { label: "6 Months", months: 6, installment: Math.ceil(total / 6) },
                { label: "12 Months", months: 12, installment: Math.ceil(total / 12) },
                { label: "18 Months", months: 18, installment: Math.ceil(total / 18) },
            );
        }

        setPlans(suggestions);
    };

    // ✅ SELECT PLAN
    const selectPlan = (index: number) => {
        const plan = plans[index];
        setSelectedPlan(index);
        setForm({ ...form, installmentAmount: plan.installment.toString() });
    };

    // ✅ CALCULATE END DATE
    const calculateEndDate = () => {
        const start = new Date(form.startDate);
        const inst = parseFloat(form.installmentAmount);
        const total = parseFloat(form.totalAmount);

        if (!inst || !total) return "";

        const count = Math.ceil(total / inst);
        const end = new Date(start);

        switch (form.frequency) {
            case 'daily': end.setDate(end.getDate() + count); break;
            case 'weekly': end.setDate(end.getDate() + count * 7); break;
            case 'monthly': end.setMonth(end.getMonth() + count); break;
        }

        return end.toISOString().split('T')[0];
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file || file.size > 5 * 1024 * 1024) {
            alert("File too large (max 5MB)");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (field === 'guarantorPhoto') {
                setGuarantorForm(prev => ({ ...prev, photo: reader.result as string }));
            } else {
                setForm(prev => ({ ...prev, [field]: reader.result }));
            }
        };
        reader.readAsDataURL(file);
    };

    const addGuarantor = () => {
        if (!guarantorForm.name || !guarantorForm.phone) {
            alert("Name and phone required");
            return;
        }

        setGuarantors([...guarantors, { id: Date.now(), ...guarantorForm }]);
        setGuarantorForm({ name: "", phone: "", cnic: "", photo: null, relation: "" });
        setShowGuarantorForm(false);
    };

    const removeGuarantor = (id: number) => {
        setGuarantors(guarantors.filter(g => g.id !== id));
    };

    const handleSubmit = async () => {
        if (!form.name || !form.phone || !form.totalAmount || !form.installmentAmount || !profile) {
            alert("Please fill required fields");
            return;
        }

        const customer: Customer = {
            id: Date.now(),
            profileId: profile.id,
            name: form.name,
            phone: form.phone,
            address: form.address,
            cnic: form.cnic,
            photo: form.photo,
            cnicPhoto: form.cnicPhoto,
            document: null,
            totalAmount: parseFloat(form.totalAmount),
            installmentAmount: parseFloat(form.installmentAmount),
            frequency: form.frequency as 'daily' | 'weekly' | 'monthly',
            startDate: form.startDate,
            endDate: calculateEndDate(),
            notes: form.notes,
            paidAmount: 0,
            lastPayment: form.startDate,
            status: "active",
            createdAt: new Date().toISOString(),
            category: form.category,
            autoMessaging: form.autoMessaging,
            guarantors: guarantors,
            autoSchedule: true,
        };

        await OptimizedStorage.saveCustomer(customer);

        if (form.autoMessaging) {
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
                                <label className="absolute bottom-0 right-0 bg-white text-blue-600 p-3 rounded-full cursor-pointer hover:bg-blue-50 shadow-lg">
                                    <Camera className="w-5 h-5" />
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'photo')} />
                                </label>
                            </div>
                            <p className="text-white mt-3 text-sm font-medium">Customer Photo (Optional)</p>
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
                                    onChange={e => setForm({...form, name: e.target.value})}
                                    placeholder="Ahmed Khan"
                                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Phone *</label>
                                <input
                                    value={form.phone}
                                    onChange={e => setForm({...form, phone: e.target.value})}
                                    placeholder="+92 300 1234567"
                                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Category & CNIC */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Category</label>
                                <select
                                    value={form.category}
                                    onChange={e => setForm({...form, category: e.target.value})}
                                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    {categories.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">CNIC</label>
                                <input
                                    value={form.cnic}
                                    onChange={e => setForm({...form, cnic: e.target.value})}
                                    placeholder="12345-1234567-1"
                                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* CNIC Photo */}
                        <div>
                            <label className="block text-sm font-medium mb-2">CNIC Photo</label>
                            <div className="flex gap-3">
                                {form.cnicPhoto && (
                                    <img src={form.cnicPhoto} alt="CNIC" className="w-32 h-20 object-cover rounded-lg border" />
                                )}
                                <label className="flex-1 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors flex items-center justify-center gap-2">
                                    <Camera className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm text-gray-600">Upload CNIC</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'cnicPhoto')} />
                                </label>
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Address</label>
                            <input
                                value={form.address}
                                onChange={e => setForm({...form, address: e.target.value})}
                                placeholder="House #, Street, Area"
                                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Payment Details */}
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs">💰</span>
                                Payment Details
                            </h3>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Total Amount (₨) *</label>
                                    <input
                                        type="number"
                                        value={form.totalAmount}
                                        onChange={e => setForm({...form, totalAmount: e.target.value})}
                                        placeholder="50000"
                                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Frequency</label>
                                    <select
                                        value={form.frequency}
                                        onChange={e => setForm({...form, frequency: e.target.value})}
                                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                            </div>

                            {/* ✅ AUTO-GENERATED PLANS */}
                            {plans.length > 0 && (
                                <div className="mb-3">
                                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-yellow-600" />
                                        Quick Plans
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {plans.map((plan, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => selectPlan(i)}
                                                className={`p-3 rounded-lg border-2 transition-all ${
                                                    selectedPlan === i
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <p className="text-xs font-semibold text-gray-700">{plan.label}</p>
                                                <p className="text-sm font-bold text-blue-600 mt-1">
                                                    ₨{plan.installment.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {form.frequency === 'daily' && `${plan.days} days`}
                                                    {form.frequency === 'weekly' && `${plan.weeks} weeks`}
                                                    {form.frequency === 'monthly' && `${plan.months} months`}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Installment (₨) *</label>
                                    <input
                                        type="number"
                                        value={form.installmentAmount}
                                        onChange={e => setForm({...form, installmentAmount: e.target.value})}
                                        placeholder="2000"
                                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Start Date</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={e => setForm({...form, startDate: e.target.value})}
                                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Plan Preview */}
                            {form.totalAmount && form.installmentAmount && (
                                <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                                    <p className="text-sm font-semibold text-blue-900 mb-2">📊 Plan Summary</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="text-center p-2 bg-white rounded-lg">
                                            <p className="text-xs text-blue-700 mb-1">Installments</p>
                                            <p className="font-bold text-blue-900">
                                                {Math.ceil(parseFloat(form.totalAmount) / parseFloat(form.installmentAmount))}
                                            </p>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded-lg">
                                            <p className="text-xs text-blue-700 mb-1">Duration</p>
                                            <p className="font-bold text-blue-900 text-xs">
                                                {form.frequency === 'daily' && `${Math.ceil(parseFloat(form.totalAmount) / parseFloat(form.installmentAmount))} days`}
                                                {form.frequency === 'weekly' && `${Math.ceil(Math.ceil(parseFloat(form.totalAmount) / parseFloat(form.installmentAmount)) / 4)} months`}
                                                {form.frequency === 'monthly' && `${Math.ceil(parseFloat(form.totalAmount) / parseFloat(form.installmentAmount))} months`}
                                            </p>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded-lg">
                                            <p className="text-xs text-blue-700 mb-1">End Date</p>
                                            <p className="font-bold text-blue-900 text-xs">
                                                {new Date(calculateEndDate()).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Auto-Message Toggle */}
                        <div className="border-t pt-4">
                            <label className="flex items-center justify-between p-4 bg-green-50 rounded-xl cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                    <div>
                                        <p className="font-medium">Auto WhatsApp Messages</p>
                                        <p className="text-xs text-gray-600">Automatic reminders</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={form.autoMessaging}
                                    onChange={e => setForm({...form, autoMessaging: e.target.checked})}
                                    className="w-6 h-6 text-green-600 rounded"
                                />
                            </label>
                        </div>

                        {/* Guarantor Section */}
                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-purple-600" />
                                    Guarantors ({guarantors.length})
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowGuarantorForm(!showGuarantorForm)}
                                    className="text-sm text-purple-600 font-medium"
                                >
                                    {showGuarantorForm ? 'Cancel' : 'Add'}
                                </button>
                            </div>

                            {guarantors.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {guarantors.map(g => (
                                        <div key={g.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            {g.photo && <img src={g.photo} alt={g.name} className="w-10 h-10 rounded-full object-cover" />}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{g.name}</p>
                                                <p className="text-xs text-gray-500">{g.phone}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeGuarantor(g.id)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showGuarantorForm && (
                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            placeholder="Name *"
                                            value={guarantorForm.name}
                                            onChange={e => setGuarantorForm({...guarantorForm, name: e.target.value})}
                                            className="px-3 py-2 border rounded-lg"
                                        />
                                        <input
                                            placeholder="Phone *"
                                            value={guarantorForm.phone}
                                            onChange={e => setGuarantorForm({...guarantorForm, phone: e.target.value})}
                                            className="px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            placeholder="CNIC"
                                            value={guarantorForm.cnic}
                                            onChange={e => setGuarantorForm({...guarantorForm, cnic: e.target.value})}
                                            className="px-3 py-2 border rounded-lg"
                                        />
                                        <input
                                            placeholder="Relation"
                                            value={guarantorForm.relation}
                                            onChange={e => setGuarantorForm({...guarantorForm, relation: e.target.value})}
                                            className="px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg hover:border-purple-500 cursor-pointer">
                                        <Camera className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            {guarantorForm.photo ? 'Photo added ✓' : 'Add Photo'}
                                        </span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'guarantorPhoto')} />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addGuarantor}
                                        className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium"
                                    >
                                        Add Guarantor
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={e => setForm({...form, notes: e.target.value})}
                                rows={3}
                                placeholder="Additional information..."
                                className="w-full px-3 py-2.5 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg"
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