// src/app/customers/add/page.tsx - ENHANCED VERSION

"use client";

import { ArrowLeft, Camera, Save, X, MessageSquare, Calendar, Upload, FileText, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Storage } from "@/lib/storage";
import { WhatsAppService } from "@/lib/whatsapp";
import { formatCurrency } from "@/lib/utils";
import GlobalHeader from "@/components/GlobalHeader";
import type { Customer, Profile } from "@/types";

interface AppSettings {
    categories: string[];
    defaultCategory?: string;
}

interface Reference {
    id: string;
    type: 'image' | 'document';
    name: string;
    data: string;
}

export default function AddCustomerPage() {
    const router = useRouter();
    const [appSettings, setAppSettings] = useState<AppSettings>({
        categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances', 'Other'],
        defaultCategory: 'Electronics',
    });

    useEffect(() => {
        const loadSettings = async () => {
            const settings = await Storage.get<AppSettings>('app_settings', {
                categories: ['Electronics', 'Furniture', 'Mobile', 'Appliances', 'Other'],
                defaultCategory: 'Electronics',
            });
            setAppSettings(settings);
        };
        loadSettings();
    }, []);

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        address: "",
        cnic: "",
        totalAmount: "",
        installmentAmount: "",
        frequency: "daily" as const,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        notes: "",
        photo: null as string | null,
        category: appSettings.defaultCategory || 'Electronics',
        autoMessaging: true,
        autoSchedule: true,
    });

    const [references, setReferences] = useState<Reference[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Auto-calculate installment plan
    const [autoCalculation, setAutoCalculation] = useState({
        totalInstallments: 0,
        endDate: "",
        monthsRequired: 0,
    });

    useEffect(() => {
        if (formData.totalAmount && formData.installmentAmount && formData.frequency) {
            const total = parseFloat(formData.totalAmount);
            const installment = parseFloat(formData.installmentAmount);

            if (total > 0 && installment > 0) {
                const totalInstallments = Math.ceil(total / installment);
                const startDate = new Date(formData.startDate);
                let endDate = new Date(startDate);

                switch (formData.frequency) {
                    case 'daily':
                        endDate.setDate(endDate.getDate() + totalInstallments);
                        break;
                    case 'weekly':
                        endDate.setDate(endDate.getDate() + (totalInstallments * 7));
                        break;
                    case 'monthly':
                        endDate.setMonth(endDate.getMonth() + totalInstallments);
                        break;
                }

                const monthsRequired = Math.ceil(totalInstallments / (formData.frequency === 'daily' ? 30 : formData.frequency === 'weekly' ? 4 : 1));

                setAutoCalculation({
                    totalInstallments,
                    endDate: endDate.toISOString().split('T')[0],
                    monthsRequired,
                });
            }
        }
    }, [formData.totalAmount, formData.installmentAmount, formData.frequency, formData.startDate]);

    const handleChange = (field: string, value: string | boolean | null) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File size should be less than 5MB");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange("photo", reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            if (file.size > 10 * 1024 * 1024) {
                alert(`${file.name} is too large (max 10MB)`);
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const newRef: Reference = {
                    id: Date.now().toString() + Math.random(),
                    type: file.type.startsWith('image/') ? 'image' : 'document',
                    name: file.name,
                    data: reader.result as string,
                };
                setReferences(prev => [...prev, newRef]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeReference = (id: string) => {
        setReferences(prev => prev.filter(ref => ref.id !== id));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
        if (formData.phone.trim() && !/^[0-9+\s-()]+$/.test(formData.phone)) {
            newErrors.phone = "Invalid phone number";
        }
        if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
            newErrors.totalAmount = "Valid amount required";
        }
        if (!formData.installmentAmount || parseFloat(formData.installmentAmount) <= 0) {
            newErrors.installmentAmount = "Valid installment required";
        }
        if (!formData.photo) {
            newErrors.photo = "Customer photo is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        const profile = await Storage.get<Profile | null>("currentProfile", null);
        if (!profile) {
            router.push("/");
            return;
        }

        const customer: Customer = {
            id: Date.now(),
            profileId: profile.id,
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            cnic: formData.cnic,
            photo: formData.photo,
            document: JSON.stringify(references), // Store references as JSON
            totalAmount: parseFloat(formData.totalAmount),
            installmentAmount: parseFloat(formData.installmentAmount),
            frequency: formData.frequency,
            startDate: formData.startDate,
            endDate: autoCalculation.endDate,
            notes: formData.notes,
            paidAmount: 0,
            lastPayment: formData.startDate,
            status: "active",
            createdAt: new Date().toISOString(),
            category: formData.category,
            autoMessaging: formData.autoMessaging,
            autoSchedule: formData.autoSchedule,
        };

        const allCustomers = await Storage.get<Customer[]>("customers", []);
        allCustomers.push(customer);
        await Storage.save("customers", allCustomers);

        if (formData.autoMessaging && confirm("Send welcome message on WhatsApp?")) {
            WhatsAppService.sendWelcomeMessage(customer);
        }

        router.push("/customers");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <GlobalHeader title="Add New Customer" showProfileSwitcher={false} />

            <div className="pt-16 p-4 pb-8">
                <button
                    onClick={() => router.back()}
                    className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>

                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6 max-w-2xl mx-auto">
                    {/* Customer Photo - REQUIRED */}
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-4xl overflow-hidden border-4 border-white shadow-lg">
                                {formData.photo ? (
                                    <Image
                                        src={formData.photo}
                                        alt="Customer"
                                        width={128}
                                        height={128}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Camera className="w-12 h-12" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-3 rounded-full cursor-pointer hover:bg-blue-700 shadow-lg">
                                <Camera className="w-5 h-5" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </label>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mt-3">
                            Customer Photo <span className="text-red-500">*</span>
                        </p>
                        {errors.photo && <p className="text-red-500 text-sm mt-1">{errors.photo}</p>}
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="e.g., Ahmed Khan"
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.name ? "border-red-500" : "border-gray-200"
                                }`}
                            />
                            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleChange("phone", e.target.value)}
                                placeholder="+92 300 1234567"
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.phone ? "border-red-500" : "border-gray-200"
                                }`}
                            />
                            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => handleChange("category", e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                            >
                                {appSettings.categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">CNIC Number</label>
                            <input
                                type="text"
                                value={formData.cnic}
                                onChange={(e) => handleChange("cnic", e.target.value)}
                                placeholder="12345-1234567-1"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => handleChange("address", e.target.value)}
                            placeholder="House #, Street, Area"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Payment Details */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Payment Details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Total Amount (₨) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.totalAmount}
                                    onChange={(e) => handleChange("totalAmount", e.target.value)}
                                    placeholder="50000"
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
                                        errors.totalAmount ? "border-red-500" : "border-gray-200"
                                    }`}
                                />
                                {errors.totalAmount && <p className="text-red-500 text-sm mt-1">{errors.totalAmount}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Installment Amount (₨) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.installmentAmount}
                                    onChange={(e) => handleChange("installmentAmount", e.target.value)}
                                    placeholder="2000"
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
                                        errors.installmentAmount ? "border-red-500" : "border-gray-200"
                                    }`}
                                />
                                {errors.installmentAmount && <p className="text-red-500 text-sm mt-1">{errors.installmentAmount}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Frequency</label>
                                <select
                                    value={formData.frequency}
                                    onChange={(e) => handleChange("frequency", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => handleChange("startDate", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Auto Calculation Display */}
                        {autoCalculation.totalInstallments > 0 && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                <h4 className="font-semibold text-blue-900 mb-2">📊 Installment Plan</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-blue-700">Total Installments:</p>
                                        <p className="font-bold text-blue-900">{autoCalculation.totalInstallments} payments</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-700">Completion Date:</p>
                                        <p className="font-bold text-blue-900">{new Date(autoCalculation.endDate).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-700">Duration:</p>
                                        <p className="font-bold text-blue-900">{autoCalculation.monthsRequired} month{autoCalculation.monthsRequired > 1 ? 's' : ''}</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-700">Last Payment:</p>
                                        <p className="font-bold text-blue-900">{formatCurrency(parseFloat(formData.totalAmount) % parseFloat(formData.installmentAmount) || parseFloat(formData.installmentAmount))}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reference Documents */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Reference Documents</h3>

                        <div className="space-y-4">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600">Upload Images/Documents</p>
                                <p className="text-xs text-gray-400">PNG, JPG, PDF, DOCX (Max 10MB each)</p>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx"
                                    className="hidden"
                                    onChange={handleReferenceUpload}
                                />
                            </label>

                            {references.length > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                    {references.map(ref => (
                                        <div key={ref.id} className="relative bg-gray-50 rounded-lg p-3 border border-gray-200">
                                            <div className="flex items-center gap-2">
                                                {ref.type === 'image' ? (
                                                    <ImageIcon className="w-5 h-5 text-blue-600" />
                                                ) : (
                                                    <FileText className="w-5 h-5 text-green-600" />
                                                )}
                                                <p className="text-sm font-medium truncate flex-1">{ref.name}</p>
                                                <button
                                                    onClick={() => removeReference(ref.id)}
                                                    className="p-1 hover:bg-red-100 rounded text-red-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Auto Messaging */}
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <label className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3">
                                <MessageSquare className="w-5 h-5 text-green-600" />
                                <div>
                                    <p className="font-medium text-gray-900">Auto-Messaging</p>
                                    <p className="text-sm text-gray-600">Send automatic WhatsApp reminders</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={formData.autoMessaging}
                                onChange={(e) => handleChange("autoMessaging", e.target.checked)}
                                className="w-5 h-5 text-green-600 rounded"
                            />
                        </label>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleChange("notes", e.target.value)}
                            placeholder="Any additional information..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            Save Customer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}