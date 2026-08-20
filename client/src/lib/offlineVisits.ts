export type OfflineVisit = {
  campaignId: number;
  voterId?: number;
  playbookId?: number;
  memberId?: number | null;
  clientReference: string;
  outcome: "contacted" | "absent" | "refused" | "follow_up" | "other";
  notes?: string;
  occurredAt: string;
};

const DB_NAME = "w9-field-visits";
const STORE = "pending-visits";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "clientReference" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineVisit(visit: OfflineVisit) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(visit); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
}

export async function getQueuedVisits() {
  const db = await openDb();
  const visits = await new Promise<OfflineVisit[]>((resolve, reject) => { const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  db.close(); return visits;
}

export async function removeQueuedVisits(references: string[]) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); references.forEach(reference => tx.objectStore(STORE).delete(reference)); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
}
