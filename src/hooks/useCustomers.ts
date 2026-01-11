// src/hooks/useCustomers.ts - UPDATED to use IndexedDB

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import type { Customer, Payment } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

// ============================================
// LIVE QUERY HOOKS (Auto-updating)
// ============================================

/**
 * Get all customers for a profile (live updates)
 */
export function useCustomers(profileId?: number) {
    const customers = useLiveQuery(
        async () => {
            if (!profileId) return [];
            return db.getCustomersByProfile(profileId);
        },
        [profileId],
        []
    );

    const addCustomer = useCallback(async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
        const newCustomer: Customer = {
            ...customer,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        };

        await db.customers.add(newCustomer);
        return newCustomer;
    }, []);

    const updateCustomer = useCallback(async (id: number, updates: Partial<Customer>) => {
        await db.customers.update(id, updates);
        return true;
    }, []);

    const deleteCustomer = useCallback(async (id: number) => {
        // Delete customer and all their payments
        await db.transaction('rw', db.customers, db.payments, async () => {
            await db.customers.delete(id);
            await db.payments.where('customerId').equals(id).delete();
        });
        return true;
    }, []);

    const getCustomer = useCallback(async (id: number): Promise<Customer | undefined> => {
        return db.customers.get(id);
    }, []);

    return {
        customers: customers || [],
        loading: customers === undefined,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomer,
    };
}

/**
 * Get active customers for a profile
 */
export function useActiveCustomers(profileId?: number) {
    const customers = useLiveQuery(
        async () => {
            if (!profileId) return [];
            return db.getActiveCustomersByProfile(profileId);
        },
        [profileId],
        []
    );

    return {
        customers: customers || [],
        loading: customers === undefined,
    };
}

/**
 * Get collection collection customers
 */
export function useDailyCustomers(profileId?: number) {
    const customers = useLiveQuery(
        async () => {
            if (!profileId) return [];
            return db.getDailyCustomers(profileId);
        },
        [profileId],
        []
    );

    return {
        customers: customers || [],
        loading: customers === undefined,
    };
}

/**
 * Get overdue customers
 */
export function useOverdueCustomers(profileId?: number, days: number = 7) {
    const customers = useLiveQuery(
        async () => {
            if (!profileId) return [];
            return db.getOverdueCustomers(profileId, days);
        },
        [profileId, days],
        []
    );

    return {
        customers: customers || [],
        loading: customers === undefined,
    };
}

// ============================================
// PAYMENT HOOKS
// ============================================

/**
 * Get payments for a customer (live updates)
 */
export function usePayments(customerId?: number) {
    const payments = useLiveQuery(
        async () => {
            if (!customerId) return [];
            return db.getPaymentsByCustomer(customerId);
        },
        [customerId],
        []
    );

    const addPayment = useCallback(async (payment: Omit<Payment, 'id' | 'createdAt'>) => {
        const newPayment: Payment = {
            ...payment,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        };

        // Add payment and update customer in one transaction
        await db.transaction('rw', db.payments, db.customers, async () => {
            await db.payments.add(newPayment);

            // Update customer's paid amount
            const customer = await db.customers.get(payment.customerId);
            if (customer) {
                customer.paidAmount += payment.amount;
                customer.lastPayment = payment.date;

                // Update status if completed
                if (customer.paidAmount >= customer.totalAmount) {
                    customer.status = 'completed';
                }

                await db.customers.put(customer);
            }
        });

        return newPayment;
    }, []);

    const deletePayment = useCallback(async (id: number) => {
        const payment = await db.payments.get(id);
        if (!payment) return false;

        // Delete payment and update customer in one transaction
        await db.transaction('rw', db.payments, db.customers, async () => {
            await db.payments.delete(id);

            // Update customer's paid amount
            const customer = await db.customers.get(payment.customerId);
            if (customer) {
                customer.paidAmount -= payment.amount;
                customer.status = 'active';

                // Update last payment date
                const remainingPayments = await db.payments
                    .where('customerId')
                    .equals(payment.customerId)
                    .reverse()
                    .sortBy('date');

                if (remainingPayments.length > 0) {
                    customer.lastPayment = remainingPayments[0].date;
                }

                await db.customers.put(customer);
            }
        });

        return true;
    }, []);

    return {
        payments: payments || [],
        loading: payments === undefined,
        addPayment,
        deletePayment,
    };
}

/**
 * Get payments for a date range
 */
export function usePaymentsByDateRange(startDate: string, endDate: string) {
    const payments = useLiveQuery(
        async () => {
            return db.getPaymentsByDateRange(startDate, endDate);
        },
        [startDate, endDate],
        []
    );

    return {
        payments: payments || [],
        loading: payments === undefined,
    };
}

// ============================================
// SEARCH HOOK
// ============================================

/**
 * Search customers
 */
export function useCustomerSearch(profileId?: number) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!profileId || !query.trim()) {
            setResults([]);
            return;
        }

        let cancelled = false;
        setLoading(true);

        db.searchCustomers(profileId, query)
            .then(customers => {
                if (!cancelled) {
                    setResults(customers);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error('Search error:', err);
                if (!cancelled) {
                    setResults([]);
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [profileId, query]);

    return {
        query,
        setQuery,
        results,
        loading,
    };
}

// ============================================
// STATISTICS HOOK
// ============================================

/**
 * Get customer statistics
 */
export function useCustomerStats(profileId?: number) {
    const customers = useLiveQuery(
        async () => {
            if (!profileId) return [];
            return db.getCustomersByProfile(profileId);
        },
        [profileId],
        []
    );

    const stats = useLiveQuery(
        async () => {
            if (!customers || customers.length === 0) {
                return {
                    total: 0,
                    active: 0,
                    completed: 0,
                    totalRevenue: 0,
                    totalExpected: 0,
                    collectionRate: 0,
                };
            }

            const active = customers.filter(c => c.status === 'active');
            const completed = customers.filter(c => c.status === 'completed');
            const totalRevenue = customers.reduce((sum, c) => sum + c.paidAmount, 0);
            const totalExpected = customers.reduce((sum, c) => sum + c.totalAmount, 0);

            return {
                total: customers.length,
                active: active.length,
                completed: completed.length,
                totalRevenue,
                totalExpected,
                collectionRate: totalExpected > 0
                    ? Math.round((totalRevenue / totalExpected) * 100)
                    : 0,
            };
        },
        [customers],
        {
            total: 0,
            active: 0,
            completed: 0,
            totalRevenue: 0,
            totalExpected: 0,
            collectionRate: 0,
        }
    );

    return {
        stats: stats || {
            total: 0,
            active: 0,
            completed: 0,
            totalRevenue: 0,
            totalExpected: 0,
            collectionRate: 0,
        },
        loading: stats === undefined,
    };
}