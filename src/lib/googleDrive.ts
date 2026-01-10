// src/lib/googleDrive.ts - Multi-Cloud Backup System

export interface DriveAccount {
    id: string;
    email: string;
    name: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    quotaUsed: number;
    quotaTotal: number;
    addedAt: string;
}

export interface DriveFile {
    id: string;
    name: string;
    size: number;
    createdTime: string;
    modifiedTime: string;
    mimeType: string;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';

export const GoogleDriveService = {
    /**
     * Get all connected Google Drive accounts
     */
    getAccounts: (): DriveAccount[] => {
        if (typeof window === 'undefined') return [];

        try {
            const stored = localStorage.getItem('drive_accounts');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    },

    /**
     * Add new Google Drive account
     */
    addAccount: (account: DriveAccount): boolean => {
        try {
            const accounts = GoogleDriveService.getAccounts();

            // Check if account already exists
            const exists = accounts.some(a => a.email === account.email);
            if (exists) {
                console.warn('Account already connected');
                return false;
            }

            accounts.push(account);
            localStorage.setItem('drive_accounts', JSON.stringify(accounts));
            return true;
        } catch (error) {
            console.error('Failed to add account:', error);
            return false;
        }
    },

    /**
     * Remove Google Drive account
     */
    removeAccount: (accountId: string): boolean => {
        try {
            const accounts = GoogleDriveService.getAccounts();
            const filtered = accounts.filter(a => a.id !== accountId);
            localStorage.setItem('drive_accounts', JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('Failed to remove account:', error);
            return false;
        }
    },

    /**
     * Get account with most available space
     */
    getAccountWithMostSpace: (): DriveAccount | null => {
        const accounts = GoogleDriveService.getAccounts();
        if (accounts.length === 0) return null;

        return accounts.reduce((best, current) => {
            const currentAvailable = current.quotaTotal - current.quotaUsed;
            const bestAvailable = best.quotaTotal - best.quotaUsed;
            return currentAvailable > bestAvailable ? current : best;
        });
    },

    /**
     * Upload file to Google Drive
     */
    uploadFile: async (
        account: DriveAccount,
        fileName: string,
        content: string,
        mimeType: string = 'application/json'
    ): Promise<DriveFile | null> => {
        try {
            // Create metadata
            const metadata = {
                name: fileName,
                mimeType: mimeType,
                parents: ['root'] // Upload to root folder
            };

            // Create multipart request
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const closeDelimiter = "\r\n--" + boundary + "--";

            const body =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                `Content-Type: ${mimeType}\r\n\r\n` +
                content +
                closeDelimiter;

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${account.accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`
                },
                body: body
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();

            return {
                id: data.id,
                name: data.name,
                size: parseInt(data.size || '0'),
                createdTime: data.createdTime,
                modifiedTime: data.modifiedTime,
                mimeType: data.mimeType
            };
        } catch (error) {
            console.error('Upload error:', error);
            return null;
        }
    },

    /**
     * List backup files in Google Drive
     */
    listFiles: async (account: DriveAccount, query?: string): Promise<DriveFile[]> => {
        try {
            const searchQuery = query || "name contains 'ma-backup-'";
            const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name,size,createdTime,modifiedTime,mimeType)&orderBy=createdTime desc`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${account.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`List files failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.files || [];
        } catch (error) {
            console.error('List files error:', error);
            return [];
        }
    },

    /**
     * Download file from Google Drive
     */
    downloadFile: async (account: DriveAccount, fileId: string): Promise<string | null> => {
        try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${account.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }

            return await response.text();
        } catch (error) {
            console.error('Download error:', error);
            return null;
        }
    },

    /**
     * Delete file from Google Drive
     */
    deleteFile: async (account: DriveAccount, fileId: string): Promise<boolean> => {
        try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${account.accessToken}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Delete error:', error);
            return false;
        }
    },

    /**
     * Get account quota information
     */
    getQuota: async (account: DriveAccount): Promise<{ used: number; total: number } | null> => {
        try {
            const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
                headers: {
                    'Authorization': `Bearer ${account.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Get quota failed: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                used: parseInt(data.storageQuota.usage || '0'),
                total: parseInt(data.storageQuota.limit || '0')
            };
        } catch (error) {
            console.error('Get quota error:', error);
            return null;
        }
    },

    /**
     * Refresh access token
     */
    refreshAccessToken: async (account: DriveAccount): Promise<string | null> => {
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    refresh_token: account.refreshToken,
                    grant_type: 'refresh_token'
                })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();

            // Update account with new token
            const accounts = GoogleDriveService.getAccounts();
            const index = accounts.findIndex(a => a.id === account.id);

            if (index !== -1) {
                accounts[index].accessToken = data.access_token;
                accounts[index].expiresAt = Date.now() + (data.expires_in * 1000);
                localStorage.setItem('drive_accounts', JSON.stringify(accounts));
            }

            return data.access_token;
        } catch (error) {
            console.error('Token refresh error:', error);
            return null;
        }
    },

    /**
     * Check if token needs refresh
     */
    needsTokenRefresh: (account: DriveAccount): boolean => {
        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() >= (account.expiresAt - fiveMinutes);
    },

    /**
     * Get all backup files across all accounts
     */
    listBackupFiles: (): Array<{ account: DriveAccount; files: DriveFile[] }> => {
        const accounts = GoogleDriveService.getAccounts();
        return accounts.map(account => ({
            account,
            files: [] // This would be populated by calling listFiles for each account
        }));
    },

    /**
     * Get total backup size across all accounts
     */
    getTotalBackupSize: (): number => {
        // This would sum up all backup files across accounts
        return 0;
    }
};