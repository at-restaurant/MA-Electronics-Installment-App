// src/app/customers/[id]/edit/page.tsx - EDIT PAGE

"use client";

import { Camera, Save, UserPlus, Trash2, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import GlobalHeader from "@/components/GlobalHeader";
import { db } from "@/lib/db";
import { OptimizedStorage } from "@/lib/storage-optimized";
import type { Customer, Guarantor } from "@/types";

export default function EditCustomerPage() {
    const router = useRouter();
    const params = useParams();
    const customerId = Number(params.id);

    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<any>({});
    const [guarantors, setGuarantors] = useState<Guarantor[]>([]);
    const [showGuarantorForm, setShowGuarantorForm] = useState(false);
    const [guarantorForm, setGuarantorForm] = useState({
        name: "", phone: "", cnic: "", photo: null as string | null, relation: ""
    });

    useEffect(() => {
        loadCustomer();
    }, [customerId]);

    const loadCustomer = async () => {
        const customer = await db.customers.get(customerId);
        if (!customer) {
            router.push('/customers');
            return;
        }

        setForm({
            name: customer.name,
            phone: customer.phone,
            address: customer.address || "",
            cnic: customer.cnic || "",
            photo: customer.photo,
            cnicPhoto: customer.cnicPhoto,
            category: customer.category || "Electronics",
            notes: customer.notes || "",
            autoMessaging: customer.autoMessaging || false,
        });

        setGuarantors(customer.guarantors || []);
        setLoading(false);
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
                setForm((prev: any) => ({ ...prev, [field]: reader.result }));
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
        if (!form.name || !form.phone) {
            alert("Name and phone are required");
            return;
        }

        const updates: Partial<Customer> = {
            name: form.name,
            phone: form.phone,
            address: form.address,
            cnic: form.cnic,
            photo: form.photo,
            cnicPhoto: form.cnicPhoto,
            category: form.category,
            notes: form.notes,
            autoMessaging: form.autoMessaging,
            guarantors: guarantors,
        };

        await OptimizedStorage.updateCustomer(customerId, updates);
        router.push(`/customers/${customerId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <GlobalHeader title="Edit Customer" />

            <div className="pt-16 p-4 pb-8 max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Photo */}
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
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Name *</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm({...form, name: e.target.value})}
                                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Phone *</label>
                                <input
                                    value={form.phone}
                                    onChange={e => setForm({...form, phone: e.target.value})}
                                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">Address</label>
                            <input
                                value={form.address}
                                onChange={e => setForm({...form, address: e.target.value})}
                                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">CNIC</label>
                            <input
                                value={form.cnic}
                                onChange={e => setForm({...form, cnic: e.target.value})}
                                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
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

                        {/* Auto-Message */}
                        <label className="flex items-center justify-between p-4 bg-green-50 rounded-xl cursor-pointer">
                            <div className="flex items-center gap-3">
                                <MessageSquare className="w-5 h-5 text-green-600" />
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

                        {/* Guarantors */}
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
                                    {showGuarantorForm ? <ChevronUp className="w-4 h-4" /> : 'Add'}
                                </button>
                            </div>

                            {guarantors.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {guarantors.map(g => (
                                        <div key={g.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            {g.photo && <img src={g.photo} alt={g.name} className="w-10 h-10 rounded-full object-cover" />}
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{g.name}</p>
                                                <p className="text-xs text-gray-500">{g.phone}</p>
                                            </div>
                                            <button type="button" onClick={() => removeGuarantor(g.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showGuarantorForm && (
                                <div className="p-4 bg-purple-50 rounded-xl space-y-3">
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
                                    <button type="button" onClick={addGuarantor} className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium">
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
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}