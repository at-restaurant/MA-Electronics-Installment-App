// src/lib/notificationSound.ts - Enhanced Notification with Sound

import { db } from './db';

export class NotificationService {
    private static audioContext: AudioContext | null = null;

    /**
     * Initialize audio context
     */
    private static getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * Play success sound (payment received)
     */
    static async playSuccessSound(): Promise<void> {
        try {
            const ctx = this.getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Success melody: C -> E -> G
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            const duration = 0.15;

            oscillator.type = 'sine';

            for (let i = 0; i < notes.length; i++) {
                oscillator.frequency.setValueAtTime(notes[i], ctx.currentTime + i * duration);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime + i * duration);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (i + 1) * duration);
            }

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + notes.length * duration);
        } catch (error) {
            console.error('Sound playback failed:', error);
        }
    }

    /**
     * Play alert sound (overdue payment)
     */
    static async playAlertSound(): Promise<void> {
        try {
            const ctx = this.getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Alert: Quick beeps
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(800, ctx.currentTime);

            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.1);

            // Second beep
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            osc2.type = 'square';
            osc2.frequency.setValueAtTime(800, ctx.currentTime + 0.15);
            gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.25);
        } catch (error) {
            console.error('Sound playback failed:', error);
        }
    }

    /**
     * Play notification sound (reminder)
     */
    static async playNotificationSound(): Promise<void> {
        try {
            const ctx = this.getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, ctx.currentTime);

            gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.3);
        } catch (error) {
            console.error('Sound playback failed:', error);
        }
    }

    /**
     * Send notification with sound
     */
    static async send(
        title: string,
        body: string,
        options?: {
            sound?: 'success' | 'alert' | 'notification';
            requireInteraction?: boolean;
            tag?: string;
        }
    ): Promise<void> {
        // Check settings
        const settings = await db.getMeta<any>('notifications', {
            enableNotifications: true,
            soundEnabled: true,
        });

        if (!settings.enableNotifications) return;

        // Check permission
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                requireInteraction: options?.requireInteraction,
                tag: options?.tag,
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Play sound
            if (settings.soundEnabled && options?.sound) {
                switch (options.sound) {
                    case 'success':
                        await this.playSuccessSound();
                        break;
                    case 'alert':
                        await this.playAlertSound();
                        break;
                    case 'notification':
                        await this.playNotificationSound();
                        break;
                }
            }
        }
    }

    /**
     * Request permission
     */
    static async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) return false;

        if (Notification.permission === 'granted') return true;

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    /**
     * Payment received notification
     */
    static async notifyPaymentReceived(customerName: string, amount: string): Promise<void> {
        await this.send(
            '✅ Payment Received',
            `${customerName} paid ${amount}`,
            { sound: 'success', tag: 'payment' }
        );
    }

    /**
     * Overdue alert notification
     */
    static async notifyOverdue(customerName: string, days: number): Promise<void> {
        await this.send(
            '⚠️ Payment Overdue',
            `${customerName} - ${days} days overdue`,
            { sound: 'alert', requireInteraction: true, tag: 'overdue' }
        );
    }

    /**
     * Reminder notification
     */
    static async notifyReminder(customerName: string): Promise<void> {
        await this.send(
            '🔔 Payment Reminder',
            `Reminder for ${customerName}`,
            { sound: 'notification', tag: 'reminder' }
        );
    }

    /**
     * Completion notification
     */
    static async notifyCompletion(customerName: string): Promise<void> {
        await this.send(
            '🎉 Installment Complete!',
            `${customerName} completed all payments!`,
            { sound: 'success', requireInteraction: true, tag: 'completion' }
        );
    }
}