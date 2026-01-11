// src/hooks/useCompact.ts - Less Code, More Features
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Storage } from '@/lib/storage';
import { db } from '@/lib/db';
import type { Profile, Customer } from '@/types';

// ============================================
// COMPACT FORM HOOK
// ============================================

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

// ============================================
// COMPACT PROFILE HOOK
// ============================================

export function useProfile() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const p = await Storage.get<Profile | null>('currentProfile', null);
        if (!p) {
            router.push('/');
            return;
        }
        setProfile(p);
        setLoading(false);
    };

    return { profile, loading, reload: loadProfile };
}

// ============================================
// COMPACT CUSTOMERS HOOK
// ============================================

export function useCompactCustomers(profileId?: number) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profileId) return;
        load();
    }, [profileId]);

    const load = async () => {
        if (!profileId) return;
        const data = await db.getCustomersByProfile(profileId);
        setCustomers(data);
        setLoading(false);
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
        await db.transaction('rw', db.customers, db.payments, async () => {
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

// ============================================
// VALIDATION RULES
// ============================================

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

// ============================================
// COMPACT MODAL HOOK
// ============================================

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

// ============================================
// COMPACT FILTER HOOK
// ============================================

export function useFilter<T>(
    items: T[],
    searchFields: (keyof T)[]
) {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');

    const filtered = items.filter(item => {
        // Search filter
        if (query) {
            const matches = searchFields.some(field =>
                String(item[field])
                    .toLowerCase()
                    .includes(query.toLowerCase())
            );
            if (!matches) return false;
        }

        // Status filter
        if (filter !== 'all') {
            if (!item.hasOwnProperty('status')) return true;
            if ((item as any).status !== filter) return false;
        }

        return true;
    });

    return { query, setQuery, filter, setFilter, filtered };
}

// ============================================
// EXAMPLE USAGE
// ============================================

/*
// Form with validation
const { data, set, errors, validate } = useForm({
  name: '',
  phone: '',
  amount: '',
});

const rules = {
  name: Rules.required(),
  phone: Rules.phone(),
  amount: Rules.min(0),
};

if (validate(rules)) {
  // Submit
}

// Profile management
const { profile, loading } = useProfile();

// Customers with built-in stats
const { customers, stats, add, update, remove } = useCompactCustomers(profile?.id);

// Modal
const modal = useModal();
modal.show({ customer });
if (modal.open) { ... }

// Filter
const { query, setQuery, filtered } = useFilter(customers, ['name', 'phone']);
*/