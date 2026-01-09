import { offlineStorage } from './offlineStorage';
import { supabase } from './supabase';
import type { Installment } from '@/types';
import { differenceInDays, parseISO } from 'date-fns';

interface NotificationMessage {
  installmentId: string;
  customerId: string;
  message: string;
  type: 'reminder' | 'overdue' | 'upcoming' | 'completed';
  scheduledFor: string;
}

export const notificationService = {
  async getPaymentTypeLabel(type: string): Promise<string> {
    const labels:  Record<string, string> = {
      weekly: 'Weekly Payment',
      'bi-weekly': 'Bi-weekly Payment',
      monthly:  'Monthly Payment',
    };
    return labels[type] || type;
  },

  async generateNotificationMessage(
    installment: Installment,
    timingType: 'before' | 'on' | 'after',
    reminderDays: number
  ): Promise<NotificationMessage | null> {
    const dueDate = parseISO(installment.dueDate);
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);

    const paymentTypeLabel = await this.getPaymentTypeLabel(installment.paymentType);

    // Determine notification type based on timing
    if (daysUntilDue > 0 && daysUntilDue <= reminderDays && timingType === 'before') {
      return {
        installmentId: installment.id,
        customerId: installment. customerId,
        message: `Reminder: Your ${paymentTypeLabel} of ₨${installment.installmentAmount} is due on ${installment. dueDate}`,
        type: 'reminder',
        scheduledFor: new Date().toISOString(),
      };
    }

    if (daysUntilDue === 0 && timingType === 'on') {
      return {
        installmentId: installment.id,
        customerId: installment.customerId,
        message: `Today's Payment Due:  Your ${paymentTypeLabel} of ₨${installment.installmentAmount} is due today! `,
        type: 'upcoming',
        scheduledFor: new Date().toISOString(),
      };
    }

    if (daysUntilDue < 0 && timingType === 'after') {
      return {
        installmentId: installment.id,
        customerId: installment.customerId,
        message: `⚠️ Overdue Payment: Your ${paymentTypeLabel} of ₨${installment. installmentAmount} was due on ${installment.dueDate}`,
        type: 'overdue',
        scheduledFor:  new Date().toISOString(),
      };
    }

    return null;
  },

  async checkAndCreateNotifications(
    enableNotifications: boolean,
    timingType: 'before' | 'on' | 'after',
    reminderDays:  number
  ) {
    if (!enableNotifications) return [];

    const installments = await offlineStorage.getInstallments();
    const notifications: NotificationMessage[] = [];

    for (const installment of installments) {
      if (installment.status === 'active' || installment.status === 'overdue') {
        const notification = await this.generateNotificationMessage(
          installment,
          timingType,
          reminderDays
        );
        if (notification) {
          notifications.push(notification);
        }
      }
    }

    return notifications;
  },

  async sendBrowserNotification(title: string, options?:  NotificationOptions) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  },

  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  },
};