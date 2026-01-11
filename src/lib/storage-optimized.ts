// src/lib/storage-optimized.ts - Space-Optimized Storage
import { db } from './db';

// ============================================
// DATA COMPRESSION UTILITIES
// ============================================

class DataCompressor {
  /**
   * Compress customer data - Remove unnecessary fields
   */
  static compressCustomer(customer: any) {
    return {
      i: customer.id,
      p: customer.profileId,
      n: customer.name,
      ph: customer.phone,
      t: customer.totalAmount,
      ia: customer.installmentAmount,
      f: customer.frequency,
      pd: customer.paidAmount,
      lp: customer.lastPayment,
      s: customer.status,
      // Optional fields only if they exist
      ...(customer.address && { a: customer.address }),
      ...(customer.cnic && { c: customer.cnic }),
      ...(customer.photo && { pt: customer.photo }),
      ...(customer.category && { ct: customer.category }),
      ...(customer.notes && { nt: customer.notes }),
    };
  }

  /**
   * Decompress customer data
   */
  static decompressCustomer(data: any) {
    return {
      id: data.i,
      profileId: data.p,
      name: data.n,
      phone: data.ph,
      totalAmount: data.t,
      installmentAmount: data.ia,
      frequency: data.f,
      paidAmount: data.pd,
      lastPayment: data.lp,
      status: data.s,
      address: data.a || '',
      cnic: data.c || '',
      photo: data.pt || null,
      category: data.ct || 'Other',
      notes: data.nt || '',
      startDate: data.sd || data.lp,
      endDate: data.ed || '',
      document: null,
      createdAt: data.cr || new Date().toISOString(),
      autoMessaging: data.am || false,
      autoSchedule: data.as || false,
    };
  }

  /**
   * Compress payment data
   */
  static compressPayment(payment: any) {
    return {
      i: payment.id,
      c: payment.customerId,
      a: payment.amount,
      d: payment.date,
    };
  }

  /**
   * Decompress payment data
   */
  static decompressPayment(data: any) {
    return {
      id: data.i,
      customerId: data.c,
      amount: data.a,
      date: data.d,
      createdAt: data.cr || new Date().toISOString(),
    };
  }

  /**
   * Compress image to base64 with quality reduction
   */
  static async compressImage(base64: string, maxSizeKB: number = 100): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Calculate new dimensions (max 400x400)
        let width = img.width;
        let height = img.height;
        const maxDim = 400;

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

        // Start with high quality and reduce if needed
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);

        // Reduce quality until size is acceptable
        while (result.length > maxSizeKB * 1024 && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(result);
      };
      img.src = base64;
    });
  }
}

// ============================================
// OPTIMIZED STORAGE SERVICE
// ============================================

export const OptimizedStorage = {
  /**
   * Save customer with compression
   */
  async saveCustomer(customer: any) {
    // Compress image if exists
    if (customer.photo) {
      customer.photo = await DataCompressor.compressImage(customer.photo, 100);
    }

    // Remove document field - store separately if needed
    delete customer.document;

    await db.customers.add(customer);
  },

  /**
   * Update customer with compression
   */
  async updateCustomer(id: number, updates: any) {
    // Compress image if exists
    if (updates.photo) {
      updates.photo = await DataCompressor.compressImage(updates.photo, 100);
    }

    await db.customers.update(id, updates);
  },

  /**
   * Batch cleanup - Remove old completed customers
   */
  async cleanupOldData(keepLastMonths: number = 3) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - keepLastMonths);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Get old completed customers
    const oldCompleted = await db.customers
      .where('status')
      .equals('completed')
      .filter(c => c.lastPayment < cutoffStr)
      .toArray();

    const customerIds = oldCompleted.map(c => c.id);

    if (customerIds.length > 0) {
      await db.transaction('rw', db.customers, db.payments, async () => {
        // Archive before delete (optional)
        const archived = {
          customers: oldCompleted,
          archivedAt: new Date().toISOString(),
        };
        await db.setMeta('archived_customers', archived);

        // Delete old data
        await db.customers.bulkDelete(customerIds);
        await db.payments.where('customerId').anyOf(customerIds).delete();
      });

      return customerIds.length;
    }

    return 0;
  },

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    const [customerCount, paymentCount, size] = await Promise.all([
      db.customers.count(),
      db.payments.count(),
      db.getStorageSize(),
    ]);

    const sizeKB = Math.round(size / 1024);
    const sizeMB = (size / (1024 * 1024)).toFixed(2);

    return {
      customers: customerCount,
      payments: paymentCount,
      sizeKB,
      sizeMB,
      sizePretty: sizeMB + ' MB',
      canCleanup: customerCount > 100,
    };
  },

  /**
   * Export minimal data (without photos)
   */
  async exportMinimal() {
    const [customers, payments] = await Promise.all([
      db.customers.toArray(),
      db.payments.toArray(),
    ]);

    // Remove photos from export
    const minimalCustomers = customers.map(c => ({
      ...c,
      photo: null,
      document: null,
    }));

    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      customers: minimalCustomers,
      payments,
    };
  },

  /**
   * Vacuum database - Remove fragmentation
   */
  async vacuum() {
    // Get all data
    const [customers, payments] = await Promise.all([
      db.customers.toArray(),
      db.payments.toArray(),
    ]);

    // Clear and re-add
    await db.transaction('rw', db.customers, db.payments, async () => {
      await db.customers.clear();
      await db.payments.clear();
      await db.customers.bulkAdd(customers);
      await db.payments.bulkAdd(payments);
    });

    return true;
  },
};