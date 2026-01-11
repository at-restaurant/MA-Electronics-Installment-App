// src/app/customers/[id]/edit/page.tsx - WITH GUARANTOR EDIT

'use client';

import { Camera, Save, UserPlus, Trash2, Zap, FileText, X, Upload, Edit } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import GlobalHeader from '@/components/GlobalHeader';
import { db } from '@/lib/db';
import { ImageCompression } from '@/lib/compression';
import type { Customer, Guarantor } from '@/types';

export default function EditCustomerPage() {
    const router = useRouter();
    const params = useParams();
    const customerId = Number(params.id);

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        phone: '',
        address: '',
        cnic: '',
        photo: null as string | null,
        category: 'Electronics',
        notes: '',
        totalAmount: '',
        installmentAmount: '',
        frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
        startDate: '',
        endDate: '',
    });

    const [documents, setDocuments] = useState<string[]>([]);
    const [guarantors, setGuarantors] = useState<Guarantor[]>([]);
    const [showGuarantorForm, setShowGuarantorForm] = useState(false);

    // ✅ NEW: Edit mode for guarantor
    const [editingGuarantorId, setEditingGuarantorId] = useState<number | null>(null);

    const [guarantorForm, setGuarantorForm] = useState({
        name: '',
        phone: '',
        cnic: '',
        photos: [] as string[],
        relation: '',
    });

    const [categories, setCategories] = useState(['Electronics', 'Furniture', 'Mobile', 'Other']);

    useEffect(() => {
        loadCustomer();
        loadCategories();
    }, [customerId]);

    const loadCategories = async () => {
        const settings = await db.getMeta<any>('app_settings');
        if (settings?.categories) {
            setCategories(settings.categories);
        }
    };

    const loadCustomer = async () => {
        const customer = await db.customers.get(customerId);
        if (!customer) {
            router.push('/customers');
            return;
        }

        setForm({
            name: customer.name,
            phone: customer.phone,
            address: customer.address || '',
            cnic: customer.cnic || '',
            photo: customer.photo,
            category: customer.category || 'Electronics',
            notes: customer.notes || '',
            totalAmount: customer.totalAmount?.toString() || '',
            installmentAmount: customer.installmentAmount?.toString() || '',
            frequency: customer.frequency || 'daily',
            startDate: customer.startDate || '',
            endDate: customer.endDate || '',
        });

        setDocuments(customer.cnicPhotos || []);
        setGuarantors(customer.guarantors || []);
        setLoading(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = ImageCompression.validateFile(file);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        setUploading(true);

        try {
            const compressed = await ImageCompression.compressProfile(file);
            if (field === 'photo') {
                setForm((prev) => ({ ...prev, photo: compressed }));
            }
        } catch (error) {
            console.error('Image compression failed:', error);
            alert('Failed to compress image');
        } finally {
            setUploading(false);
        }
    };

    const handleDocumentsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (documents.length + files.length > 10) {
            alert('Maximum 10 documents allowed');
            return;
        }

        setUploading(true);

        try {
            const newDocs: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                if (file.size > 5 * 1024 * 1024) {
                    alert(`${file.name} is too large (max 5MB)`);
                    continue;
                }

                const compressed = await ImageCompression.compressCNIC(file);
                newDocs.push(compressed);
            }

            setDocuments([...documents, ...newDocs]);
        } catch (error) {
            console.error('Document upload failed:', error);
            alert('Failed to upload documents');
        } finally {
            setUploading(false);
        }
    };

    const removeDocument = (index: number) => {
        setDocuments(documents.filter((_, i) => i !== index));
    };

    const handleGuarantorPhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (guarantorForm.photos.length + files.length > 5) {
            alert('Maximum 5 photos per guarantor');
            return;
        }

        setUploading(true);

        try {
            const newPhotos: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                const validation = ImageCompression.validateFile(file);
                if (!validation.valid) {
                    alert(`${file.name}: ${validation.error}`);
                    continue;
                }

                const compressed = await ImageCompression.compressGuarantor(file);
                newPhotos.push(compressed);
            }

            setGuarantorForm((prev) => ({
                ...prev,
                photos: [...prev.photos, ...newPhotos],
            }));
        } catch (error) {
            console.error('Photo upload failed:', error);
            alert('Failed to upload photos');
        } finally {
            setUploading(false);
        }
    };

    const removeGuarantorPhoto = (index: number) => {
        setGuarantorForm((prev) => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index),
        }));
    };

    // ✅ EDIT GUARANTOR - Load data into form
    const editGuarantor = (guarantor: Guarantor & { id: number }) => {
        setEditingGuarantorId(guarantor.id);
        setGuarantorForm({
            name: guarantor.name,
            phone: guarantor.phone,
            cnic: guarantor.cnic || '',
            photos: guarantor.photos || [],
            relation: guarantor.relation || '',
        });
        setShowGuarantorForm(true);
    };

    // ✅ SAVE GUARANTOR (Add or Update)
    const saveGuarantor = () => {
        if (!guarantorForm.name || !guarantorForm.phone) {
            alert('Name and phone required');
            return;
        }

        if (editingGuarantorId) {
            // UPDATE existing guarantor
            setGuarantors(guarantors.map(g =>
                g.id === editingGuarantorId
                    ? {
                        id: editingGuarantorId,
                        name: guarantorForm.name,
                        phone: guarantorForm.phone,
                        cnic: guarantorForm.cnic,
                        photos: guarantorForm.photos,
                        photo: guarantorForm.photos.length > 0 ? guarantorForm.photos[0] : null,
                        relation: guarantorForm.relation,
                    }
                    : g
            ));
            setEditingGuarantorId(null);
        } else {
            // ADD new guarantor
            const newGuarantor: Guarantor & { id: number } = {
                id: Date.now(),
                name: guarantorForm.name,
                phone: guarantorForm.phone,
                cnic: guarantorForm.cnic,
                photos: guarantorForm.photos,
                photo: guarantorForm.photos.length > 0 ? guarantorForm.photos[0] : null,
                relation: guarantorForm.relation,
            };
            setGuarantors([...guarantors, newGuarantor]);
        }

        // Reset form
        setGuarantorForm({ name: '', phone: '', cnic: '', photos: [], relation: '' });
        setShowGuarantorForm(false);
    };

    const removeGuarantor = (id: number) => {
        if (!confirm('Delete this guarantor?')) return;
        setGuarantors(guarantors.filter((g) => g.id !== id));
    };

    const handleSubmit = async () => {
        if (!form.name || !form.phone || !form.totalAmount || !form.installmentAmount) {
            alert('Please fill all required fields');
            return;
        }

        const updates: Partial<Customer> = {
            name: form.name,
            phone: form.phone,
            address: form.address,
            cnic: form.cnic,
            photo: form.photo,
            cnicPhoto: documents.length > 0 ? documents[0] : null,
            cnicPhotos: documents,
            category: form.category,
            notes: form.notes,
            totalAmount: parseFloat(form.totalAmount),
            installmentAmount: parseFloat(form.installmentAmount),
            frequency: form.frequency,
            startDate: form.startDate,
            endDate: form.endDate,
            guarantors: guarantors,
        };

        await db.customers.update(customerId, updates);
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
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(e, 'photo')}
                                    />
                                </label>
                            </div>
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
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Ahmed Khan"
                                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Phone *</label>
                                <input
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    {categories.map((c) => (
                                        <option key={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">CNIC</label>
                                <input
                                    value={form.cnic}
                                    onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                                    placeholder="12345-1234567-1"
                                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Address</label>
                            <input
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                placeholder="House #, Street, Area"
                                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Documents */}
                        <div>
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                Documents - Max 10
                            </label>

                            {documents.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {documents.map((doc, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={doc}
                                                alt={`Document ${index + 1}`}
                                                className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeDocument(index)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <p className="text-xs text-center mt-1 text-gray-600">Doc {index + 1}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {documents.length < 10 && (
                                <label className={`w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors flex items-center justify-center gap-2 ${uploading ? 'opacity-50' : ''}`}>
                                    <Upload className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                        {uploading ? 'Uploading...' : `Upload Documents (${documents.length}/10)`}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleDocumentsUpload}
                                        disabled={uploading}
                                    />
                                </label>
                            )}
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
                                        onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                                        placeholder="50000"
                                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Frequency</label>
                                    <select
                                        value={form.frequency}
                                        onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}
                                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Installment (₨) *</label>
                                    <input
                                        type="number"
                                        value={form.installmentAmount}
                                        onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })}
                                        placeholder="2000"
                                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Start Date</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                        className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5">End Date</label>
                                <input
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* ✅ GUARANTORS WITH EDIT FUNCTIONALITY */}
                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-purple-600" />
                                    Guarantors ({guarantors.length})
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingGuarantorId(null);
                                        setGuarantorForm({ name: '', phone: '', cnic: '', photos: [], relation: '' });
                                        setShowGuarantorForm(!showGuarantorForm);
                                    }}
                                    className="text-sm text-purple-600 font-medium"
                                >
                                    {showGuarantorForm ? 'Cancel' : 'Add'}
                                </button>
                            </div>

                            {/* Guarantor List */}
                            {guarantors.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {guarantors.map((g) => (
                                        <div key={g.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="flex gap-1">
                                                {g.photos?.slice(0, 3).map((photo, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={photo}
                                                        alt={`${g.name} ${idx + 1}`}
                                                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                                                    />
                                                ))}
                                                {(g.photos?.length || 0) > 3 && (
                                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xs text-purple-600 font-bold">
                                                        +{(g.photos?.length || 0) - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{g.name}</p>
                                                <p className="text-xs text-gray-500">{g.phone}</p>
                                                <p className="text-xs text-purple-600">{g.photos?.length || 0} photos</p>
                                            </div>
                                            {/* ✅ EDIT BUTTON */}
                                            <button
                                                type="button"
                                                onClick={() => editGuarantor(g as Guarantor & { id: number })}
                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
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

                            {/* Guarantor Form */}
                            {showGuarantorForm && (
                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                                    <p className="text-sm font-semibold text-purple-700">
                                        {editingGuarantorId ? '✏️ Edit Guarantor' : '➕ Add Guarantor'}
                                    </p>

                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            placeholder="Name *"
                                            value={guarantorForm.name}
                                            onChange={(e) => setGuarantorForm({ ...guarantorForm, name: e.target.value })}
                                            className="px-3 py-2 border rounded-lg"
                                        />
                                        <input
                                            placeholder="Phone *"
                                            value={guarantorForm.phone}
                                            onChange={(e) => setGuarantorForm({ ...guarantorForm, phone: e.target.value })}
                                            className="px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            placeholder="CNIC"
                                            value={guarantorForm.cnic}
                                            onChange={(e) => setGuarantorForm({ ...guarantorForm, cnic: e.target.value })}
                                            className="px-3 py-2 border rounded-lg"
                                        />
                                        <input
                                            placeholder="Relation"
                                            value={guarantorForm.relation}
                                            onChange={(e) => setGuarantorForm({ ...guarantorForm, relation: e.target.value })}
                                            className="px-3 py-2 border rounded-lg"
                                        />
                                    </div>

                                    {/* Photos */}
                                    <div>
                                        <label className="block text-xs font-medium mb-2 text-purple-700">
                                            Photos (Max 5) - CNIC, Documents
                                        </label>

                                        {guarantorForm.photos.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2 mb-2">
                                                {guarantorForm.photos.map((photo, index) => (
                                                    <div key={index} className="relative group">
                                                        <img
                                                            src={photo}
                                                            alt={`Photo ${index + 1}`}
                                                            className="w-full h-20 object-cover rounded-lg border-2 border-purple-200"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeGuarantorPhoto(index)}
                                                            className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {guarantorForm.photos.length < 5 && (
                                            <label className={`flex items-center gap-2 p-3 border-2 border-dashed rounded-lg hover:border-purple-500 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                                                <Camera className="w-5 h-5 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {uploading ? 'Uploading...' : `Upload Photos (${guarantorForm.photos.length}/5)`}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={handleGuarantorPhotosUpload}
                                                    disabled={uploading}
                                                />
                                            </label>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={saveGuarantor}
                                        className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                                    >
                                        {editingGuarantorId ? 'Update Guarantor' : 'Add Guarantor'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                                className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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