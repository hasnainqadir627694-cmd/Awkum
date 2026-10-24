/**
 * AWKUM ClassHub — Offline-First IndexedDB Caching Layer
 * Provides robust client-side persistence for schedules, assignments, documents, and notices
 * ensuring full offline accessibility in the Student Portal.
 */

const DB_NAME = 'awkum_classhub_offline_db';
const DB_VERSION = 1;
const STORE_NAMES = ['schedules', 'assignments', 'documents', 'notices', 'profile'] as const;

export type StoreName = (typeof STORE_NAMES)[number];

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      STORE_NAMES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
}

/**
 * Save an item or list of items to an offline store
 */
export async function cacheOfflineData<T extends { id: string }>(
  storeName: StoreName,
  items: T | T[]
): Promise<void> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const arrayItems = Array.isArray(items) ? items : [items];
      arrayItems.forEach((item) => {
        store.put({
          ...item,
          _cachedAt: Date.now(),
        });
      });
    });
  } catch (err) {
    console.info('[Offline Cache] Save error:', err);
  }
}

/**
 * Retrieve all cached items from a store
 */
export async function getCachedOfflineData<T>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.info('[Offline Cache] Read error:', err);
    return [];
  }
}

/**
 * Clear cached store
 */
export async function clearOfflineStore(storeName: StoreName): Promise<void> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.info('[Offline Cache] Clear error:', err);
  }
}
