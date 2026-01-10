// src/app/drive/page.tsx - Google Drive Management Page

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Cloud, Plus, Trash2, RefreshCw, Download, Upload,
    CheckCircle, AlertCircle, HardDrive, ArrowLeft
} from 'lucide-react';
import { driveManager } from '@/lib/driveManager';
import Navigation from '@/components/Navigation';

interface DriveAccount {
    id: string;
    email: string;
    name: string;
    quotaUsed: number;
    quotaTotal: number;
    isActive: boolean;
    lastBackup?: string;
}

interface BackupFile {
    id: string;
    name: string;
    size: number;
    createdTime: string;
    driveEmail: string;
}

export default function DriveManagementPage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<DriveAccount[]>([]);
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [backingUp, setBackingUp] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const accs = driveManager.getAccounts();
        setAccounts(accs);

        if (accs.length > 0) {
            const files = await driveManager.listBackups();
            setBackups(files);
        }

        setLoading(false);
    };

    const handleConnectDrive = () => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

        if (!clientId) {
            alert('Google Drive is not configured. Please contact administrator.');
            return;
        }

        const redirectUri = `${window.location.origin}/auth/callback`;
        const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(scope)}&` +
            `access_type=offline&` +
            `prompt=consent`;

        window.location.href = authUrl;
    };

    const handleRemoveAccount = async (accountId: string) => {
        if (!confirm('Remove this Google Drive account? Backups will remain in Drive.')) {
            return;
        }

        driveManager.removeAccount(accountId);
        await loadData();
    };

    const handleBackupNow = async () => {
        setBackingUp(true);
        const success = await driveManager.autoBackup();

        if (success) {
            alert('✅ Backup uploaded successfully!');
            await loadData();
        } else {
            alert('❌ Backup failed! Please check your connection.');
        }

        setBackingUp(false);
    };

    const handleRestore = async (fileId: string, driveEmail: string) => {
        if (!confirm('⚠️ Restore from this backup? Current data will be replaced!')) {
            return;
        }

        setLoading(true);
        const success = await driveManager.restoreFromDrive(fileId, driveEmail);

        if (success) {
            alert('✅ Data restored successfully!');
            window.location.reload();
        } else {
            alert('❌ Restore failed!');
        }

        setLoading(false);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Google Drive</h1>
                        <p className="text-sm text-gray-500">Multi-account cloud backup</p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleConnectDrive}
                        disabled={loading}
                        className="py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Connect Drive
                    </button>

                    <button
                        onClick={handleBackupNow}
                        disabled={backingUp || accounts.length === 0}
                        className="py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Upload className="w-5 h-5" />
                        {backingUp ? 'Backing up...' : 'Backup Now'}
                    </button>
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Connect multiple Google Drive accounts</li>
                        <li>• Automatic backup every 24 hours</li>
                        <li>• Auto-switch when drive is 90% full</li>
                        <li>• Completed customers excluded from backups</li>
                        <li>• Last 10 backups kept per drive</li>
                    </ul>
                </div>

                {/* Connected Accounts */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-blue-600" />
                        Connected Accounts ({accounts.length})
                    </h3>

                    {accounts.length === 0 ? (
                        <div className="text-center py-8">
                            <Cloud className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 mb-4">No accounts connected</p>
                            <button
                                onClick={handleConnectDrive}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                            >
                                Connect First Account
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {accounts.map(account => {
                                const usagePercent = Math.round((account.quotaUsed / account.quotaTotal) * 100);
                                const usedGB = (account.quotaUsed / (1024 ** 3)).toFixed(1);
                                const totalGB = (account.quotaTotal / (1024 ** 3)).toFixed(0);

                                return (
                                    <div key={account.id} className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <Cloud className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{account.name}</p>
                                                    <p className="text-sm text-gray-500">{account.email}</p>
                                                    {account.lastBackup && (
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            Last backup: {formatDate(account.lastBackup)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleRemoveAccount(account.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Storage Bar */}
                                        <div>
                                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                <span>Storage: {usedGB} GB / {totalGB} GB</span>
                                                <span>{usagePercent}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${
                                                        usagePercent > 90 ? 'bg-red-500' :
                                                            usagePercent > 70 ? 'bg-orange-500' : 'bg-green-500'
                                                    }`}
                                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        {account.isActive && (
                                            <div className="mt-3 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                <span className="text-sm text-green-600 font-medium">
                                                    Active
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Available Backups */}
                {backups.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <HardDrive className="w-5 h-5 text-purple-600" />
                            Available Backups ({backups.length})
                        </h3>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {backups.map(backup => (
                                <div key={backup.id} className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm mb-1">{backup.name}</p>
                                            <div className="text-xs text-gray-500 space-y-1">
                                                <p>📧 {backup.driveEmail}</p>
                                                <p>📅 {formatDate(backup.createdTime)}</p>
                                                <p>💾 {formatBytes(backup.size)}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRestore(backup.id, backup.driveEmail)}
                                            disabled={loading}
                                            className="ml-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Warning */}
                {accounts.length === 0 && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-amber-900 mb-1">No backup protection</p>
                                <p className="text-sm text-amber-700">
                                    Connect at least one Google Drive account to protect your data from loss.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Navigation currentPage="settings" />
        </div>
    );
}