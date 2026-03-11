// src/hooks/useCompact.ts - FIXED (No offline redirect loop)
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import type { Profile, Customer } from '@/types';

export function useForm<T extends Record<string, any>>(initial: T) {
    const [data, setData] = useState(initial);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const set = (field: keyof T, value: any) => {
        setData(d => ({ ...d, [field]: value }));
        if (errors[field as string]) {
            setErrors(e => ({ ...e, [field as string]: '' }));
        }
    };

    const validate = (rules: Record<string, (val: any) => string | null>) => {
        const err: Record<string, string> = {};
        Object.entries(rules).forEach(([key, rule]) => {
            const error = rule(data[key]);
            if (error) err[key] = error;
        });
        setErrors(err);
        return Object.keys(err).length === 0;
    };

    const reset = () => {
        setData(initial);
        setErrors({});
    };

    return { data, set, errors, validate, reset, setData };
}

export function useProfile() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            // FIX: Retry up to 3 times — IndexedDB can be slow on first load
            let p: Profile | null = null;
            for (let i = 0; i < 3; i++) {
                p = (await db.getMeta<Profile | null>('currentProfile', null)) ?? null;
                if (p) break;

                // Also check profiles table directly
                const profiles = await db.profiles.toArray();
                if (profiles.length > 0) {
                    p = profiles[0];
                    await db.setMeta('currentProfile', p);
                    break;
                }

                if (i < 2) await new Promise(r => setTimeout(r, 300));
            }

            if (!p) {
                // FIX: Don't redirect — create default profile instead
                const existingCount = await db.profiles.count();
                if (existingCount === 0) {
                    const defaultProfile: Profile = {
                        id: Date.now(),
                        name: 'My Business',
                        description: 'Default account',
                        gradient: 'from-blue-500 to-purple-500',
                        createdAt: new Date().toISOString(),
                        totalInvestment: 0,
                        investmentHistory: [],
                    };
                    await db.profiles.add(defaultProfile);
                    await db.setMeta('currentProfile', defaultProfile);
                    p = defaultProfile;
                } else {
                    // Profiles exist but meta missing — fix it
                    const firstProfile = await db.profiles.toCollection().first();
                    if (firstProfile) {
                        await db.setMeta('currentProfile', firstProfile);
                        p = firstProfile;
                    }
                }
            }

            setProfile(p);
        } catch (error) {
            console.error('useProfile error:', error);
            // FIX: Don't redirect on error — show null state gracefully
        } finally {
            setLoading(false);
        }
    };

    return { profile, loading, reload: loadProfile };
}

export function useCompactCustomers(profileId?: number) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profileId) return;
        load();
    }, [profileId]);

    const load = async () => {
        if (!profileId) return;
        try {
            const data = await db.getCustomersByProfile(profileId);
            setCustomers(data);
        } catch (error) {
            console.error('useCompactCustomers error:', error);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    const add = async (c: Omit<Customer, 'id' | 'createdAt'>) => {
        const customer: Customer = {
            ...c,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        };
        await db.customers.add(customer);
        await load();
        return customer;
    };

    const update = async (id: number, updates: Partial<Customer>) => {
        await db.customers.update(id, updates);
        await load();
    };

    const remove = async (id: number) => {
        await db.transaction('rw', [db.customers, db.payments], async () => {
            await db.customers.delete(id);
            await db.payments.where('customerId').equals(id).delete();
        });
        await load();
    };

    const stats = {
        total: customers.length,
        active: customers.filter(c => c.status === 'active').length,
        completed: customers.filter(c => c.status === 'completed').length,
        revenue: customers.reduce((s, c) => s + c.paidAmount, 0),
        expected: customers.reduce((s, c) => s + c.totalAmount, 0),
    };

    return { customers, loading, add, update, remove, reload: load, stats };
}

export const Rules = {
    required: (msg = 'Required') => (val: any) =>
        !val || !val.toString().trim() ? msg : null,

    min: (min: number, msg?: string) => (val: any) =>
        parseFloat(val) < min ? msg || `Min ${min}` : null,

    max: (max: number, msg?: string) => (val: any) =>
        parseFloat(val) > max ? msg || `Max ${max}` : null,

    phone: (msg = 'Invalid phone') => (val: string) =>
        !/^[0-9+\s-()]{10,}$/.test(val) ? msg : null,

    cnic: (msg = 'Invalid CNIC') => (val: string) =>
        val && !/^\d{5}-\d{7}-\d{1}$/.test(val) ? msg : null,
};

export function useModal() {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<any>(null);

    const show = (payload?: any) => {
        setData(payload);
        setOpen(true);
    };

    const hide = () => {
        setOpen(false);
        setData(null);
    };

    return { open, data, show, hide };
}

export function useFilter<T extends Record<string, any>>(
    items: T[],
    searchFields: (keyof T)[]
) {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');

    const filtered = items.filter(item => {
        if (query) {
            const matches = searchFields.some(field =>
                String(item[field]).toLowerCase().includes(query.toLowerCase())
            );
            if (!matches) return false;
        }

        if (filter !== 'all') {
            const status = (item as any).status;
            if (status !== undefined && status !== filter) return false;
        }

        return true;
    });

    return { query, setQuery, filter, setFilter, filtered };
}