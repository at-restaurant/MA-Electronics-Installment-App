import { useCallback, useEffect, useState } from 'react';
import { offlineStorage } from '@/lib/offlineStorage';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

export const useSyncManager = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { setOnlineStatus } = useAppStore();

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  const syncData = useCallback(async () => {
    if (! navigator.onLine) {
      setSyncError('You are offline. Data will sync when online.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const syncQueue = await offlineStorage.getSyncQueue();

      for (const item of syncQueue) {
        try {
          if (item.action === 'create') {
            await supabase.from(item.table).insert([item.data]);
          } else if (item. action === 'update') {
            await supabase.from(item.table).update(item.data).eq('id', item.data.id);
          } else if (item.action === 'delete') {
            await supabase.from(item.table).delete().eq('id', item.data.id);
          }

          await offlineStorage.removeSyncQueueItem(item.id);
        } catch (error) {
          console.error(`Failed to sync ${item.table}:`, error);
        }
      }

      if (syncQueue.length > 0) {
        await offlineStorage.setLastSync(Date.now());
      }
    } catch (error) {
      setSyncError('Failed to sync data. Please try again.');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isSyncing,
    syncError,
    syncData,
  };
};