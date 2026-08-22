const DB_NAME = 'LoviraLifeDB';
const DB_VERSION = 1;
const RESOURCE_STORE = 'resources';

export interface StoredResourceBlob {
  id: string;
  sessionId: string;
  dataUrl: string; // Base64 data URL
  mimeType: string;
  createdAt: string;
}

class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(RESOURCE_STORE)) {
          const store = db.createObjectStore(RESOURCE_STORE, { keyPath: 'id' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  async saveResourceBlob(resource: StoredResourceBlob): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(RESOURCE_STORE, 'readwrite');
        const store = tx.objectStore(RESOURCE_STORE);
        const req = store.put(resource);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to save blob to IndexedDB, fallback to memory', e);
    }
  }

  async getResourceBlob(id: string): Promise<StoredResourceBlob | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(RESOURCE_STORE, 'readonly');
        const store = tx.objectStore(RESOURCE_STORE);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return null;
    }
  }

  async getSessionResourceBlobs(sessionId: string): Promise<StoredResourceBlob[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(RESOURCE_STORE, 'readonly');
        const store = tx.objectStore(RESOURCE_STORE);
        const index = store.index('sessionId');
        const req = index.getAll(sessionId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return [];
    }
  }

  async deleteResourceBlob(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(RESOURCE_STORE, 'readwrite');
        const store = tx.objectStore(RESOURCE_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to delete resource blob from IndexedDB', e);
    }
  }

  async deleteSessionBlobs(sessionId: string): Promise<void> {
    try {
      const blobs = await this.getSessionResourceBlobs(sessionId);
      if (blobs.length === 0) return;
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(RESOURCE_STORE, 'readwrite');
        const store = tx.objectStore(RESOURCE_STORE);
        blobs.forEach((b) => store.delete(b.id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Failed to delete session blobs from IndexedDB', e);
    }
  }
}

export const indexedDbService = new IndexedDbService();
