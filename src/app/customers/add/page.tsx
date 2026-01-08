'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Upload, Save, X } from 'lucide-react';
import { Storage } from '@/lib/storage';
import { WhatsAppService } from '@/lib/whatsapp';

export default function AddCustomerPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        cnic: '',
        totalAmount: '',
        installmentAmount: '',
        frequency: 'daily',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: '',
        photo: null as string | null,
        document: null as string | null
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleImageUpload = (field: 'photo' | 'document', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('File size should be less than 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange(field, reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
        if (formData.phone.trim() && !/^[0-9+\s-()]+$/.test(formData.phone)) {
            newErrors.phone = 'Invalid phone number';
        }
        if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
            newErrors.totalAmount = 'Valid amount required';
        }
        if (!formData.installmentAmount || parseFloat(formData.installmentAmount) <= 0) {
            newErrors.installmentAmount = 'Valid installment required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        const profile = Storage.get('currentProfile');
        if (!profile) {
            router.push('/');
            return;
        }

        const customer = {
            id: Date.now(),
            profileId: profile.id,
            ...formData,
            totalAmount: parseFloat(formData.totalAmount),
            installmentAmount: parseFloat(formData.installmentAmount),
            paidAmount: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
            lastPayment: formData.startDate
        };

        const allCustomers = Storage.get('customers', []);
        allCustomers.push(customer);
        Storage.save('customers', allCustomers);

        // Ask to send welcome message
        if (confirm('Customer added successfully! Send welcome message via WhatsApp?')) {
            WhatsAppService.sendWelcomeMessage(customer);
        }

        router.push('/customers');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">Add New Customer</h1>
                </div>
            </div>

            <div className="p-4 pb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl overflow-hidden">
                                {formData.photo ? (
                                    <img src={formData.photo} alt="Customer" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="w-10 h-10" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-lg">
                                <Camera className="w-4 h-4" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload('photo', e)}
                                />
                            </label>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Customer Photo (Optional)</p>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="e.g., Ahmed Khan"
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.name ? 'border-red-500' : 'border-gray-200'
                            }`}
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            placeholder="+92 300 1234567"
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.phone ? 'border-red-500' : 'border-gray-200'
                            }`}
                        />
                        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address
                        </label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            placeholder="House #, Street, Area"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* CNIC */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            CNIC Number
                        </label>
                        <input
                            type="text"
                            value={formData.cnic}
                            onChange={(e) => handleChange('cnic', e.target.value)}
                            placeholder="12345-1234567-1"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Total Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Amount (₨) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.totalAmount}
                            onChange={(e) => handleChange('totalAmount', e.target.value)}
                            placeholder="50000"
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.totalAmount ? 'border-red-500' : 'border-gray-200'
                            }`}
                        />
                        {errors.totalAmount && <p className="text-red-500 text-sm mt-1">{errors.totalAmount}</p>}
                    </div>

                    {/* Installment Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Installment Amount (₨) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.installmentAmount}
                            onChange={(e) => handleChange('installmentAmount', e.target.value)}
                            placeholder="2000"
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.installmentAmount ? 'border-red-500' : 'border-gray-200'
                            }`}
                        />
                        {errors.installmentAmount && <p className="text-red-500 text-sm mt-1">{errors.installmentAmount}</p>}
                    </div>

                    {/* Frequency */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Frequency
                        </label>
                        <select
                            value={formData.frequency}
                            onChange={(e) => handleChange('frequency', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => handleChange('startDate', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expected End Date (Optional)
                        </label>
                        <input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => handleChange('endDate', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            placeholder="Any additional information..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Document Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ID Document (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                            {formData.document ? (
                                <div className="relative">
                                    <img src={formData.document} alt="Document" className="max-h-40 mx-auto rounded" />
                                    <button
                                        type="button"
                                        onClick={() => handleChange('document', null)}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer">
                                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600">Click to upload ID document</p>
                                    <p className="text-xs text-gray-400 mt-1">CNIC, License, or any ID proof</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload('document', e)}
                                    />
                                </label>
                            )}
                        </div>
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