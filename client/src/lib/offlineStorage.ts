// Offline storage utility for ProMo-G PWA

// Type declarations for Background Sync API
declare global {
  interface ServiceWorkerRegistration {
    sync: SyncManager;
  }

  interface SyncManager {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  }

  interface WindowEventMap {
    'sync': SyncEvent;
  }

  interface ExtendableEvent extends Event {
    waitUntil(promise: Promise<any>): void;
  }

  interface SyncEvent extends ExtendableEvent {
    tag: string;
    lastChance: boolean;
  }
}

export class OfflineStorage {
  private dbName = 'PromoGOffline';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('submissions')) {
          const submissionStore = db.createObjectStore('submissions', {
            keyPath: 'id',
            autoIncrement: true
          });
          submissionStore.createIndex('timestamp', 'timestamp', { unique: false });
          submissionStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains('userData')) {
          const userStore = db.createObjectStore('userData', {
            keyPath: 'key'
          });
          userStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('notifications')) {
          const notificationStore = db.createObjectStore('notifications', {
            keyPath: 'id'
          });
          notificationStore.createIndex('timestamp', 'timestamp', { unique: false });
          notificationStore.createIndex('isRead', 'isRead', { unique: false });
        }
      };
    });
  }

  // Task submission methods
  async saveOfflineSubmission(data: any): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['submissions'], 'readwrite');
      const store = transaction.objectStore('submissions');

      const submission = {
        data,
        timestamp: Date.now(),
        type: 'task-submission',
        synced: false
      };

      const request = store.add(submission);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineSubmissions(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['submissions'], 'readonly');
      const store = transaction.objectStore('submissions');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeOfflineSubmission(id: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['submissions'], 'readwrite');
      const store = transaction.objectStore('submissions');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // User data caching methods
  async cacheUserData(key: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['userData'], 'readwrite');
      const store = transaction.objectStore('userData');

      const userData = {
        key,
        data,
        timestamp: Date.now()
      };

      const request = store.put(userData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedUserData(key: string): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['userData'], 'readonly');
      const store = transaction.objectStore('userData');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Check if data is not too old (24 hours)
          const isExpired = Date.now() - result.timestamp > 24 * 60 * 60 * 1000;
          resolve(isExpired ? null : result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Notification methods
  async cacheNotifications(notifications: any[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');

      // Clear old notifications first
      store.clear();

      let completed = 0;
      const total = notifications.length;

      if (total === 0) {
        resolve();
        return;
      }

      notifications.forEach(notification => {
        const request = store.put({
          ...notification,
          timestamp: Date.now()
        });

        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };

        request.onerror = () => reject(request.error);
      });
    });
  }

  async getCachedNotifications(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['notifications'], 'readonly');
      const store = transaction.objectStore('notifications');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Network status methods
  isOnline(): boolean {
    return navigator.onLine;
  }

  onNetworkChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  // Background sync registration
  async registerBackgroundSync(tag: string): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(tag);
        console.log(`Background sync registered: ${tag}`);
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  // Service worker messaging
  async sendMessageToSW(message: any): Promise<any> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        return new Promise((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => resolve(event.data);
          registration.active!.postMessage(message, [channel.port2]);
        });
      }
    }
    return null;
  }

  // Clear all offline data
  async clearOfflineData(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['submissions', 'userData', 'notifications'], 'readwrite');
      
      const submissionStore = transaction.objectStore('submissions');
      const userStore = transaction.objectStore('userData');
      const notificationStore = transaction.objectStore('notifications');

      Promise.all([
        new Promise(res => {
          const req = submissionStore.clear();
          req.onsuccess = () => res(true);
        }),
        new Promise(res => {
          const req = userStore.clear();
          req.onsuccess = () => res(true);
        }),
        new Promise(res => {
          const req = notificationStore.clear();
          req.onsuccess = () => res(true);
        })
      ]).then(() => resolve()).catch(reject);
    });
  }

  // Get storage usage
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { used: 0, quota: 0 };
  }
}

// Create singleton instance
export const offlineStorage = new OfflineStorage();

// Initialize on module load
offlineStorage.init().catch(console.error);

// Hook for React components
export const useOfflineStorage = () => {
  return {
    storage: offlineStorage,
    isOnline: navigator.onLine
  };
};

// Utility functions
export const withOfflineSupport = async <T>(
  networkCall: () => Promise<T>,
  fallbackData?: T,
  cacheKey?: string
): Promise<T> => {
  try {
    const result = await networkCall();
    
    // Cache successful result if cache key provided
    if (cacheKey) {
      await offlineStorage.cacheUserData(cacheKey, result);
    }
    
    return result;
  } catch (error) {
    console.warn('Network call failed, trying offline data:', error);
    
    // Try to get cached data
    if (cacheKey) {
      const cachedData = await offlineStorage.getCachedUserData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Return fallback data if available
    if (fallbackData !== undefined) {
      return fallbackData;
    }
    
    // Re-throw error if no offline options
    throw error;
  }
};