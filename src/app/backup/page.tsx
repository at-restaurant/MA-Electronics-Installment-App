"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Cloud, Download, Upload, Trash2, ArrowLeft, HardDrive,
    CheckCircle, AlertCircle, Clock, Plus, RefreshCw
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import { Storage } from '@/lib/storage';
import { BackupService } from '@/lib/backup';
import { GoogleDriveService, type DriveAccount } from '@/lib/googleDrive';
import { formatDate } from '@/lib/utils';
import type { Profile } from '@/types';

export default function BackupPage() {
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [driveAccounts, setDriveAccounts] = useState<DriveAccount[]>([]);
    const [lastBackup, setLastBackup] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [backupStats, setBackupStats] = useState({
        totalBackups: 0,
        totalSize: 0,
        connectedAccounts: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const profile = Storage.get<Profile | null>('currentProfile', null);
        if (!profile) {
            router.push('/');
            return;
        }

        setCurrentProfile(profile);

        // Load connected drive accounts
        const accounts = GoogleDriveService.getAccounts();
        setDriveAccounts(accounts);

        // Load last backup info
        const backup = BackupService.getLastBackupInfo();
        setLastBackup(backup);

        // Load backup stats
        const stats = BackupService.getBackupStats();
        setBackupStats(stats);
    };

    const handleLocalBackup = () => {
        setLoading(true);
        try {
            BackupService.exportToFile();
            alert('✅ Backup downloaded successfully!');
        } catch (error) {
            alert('❌ Backup failed! Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDriveBackup = async (account?: DriveAccount) => {
        setLoading(true);
        try {
            const success = await BackupService.backupToDrive(account);
            if (success) {
                alert('✅ Backup uploaded to Google Drive!');
                loadData();
            } else {
                alert('❌ Drive backup failed! Please try again.');
            }
        } catch (error) {
            alert('❌ Drive backup failed! Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreFromFile = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            setLoading(true);
            try {
                const success = await BackupService.restoreFromFile(file);
                if (success) {
                    alert('✅ Backup restored successfully!');
                    window.location.reload();
                }
            } catch (error) {
                alert('❌ Restore failed! Invalid backup file.');
            } finally {
                setLoading(false);
            }
        };

        input.click();
    };

    const handleConnectDrive = () => {
        alert('🔐 Google Drive OAuth integration coming soon!\n\nFor now, you can:\n- Export local backups\n- Import backup files\n- Manage multiple backup versions');
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    if (!currentProfile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">Backup & Restore</h1>
                            <p className="text-sm text-gray-500">Secure your data</p>
                        </div>
                    </div>
                    <ProfileSwitcher currentProfile={currentProfile} onProfileChange={loadData} />
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Last Backup Info */}
                {lastBackup && (
                    <div className="bg-green-50 rounded-2xl p-4 border-2 border-green-200">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-green-900 mb-1">Last Backup</h3>
                                <p className="text-sm text-green-700">
                                    {formatDate(lastBackup.date)} • {formatBytes(lastBackup.size)}
                                </p>
                                <p className="text-xs text-green-600 mt-1">{lastBackup.fileName}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Backup Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <Cloud className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{backupStats.connectedAccounts}</p>
                        <p className="text-xs text-gray-600">Drive Accounts</p>
                    </div>

                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <HardDrive className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{backupStats.totalBackups}</p>
                        <p className="text-xs text-gray-600">Total Backups</p>
                    </div>

                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{formatBytes(backupStats.totalSize)}</p>
                        <p className="text-xs text-gray-600">Total Size</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3">Quick Backup</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleLocalBackup}
                            disabled={loading}
                            className="py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Download className="w-5 h-5" />
                            Local Backup
                        </button>

                        <button
                            onClick={handleRestoreFromFile}
                            disabled={loading}
                            className="py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Upload className="w-5 h-5" />
                            Restore
                        </button>
                    </div>
                </div>

                {/* Google Drive Accounts */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Google Drive Accounts</h3>
                        <button
                            onClick={handleConnectDrive}
                            className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Add Account
                        </button>
                    </div>

                    {driveAccounts.length === 0 ? (
                        <div className="text-center py-8">
                            <Cloud className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 mb-2">No accounts connected</p>
                            <p className="text-sm text-gray-400 mb-4">
                                Connect Google Drive to enable automatic cloud backups
                            </p>
                            <button
                                onClick={handleConnectDrive}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                            >
                                Connect Google Drive
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {driveAccounts.map(account => {
                                const available = account.quotaTotal - account.quotaUsed;
                                const usagePercent = Math.round((account.quotaUsed / account.quotaTotal) * 100);

                                return (
                                    <div key={account.id} className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <Cloud className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{account.name}</p>
                                                    <p className="text-sm text-gray-500">{account.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDriveBackup(account)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                <span>Storage: {formatBytes(account.quotaUsed)} / {formatBytes(account.quotaTotal)}</span>
                                                <span>{usagePercent}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${
                                                        usagePercent > 80 ? 'bg-red-500' :
                                                            usagePercent > 60 ? 'bg-orange-500' : 'bg-green-500'
                                                    }`}
                                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Auto Backup Settings */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-3">Auto Backup Settings</h3>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Auto Backup</p>
                                <p className="text-sm text-gray-500">Backup when storage is 70% full</p>
                            </div>
                            <input
                                type="checkbox"
                                defaultChecked
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                        </label>

                        <label className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Daily Backup</p>
                                <p className="text-sm text-gray-500">Schedule daily backups at 2 AM</p>
                            </div>
                            <input
                                type="checkbox"
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                        </label>
                    </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-900 mb-1">Important</p>
                            <p className="text-sm text-amber-700">
                                Regular backups protect your data. We recommend backing up at least once a week.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Navigation currentPage="backup" />
        </div>
    );
}