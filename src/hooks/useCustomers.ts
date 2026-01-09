// src/hooks/useCustomers.ts

import { useState, useEffect, useCallback } from 'react';
import { Storage } from '@/lib/storage';
import type { Customer, Payment } from '@/types';

export function useCustomers(profileId?: number) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCustomers = useCallback(() => {
        setLoading(true);
        try {
            const allCustomers = Storage.get<Customer[]>('customers', []);

            if (profileId) {
                setCustomers(allCustomers.filter(c => c.profileId === profileId));
            } else {
                setCustomers(allCustomers);
            }
        } catch (error) {
            console.error('Error loading customers:', error);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [profileId]);

    useEffect(() => {
        loadCustomers();

        // Listen for storage updates
        const handleStorageUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail?.key === 'customers') {
                loadCustomers();
            }
        };

        window.addEventListener('storage-update', handleStorageUpdate);
        return () => window.removeEventListener('storage-update', handleStorageUpdate);
    }, [loadCustomers]);

    const addCustomer = useCallback((customer: Omit<Customer, 'id' | 'createdAt'>) => {
        const newCustomer: Customer = {
            ...customer,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        };

        const allCustomers = Storage.get<Customer[]>('customers', []);
        allCustomers.push(newCustomer);
        Storage.save('customers', allCustomers);

        loadCustomers();
        return newCustomer;
    }, [loadCustomers]);

    const updateCustomer = useCallback((id: number, updates: Partial<Customer>) => {
        const allCustomers = Storage.get<Customer[]>('customers', []);
        const index = allCustomers.findIndex(c => c.id === id);

        if (index !== -1) {
            allCustomers[index] = { ...allCustomers[index], ...updates };
            Storage.save('customers', allCustomers);
            loadCustomers();
            return true;
        }
        return false;
    }, [loadCustomers]);

    const deleteCustomer = useCallback((id: number) => {
        const allCustomers = Storage.get<Customer[]>('customers', []);
        const filtered = allCustomers.filter(c => c.id !== id);
        Storage.save('customers', filtered);

        // Also delete associated payments
        const allPayments = Storage.get<Payment[]>('payments', []);
        const filteredPayments = allPayments.filter(p => p.customerId !== id);
        Storage.save('payments', filteredPayments);

        loadCustomers();
        return true;
    }, [loadCustomers]);

    const getCustomer = useCallback((id: number): Customer | undefined => {
        return customers.find(c => c.id === id);
    }, [customers]);

    return {
        customers,
        loading,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomer,
        refresh: loadCustomers,
    };
}

export function usePayments(customerId?: number) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPayments = useCallback(() => {
        setLoading(true);
        try {
            const allPayments = Storage.get<Payment[]>('payments', []);

            if (customerId) {
                setPayments(allPayments.filter(p => p.customerId === customerId));
            } else {
                setPayments(allPayments);
            }
        } catch (error) {
            console.error('Error loading payments:', error);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    useEffect(() => {
        loadPayments();

        const handleStorageUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail?.key === 'payments') {
                loadPayments();
            }
        };

        window.addEventListener('storage-update', handleStorageUpdate);
        return () => window.removeEventListener('storage-update', handleStorageUpdate);
    }, [loadPayments]);

    const addPayment = useCallback((payment: Omit<Payment, 'id' | 'createdAt'>) => {
        const newPayment: Payment = {
            ...payment,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        };

        const allPayments = Storage.get<Payment[]>('payments', []);
        allPayments.push(newPayment);
        Storage.save('payments', allPayments);

        // Update customer's paid amount
        const allCustomers = Storage.get<Customer[]>('customers', []);
        const customerIndex = allCustomers.findIndex(c => c.id === payment.customerId);

        if (customerIndex !== -1) {
            allCustomers[customerIndex].paidAmount += payment.amount;
            allCustomers[customerIndex].lastPayment = payment.date;

            // Update status if completed
            if (allCustomers[customerIndex].paidAmount >= allCustomers[customerIndex].totalAmount) {
                allCustomers[customerIndex].status = 'completed';
            }

            Storage.save('customers', allCustomers);
        }

        loadPayments();
        return newPayment;
    }, [loadPayments]);

    const deletePayment = useCallback((id: number) => {
        const allPayments = Storage.get<Payment[]>('payments', []);
        const payment = allPayments.find(p => p.id === id);

        if (payment) {
            // Update customer's paid amount
            const allCustomers = Storage.get<Customer[]>('customers', []);
            const customerIndex = allCustomers.findIndex(c => c.id === payment.customerId);

            if (customerIndex !== -1) {
                allCustomers[customerIndex].paidAmount -= payment.amount;
                allCustomers[customerIndex].status = 'active';
                Storage.save('customers', allCustomers);
            }

            // Remove payment
            const filtered = allPayments.filter(p => p.id !== id);
            Storage.save('payments', filtered);

            loadPayments();
            return true;
        }

        return false;
    }, [loadPayments]);

    return {
        payments,
        loading,
        addPayment,
        deletePayment,
        refresh: loadPayments,
    };
}