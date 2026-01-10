// src/lib/driveManager.ts - Complete Google Drive Multi-Account System

import { Storage } from './storage';

const FOLDER_NAME = 'MA_Installment_Backups';
const APP_FOLDER_ID_KEY = 'drive_app_folder_id';

interface DriveAccount {
    id: string;
    email: string;
    name: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    quotaUsed: number;
    quotaTotal: number;
    isActive: boolean;
    folderId?: string;
    lastBackup?: string;
}

interface BackupFile {
    id: string;
    name: string;
    size: number;
    createdTime: string;
    driveEmail: string;
}

export class DriveManager {
    private static instance: DriveManager;
    private accounts: DriveAccount[] = [];

    private constructor() {
        this.loadAccounts();
    }

    static getInstance(): DriveManager {
        if (!DriveManager.instance) {
            DriveManager.instance = new DriveManager();
        }
        return DriveManager.instance;
    }

    private loadAccounts() {
        this.accounts = Storage.get<DriveAccount[]>('drive_accounts', []);
    }

    private saveAccounts() {
        Storage.save('drive_accounts', this.accounts);
    }

    // ===== ACCOUNT MANAGEMENT =====

    async addAccount(authCode: string): Promise<boolean> {
        try {
            // Exchange auth code for tokens
            const tokens = await this.exchangeAuthCode(authCode);
            if (!tokens) return false;

            // Get user info
            const userInfo = await this.getUserInfo(tokens.access_token);
            if (!userInfo) return false;

            // Get quota
            const quota = await this.getQuota(tokens.access_token);

            // Create or get app folder
            const folderId = await this.createAppFolder(tokens.access_token);

            const account: DriveAccount = {
                id: `drive_${Date.now()}`,
                email: userInfo.email,
                name: userInfo.name,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: Date.now() + tokens.expires_in * 1000,
                quotaUsed: quota.used,
                quotaTotal: quota.total,
                isActive: true,
                folderId,
                lastBackup: new Date().toISOString()
            };

            // Check if already exists
            const exists = this.accounts.some(a => a.email === account.email);
            if (exists) {
                console.log('Account already connected');
                return false;
            }

            this.accounts.push(account);
            this.saveAccounts();

            return true;
        } catch (error) {
            console.error('Failed to add account:', error);
            return false;
        }
    }

    removeAccount(accountId: string): boolean {
        this.accounts = this.accounts.filter(a => a.id !== accountId);
        this.saveAccounts();
        return true;
    }

    getAccounts(): DriveAccount[] {
        return this.accounts;
    }

    getActiveAccount(): DriveAccount | null {
        // Return account with most space
        const active = this.accounts.filter(a => a.isActive);
        if (active.length === 0) return null;

        return active.reduce((best, current) => {
            const currentSpace = current.quotaTotal - current.quotaUsed;
            const bestSpace = best.quotaTotal - best.quotaUsed;
            return currentSpace > bestSpace ? current : best;
        });
    }

    // ===== FOLDER MANAGEMENT =====

