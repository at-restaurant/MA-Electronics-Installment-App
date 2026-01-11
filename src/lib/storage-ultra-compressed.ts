// src/lib/storage-ultra-compressed.ts - Ultra-Compressed Storage (FIXED)

import type { Customer, Guarantor } from '@/types';
import { db } from './db';

export const UltraStorage = {
    /**
     * Compress customer to ultra-minimal format
     * Reduces size by ~80% compared to full JSON
     */
    compress: (c: Customer) => ({
        id: c.id,
        n: c.name,
        ph: c.phone,
        a: c.address,
        cn: c.cnic,
        p: c.photo ?  1 : 0,
        cp: c.cnicPhoto ? 1 : 0,
        cps: c.cnicPhotos?. length || 0,
        d: c. document ? 1 : 0,
        ta: c.totalAmount,
        ia: c.installmentAmount,
        f: c.frequency[0], // 'd', 'w', 'm'
        sd: c.startDate,
        ed: c.endDate,
        nt: c.notes,
        pd: c.paidAmount,
        lp: c.lastPayment,
        s: c.status[0], // 'a', 'c'
        am: c.autoMessaging ?  1 : 0,
        ct: c.category,
        g: c.guarantors?. map((g) => ({
            i: g.id,
            n: g.name,
            ph: g.phone,
            cn: g.cnic,
            p: g.photo ? 1 : 0,
            ps: g.photos?.length || 0,
            r: g.relation,
        })),
        cr: c.createdAt,
        pId: c.profileId,
    }),

    /**
     * Decompress from ultra-minimal format
     */
    decompress: (d: any): Customer => ({
        id: d.id,
        name: d.n,
        phone: d.ph,
        address: d.a || '',
        cnic: d. cn || '',
        photo: null,
        cnicPhoto: null,
        cnicPhotos: [],
        document: null,
        totalAmount:  d.ta,
        installmentAmount: d.ia,
        frequency: d.f === 'd' ? 'daily' : d.f === 'w' ?  'weekly' : 'monthly',
        startDate: d. sd,
        endDate: d.ed,
        notes: d.nt || '',
        paidAmount: d.pd,
        lastPayment: d.lp,
        status: d.s === 'a' ? 'active' : 'completed',
        category: d.ct || 'Other',
        autoMessaging: !!d.am,
        guarantors: d.g?.map((g:  any): Guarantor => ({
            id: g.i,
            name: g.n,
            phone: g.ph,
            cnic: g.cn || '',
            photo: null,
            photos: [],
            relation: g. r || '',
        })) || [],
        createdAt: d.cr,
        profileId: d.pId,
        tags: [],
        autoSchedule: true,
    }),

    /**
     * Compress image to base64 (max 80KB)
     */
    compressImage: async (base64: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                reject(new Error('Image compression only works in browser'));
                return;
            }

            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document. createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }

                    // Max 300x300 for photos
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 300;

                    if (width > height && width > maxDim) {
                        height = (height * maxDim) / width;
                        width = maxDim;
                    } else if (height > maxDim) {
                        width = (width * maxDim) / height;
                        height = maxDim;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // Progressive quality reduction
                    let quality = 0.7;
                    let result = canvas.toDataURL('image/jpeg', quality);

                    while (result.length > 80 * 1024 && quality > 0.1) {
                        quality -= 0.1;
                        result = canvas.toDataURL('image/jpeg', quality);
                    }

                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Image load failed'));

            if (typeof base64 === 'string') {
                img.src = base64;
            } else {
                reject(new Error('Invalid image input'));
            }
        });
    },

    /**
     * Save customer with ultra-compression
     */
    save: async (customer: Customer): Promise<void> => {
        try {
            // Compress images if present
            const customerToSave = { ...customer };

            if (customerToSave. photo) {
                customerToSave.photo = await UltraStorage.compressImage(customerToSave.photo);
            }

            if (customerToSave.cnicPhoto) {
                customerToSave.cnicPhoto = await UltraStorage.compressImage(customerToSave.cnicPhoto);
            }

            // Compress guarantor photos safely
            if (Array.isArray(customerToSave.guarantors)) {
                for (let i = 0; i < customerToSave.guarantors.length; i++) {
                    const g = customerToSave.guarantors[i];
                    if (g.photo) {
                        g.photo = await UltraStorage. compressImage(g.photo);
                    }
                    // Compress photos array if present
                    if (g.photos && Array.isArray(g.photos)) {
                        for (let j = 0; j < g.photos.length; j++) {
                            g.photos[j] = await UltraStorage.compressImage(g.photos[j]);
                        }
                    }
                }
            }

            await db.customers.add(customerToSave);
        } catch (error) {
            console.error('Failed to save customer with compression:', error);
            throw error;
        }
    },

    /**
     * Update customer with compression
     */
    update: async (id: number, updates: Partial<Customer>): Promise<void> => {
        try {
            const updateObj = { ...updates };

            if (updateObj.photo) {
                updateObj.photo = await UltraStorage.compressImage(updateObj.photo);
            }

            if (updateObj.cnicPhoto) {
                updateObj.cnicPhoto = await UltraStorage.compressImage(updateObj.cnicPhoto);
            }

            // Compress guarantor photos safely
            if (Array. isArray(updateObj.guarantors)) {
                for (let i = 0; i < updateObj.guarantors.length; i++) {
                    const g = updateObj.guarantors[i];
                    if (g.photo) {
                        g.photo = await UltraStorage.compressImage(g.photo);
                    }
                    // Compress photos array if present
                    if (g.photos && Array.isArray(g.photos)) {
                        for (let j = 0; j < g.photos.length; j++) {
                            g.photos[j] = await UltraStorage.compressImage(g.photos[j]);
                        }
                    }
                }
            }

            await db. customers.update(id, updateObj);
        } catch (error) {
            console.error('Failed to update customer with compression:', error);
            throw error;
        }
    },

    /**
     * Get storage savings estimate
     */
    getCompressionStats: async (): Promise<{ original: number; compressed: number; saved: string }> => {
        try {
            const customers = await db. customers.toArray();
            const original = JSON.stringify(customers).length;
            const compressed = JSON.stringify(customers. map(UltraStorage.compress)).length;
            const saved = ((1 - compressed / original) * 100).toFixed(1);

            return { original, compressed, saved:  `${saved}%` };
        } catch (error) {
            console.error('Failed to calculate compression stats:', error);
            return { original:  0, compressed: 0, saved: '0%' };
        }
    },
};