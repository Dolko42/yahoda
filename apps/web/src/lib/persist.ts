import { type DesignSystem, parseDesignSystem } from "@yahoda/core";

/**
 * Minimal IndexedDB persistence (no deps). Stores the whole DesignSystem — working set,
 * published snapshot, draft, and history — under one key so the workspace survives
 * reloads. Fully defensive: any failure degrades to in-memory only.
 */

const DB_NAME = "yahoda";
const STORE = "workspace";
const KEY = "current";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadPersisted(): Promise<DesignSystem | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDB();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
      tx.onsuccess = () => resolve(tx.result);
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    if (!raw) return null;
    return parseDesignSystem(raw); // validate/migrate at the boundary
  } catch {
    return null;
  }
}

export async function savePersisted(ds: DesignSystem): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(JSON.parse(JSON.stringify(ds)), KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore — persistence is best-effort */
  }
}

export async function clearPersisted(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    /* ignore */
  }
}
