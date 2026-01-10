// src/lib/backup.ts
import { Storage } from './storage';
import { GoogleDriveService, type DriveAccount } from './googleDrive';
import type { Customer, Payment, Profile } from '@/types';

export interface BackupData {
    version: string;
    exportDate: string;
    profiles: Profile[];
    customers: Customer[];
    payments: Payment[];
    settings: any;
}

export const BackupService = {
    /**
     * Create backup data object
     */
    createBackup: (): BackupData => {
        const profiles = Storage.get<Profile[]>('profiles', []);
        const customers = Storage.get<Customer[]>('customers', []);
        const payments = Storage.get<Payment[]>('payments', []);
        const settings = Storage.get('settings', {});

        return {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            profiles,
            customers,
            payments,
            settings,
        };
    },

    /**
     * Generate backup filename with date
     */
    generateBackupFilename: (): string => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        return `ma-backup-${dateStr}-${timeStr}.json`;
    },

    /**
     * Save backup to local file
     */
    exportToFile: () => {
        const backup = BackupService.createBackup();
        const blob = new Blob([JSON.stringify(backup, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = BackupService.generateBackupFilename();
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Upload backup to Google Drive
     */
    backupToDrive: async (account?: DriveAccount): Promise<boolean> => {
        try {
            // Get account with most space if not specified
            const targetAccount = account || GoogleDriveService.getAccountWithMostSpace();

            if (!targetAccount) {
                alert('No Google Drive account connected!');
                return false;
            }

            const backup = BackupService.createBackup();
            const fileName = BackupService.generateBackupFilename();
            const data = JSON.stringify(backup, null, 2);

            const result = await GoogleDriveService.uploadFile(
                targetAccount,
                fileName,
                data,
                'application/json'
            );

            if (result) {
                // Save last backup info
                localStorage.setItem('lastBackup', JSON.stringify({
                    date: new Date().toISOString(),
                    accountId: targetAccount.id,
                    fileName: fileName,
                    size: data.length,
                }));
                return true;
            }

            return false;
        } catch (error) {
            console.error('Backup to drive failed:', error);
            return false;
        }
    },

    /**
     * Auto backup when storage is high
     */
    autoBackupIfNeeded: async () => {
        const usage = Storage.getUsagePercentage();

        // Auto backup if usage > 70%
        if (usage > 70) {
            const accounts = GoogleDriveService.getAccounts();
            if (accounts.length > 0) {
                const success = await BackupService.backupToDrive();
                if (success) {
                    console.log('Auto backup completed');
                }
            }
        }
    },

    /**
     * Restore from backup data
     */
    restoreFromData: (backupData: BackupData): boolean => {
        try {
            // Validate backup data
            if (!backupData.version || !backupData.exportDate) {
                throw new Error('Invalid backup data');
            }

            // Confirm with user
            if (!confirm(
                `Restore backup from ${new Date(backupData.exportDate).toLocaleString()}?\n\n` +
                `This will replace all current data:\n` +
                `- ${backupData.profiles.length} profiles\n` +
                `- ${backupData.customers.length} customers\n` +
                `- ${backupData.payments.length} payments\n\n` +
                `Current data will be lost!`
            )) {
                return false;
            }

            // Restore data
            Storage.save('profiles', backupData.profiles);
            Storage.save('customers', backupData.customers);
            Storage.save('payments', backupData.payments);

            if (backupData.settings) {
                Storage.save('settings', backupData.settings);
            }

            // Set first profile as current
            if (backupData.profiles.length > 0) {
                Storage.save('currentProfile', backupData.profiles[0]);
            }

            alert('Backup restored successfully!');
            return true;
        } catch (error) {
            console.error('Restore failed:', error);
            alert('Failed to restore backup. Invalid data format.');
            return false;
        }
    },

    /**
     * Restore from local file
     */
    restoreFromFile: (file: File): Promise<boolean> => {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target?.result as string);
                    const success = BackupService.restoreFromData(data);
                    resolve(success);
                } catch (error) {
                    alert('Invalid backup file!');
                    resolve(false);
                }
            };

            reader.onerror = () => {
                alert('Failed to read file!');
                resolve(false);
            };

            reader.readAsText(file);
        });
    },

    /**
     * Restore from Google Drive
     */
    restoreFromDrive: async (account: DriveAccount, fileId: string): Promise<boolean> => {
        try {
            const data = await GoogleDriveService.downloadFile(account, fileId);

            if (!data) {
                alert('Failed to download backup from Drive!');
                return false;
            }

            const backupData = JSON.parse(data);
            return BackupService.restoreFromData(backupData);
        } catch (error) {
            console.error('Restore from drive failed:', error);
            alert('Failed to restore from Drive!');
            return false;
        }
    },

    /**
     * Get last backup info
     */
    getLastBackupInfo: (): any | null => {
        const stored = localStorage.getItem('lastBackup');
        return stored ? JSON.parse(stored) : null;
    },

    /**
     * Schedule automatic backups
     */
    scheduleAutoBackup: () => {
        // Check every hour
        setInterval(() => {
            BackupService.autoBackupIfNeeded();
        }, 60 * 60 * 1000);
    },

    /**
     * Get backup statistics
     */
    getBackupStats: () => {
        const lastBackup = BackupService.getLastBackupInfo();
        const backupFiles = GoogleDriveService.listBackupFiles();
        const totalSize = GoogleDriveService.getTotalBackupSize();
        const accounts = GoogleDriveService.getAccounts();

        return {
            lastBackup,
            totalBackups: backupFiles.length,
            totalSize,
            connectedAccounts: accounts.length,
            backupFiles,
        };
    },
};