    private async createAppFolder(accessToken: string): Promise<string> {
        try {
            // Check if folder exists
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );

            const searchData = await searchResponse.json();

            if (searchData.files && searchData.files.length > 0) {
                return searchData.files[0].id;
            }

            // Create folder
            const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                })
            });

            const folder = await createResponse.json();
            return folder.id;
        } catch (error) {
            console.error('Folder creation error:', error);
            throw error;
        }
    }

    // ===== AUTO BACKUP =====

    async autoBackup(): Promise<boolean> {
        try {
            const account = this.getActiveAccount();
            if (!account) {
                console.log('No active account for backup');
                return false;
            }

            // Check if token needs refresh
            if (Date.now() >= account.expiresAt - 300000) {
                await this.refreshToken(account);
            }

            // Create backup data (exclude completed customers)
            const backup = this.createBackupData(false); // false = exclude completed

            const fileName = `MA_Backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;

            // Upload to Drive
            const uploaded = await this.uploadFile(
                account.accessToken,
                account.folderId!,
                fileName,
                JSON.stringify(backup, null, 2)
            );

            if (uploaded) {
                // Update last backup time
                const accountIndex = this.accounts.findIndex(a => a.id === account.id);
                if (accountIndex !== -1) {
                    this.accounts[accountIndex].lastBackup = new Date().toISOString();
                    this.saveAccounts();
                }

                // Clean old backups (keep last 10)
                await this.cleanOldBackups(account);

                return true;
            }

            return false;
        } catch (error) {
            console.error('Auto backup error:', error);
            return false;
        }
    }

    private createBackupData(includeCompleted: boolean) {
        const profiles = Storage.get<any[]>('profiles', []);
        const allCustomers = Storage.get<any[]>('customers', []);
        const allPayments = Storage.get<any[]>('payments', []);

        // Filter customers
        const customers = includeCompleted
            ? allCustomers
            : allCustomers.filter(c => c.status !== 'completed');

        // Filter payments for active customers only
        const customerIds = new Set(customers.map(c => c.id));
        const payments = allPayments.filter(p => customerIds.has(p.customerId));

        return {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            profiles,
            customers,
            payments,
            settings: Storage.get('app_settings', {}),
            excludedCompleted: !includeCompleted
        };
    }

    // ===== RESTORE =====

    async restoreFromDrive(fileId: string, driveEmail: string): Promise<boolean> {
        try {
            const account = this.accounts.find(a => a.email === driveEmail);
            if (!account) return false;

            // Check token
            if (Date.now() >= account.expiresAt - 300000) {
                await this.refreshToken(account);
            }

            // Download file
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                { headers: { 'Authorization': `Bearer ${account.accessToken}` } }
            );

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const backupData = await response.json();

            // Validate
            if (!backupData.version || !backupData.profiles) {
                throw new Error('Invalid backup file');
            }

            // Confirm restore
            const message = `Restore backup from ${new Date(backupData.exportDate).toLocaleString()}?\n\n` +
                `- ${backupData.profiles.length} profiles\n` +
                `- ${backupData.customers.length} active customers\n` +
                `- ${backupData.payments.length} payments\n\n` +
                `${backupData.excludedCompleted ? 'Note: Completed customers excluded' : 'Includes completed customers'}`;

            if (!confirm(message)) return false;

            // Restore data
            Storage.save('profiles', backupData.profiles);
            Storage.save('customers', backupData.customers);
            Storage.save('payments', backupData.payments);

            if (backupData.settings) {
                Storage.save('app_settings', backupData.settings);
            }

            if (backupData.profiles.length > 0) {
                Storage.save('currentProfile', backupData.profiles[0]);
            }

            return true;
        } catch (error) {
            console.error('Restore error:', error);
            return false;
        }
    }

    // ===== FILE OPERATIONS =====

    private async uploadFile(
        accessToken: string,
        folderId: string,
        fileName: string,
        content: string
    ): Promise<boolean> {
        try {
            const metadata = {
                name: fileName,
                mimeType: 'application/json',
                parents: [folderId]
            };

            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const closeDelimiter = "\r\n--" + boundary + "--";

            const body =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                content +
                closeDelimiter;

            const response = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body
                }
            );

            return response.ok;
        } catch (error) {
            console.error('Upload error:', error);
            return false;
        }
    }

    async listBackups(): Promise<BackupFile[]> {
        const backups: BackupFile[] = [];

        for (const account of this.accounts) {
            if (!account.isActive || !account.folderId) continue;

            try {
                // Refresh token if needed
                if (Date.now() >= account.expiresAt - 300000) {
                    await this.refreshToken(account);
                }

                const response = await fetch(
                    `https://www.googleapis.com/drive/v3/files?q='${account.folderId}' in parents and trashed=false&orderBy=createdTime desc&fields=files(id,name,size,createdTime)`,
                    { headers: { 'Authorization': `Bearer ${account.accessToken}` } }
                );

                const data = await response.json();

                if (data.files) {
                    backups.push(...data.files.map((f: any) => ({
                        ...f,
                        driveEmail: account.email
                    })));
                }
            } catch (error) {
                console.error(`Error listing backups for ${account.email}:`, error);
            }
        }

        return backups.sort((a, b) =>
            new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
        );
    }

    private async cleanOldBackups(account: DriveAccount): Promise<void> {
        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${account.folderId}' in parents and trashed=false&orderBy=createdTime desc&fields=files(id,createdTime)`,
                { headers: { 'Authorization': `Bearer ${account.accessToken}` } }
            );

            const data = await response.json();

            if (data.files && data.files.length > 10) {
                // Delete oldest backups
                const toDelete = data.files.slice(10);

                for (const file of toDelete) {
                    await fetch(
                        `https://www.googleapis.com/drive/v3/files/${file.id}`,
                        {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${account.accessToken}` }
                        }
                    );
                }

                console.log(`Cleaned ${toDelete.length} old backups`);
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    // ===== TOKEN MANAGEMENT =====

    private async refreshToken(account: DriveAccount): Promise<void> {
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
                    client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET!,
                    refresh_token: account.refreshToken,
                    grant_type: 'refresh_token'
                })
            });

            const data = await response.json();

            // Update account
            const index = this.accounts.findIndex(a => a.id === account.id);
            if (index !== -1) {
                this.accounts[index].accessToken = data.access_token;
                this.accounts[index].expiresAt = Date.now() + data.expires_in * 1000;
                this.saveAccounts();
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            throw error;
        }
    }

    // ===== HELPER METHODS =====

    private async exchangeAuthCode(code: string): Promise<any> {
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
                    client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET!,
                    redirect_uri: `${window.location.origin}/auth/callback`,
                    grant_type: 'authorization_code'
                })
            });

            return response.json();
        } catch (error) {
            console.error('Auth code exchange error:', error);
            return null;
        }
    }

    private async getUserInfo(accessToken: string): Promise<any> {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            return response.json();
        } catch (error) {
            console.error('Get user info error:', error);
            return null;
        }
    }

    private async getQuota(accessToken: string): Promise<{ used: number; total: number }> {
        try {
            const response = await fetch(
                'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );

            const data = await response.json();
            return {
                used: parseInt(data.storageQuota.usage || '0'),
                total: parseInt(data.storageQuota.limit || '0')
            };
        } catch (error) {
            console.error('Get quota error:', error);
            return { used: 0, total: 0 };
        }
    }

    // ===== AUTO BACKUP SCHEDULER =====

    startAutoBackup(intervalHours: number = 24) {
        // Backup every N hours
        setInterval(() => {
            this.autoBackup();
        }, intervalHours * 60 * 60 * 1000);

        // Initial backup after 5 minutes
        setTimeout(() => {
            this.autoBackup();
        }, 5 * 60 * 1000);
    }

    // ===== DRIVE SWITCHING =====

    async switchToNextDrive(): Promise<boolean> {
        const current = this.getActiveAccount();
        if (!current) return false;

        // Check if current drive is full (>90%)
        const usage = (current.quotaUsed / current.quotaTotal) * 100;

        if (usage > 90) {
            console.log(`Drive ${current.email} is ${usage.toFixed(1)}% full. Switching...`);

            // Find drive with most space
            const nextDrive = this.accounts
                .filter(a => a.id !== current.id && a.isActive)
                .reduce((best, acc) => {
                    const accSpace = acc.quotaTotal - acc.quotaUsed;
                    const bestSpace = best ? best.quotaTotal - best.quotaUsed : 0;
                    return accSpace > bestSpace ? acc : best;
                }, null as DriveAccount | null);

            if (nextDrive) {
                console.log(`Switched to ${nextDrive.email}`);
                return true;
            }

            console.warn('No alternative drive available!');
            return false;
        }

        return true;
    }
}

// Export singleton
export const driveManager = DriveManager.getInstance();