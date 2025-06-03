import { useState, useCallback } from "react";
import { PatrolLog } from "@shared/schema";
import { openDB, IDBPDatabase } from "idb";
import { apiRequest } from "@/lib/queryClient";

interface OfflinePatrolLog extends Omit<PatrolLog, 'id' | 'syncedAt'> {
  id?: number;
  timestamp: Date;
}

interface OfflineStats {
  logs: number;
  sites: number;
  storage: string;
}

const DB_NAME = 'GuardPatrolDB';
const DB_VERSION = 1;
const LOGS_STORE = 'patrol_logs';
const SITES_STORE = 'patrol_sites';

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create patrol logs store
        if (!db.objectStoreNames.contains(LOGS_STORE)) {
          const logsStore = db.createObjectStore(LOGS_STORE, {
            keyPath: 'id',
            autoIncrement: true,
          });
          logsStore.createIndex('timestamp', 'timestamp');
          logsStore.createIndex('deviceId', 'deviceId');
          logsStore.createIndex('siteId', 'siteId');
        }

        // Create patrol sites store
        if (!db.objectStoreNames.contains(SITES_STORE)) {
          const sitesStore = db.createObjectStore(SITES_STORE, {
            keyPath: 'id',
          });
        }
      },
    });
  }
  return dbPromise;
};

export function useOfflineStorage() {
  const [isLoading, setIsLoading] = useState(false);

  const storeLogs = useCallback(async (logs: OfflinePatrolLog[]) => {
    try {
      const db = await getDB();
      const tx = db.transaction(LOGS_STORE, 'readwrite');
      
      for (const log of logs) {
        await tx.store.add(log);
      }
      
      await tx.done;
    } catch (error) {
      console.error('Failed to store logs offline:', error);
      throw error;
    }
  }, []);

  const getOfflineLogs = useCallback(async (): Promise<OfflinePatrolLog[]> => {
    try {
      const db = await getDB();
      return await db.getAll(LOGS_STORE);
    } catch (error) {
      console.error('Failed to get offline logs:', error);
      return [];
    }
  }, []);

  const syncOfflineLogs = useCallback(async () => {
    if (!navigator.onLine) {
      return;
    }

    setIsLoading(true);

    try {
      const offlineLogs = await getOfflineLogs();
      
      if (offlineLogs.length === 0) {
        setIsLoading(false);
        return;
      }

      // Convert logs to the format expected by the API
      const logsToSync = offlineLogs.map(log => ({
        siteId: log.siteId,
        deviceId: log.deviceId,
        action: log.action,
        latitude: log.latitude,
        longitude: log.longitude,
        accuracy: log.accuracy,
        isWithinGeofence: log.isWithinGeofence,
      }));

      // Sync with server
      await apiRequest('POST', '/api/sync-logs', { logs: logsToSync });

      // Clear synced logs from IndexedDB
      const db = await getDB();
      const tx = db.transaction(LOGS_STORE, 'readwrite');
      await tx.store.clear();
      await tx.done;

    } catch (error) {
      console.error('Failed to sync offline logs:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getOfflineLogs]);

  const clearOfflineData = useCallback(async () => {
    try {
      const db = await getDB();
      
      // Clear all stores
      const tx = db.transaction([LOGS_STORE, SITES_STORE], 'readwrite');
      await tx.objectStore(LOGS_STORE).clear();
      await tx.objectStore(SITES_STORE).clear();
      await tx.done;
      
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, []);

  const getOfflineStats = useCallback(async (): Promise<OfflineStats> => {
    try {
      const db = await getDB();
      
      const logsCount = await db.count(LOGS_STORE);
      const sitesCount = await db.count(SITES_STORE);
      
      // Estimate storage size (rough calculation)
      const allLogs = await db.getAll(LOGS_STORE);
      const allSites = await db.getAll(SITES_STORE);
      const dataSize = JSON.stringify([...allLogs, ...allSites]).length;
      
      let storageText = '0 KB';
      if (dataSize > 1024 * 1024) {
        storageText = `${(dataSize / (1024 * 1024)).toFixed(1)} MB`;
      } else if (dataSize > 1024) {
        storageText = `${(dataSize / 1024).toFixed(1)} KB`;
      } else {
        storageText = `${dataSize} B`;
      }
      
      return {
        logs: logsCount,
        sites: sitesCount,
        storage: storageText,
      };
    } catch (error) {
      console.error('Failed to get offline stats:', error);
      return { logs: 0, sites: 0, storage: '0 KB' };
    }
  }, []);

  return {
    storeLogs,
    getOfflineLogs,
    syncOfflineLogs,
    clearOfflineData,
    getOfflineStats,
    isLoading,
  };
}
