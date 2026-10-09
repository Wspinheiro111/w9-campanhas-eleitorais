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

export type StoredOfflineVisit = OfflineVisit & {
  ownerUserId: number;
  createdAt: string;
  expiresAt: string;
};

export type OfflineVisitSummary = { count: number; oldestCreatedAt: string | null };

export const OFFLINE_VISIT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const OFFLINE_VISIT_NOTES_MAX = 1000;
const DB_NAME = "w9-field-visits";
const STORE = "pending-visits";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "clientReference" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function prepareStoredOfflineVisit(ownerUserId: number, visit: OfflineVisit, now = new Date()): StoredOfflineVisit {
  if (!Number.isInteger(ownerUserId) || ownerUserId <= 0) throw new Error("Usuário local inválido para a fila offline.");
  return {
    ...visit,
    notes: visit.notes?.trim().slice(0, OFFLINE_VISIT_NOTES_MAX) || undefined,
    ownerUserId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + OFFLINE_VISIT_TTL_MS).toISOString(),
  };
}

export function isExpiredOfflineVisit(visit: Partial<StoredOfflineVisit>, now = new Date()) {
  if (!visit.ownerUserId || !visit.createdAt || !visit.expiresAt) return true;
  const expiresAt = Date.parse(visit.expiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= now.getTime();
}

export function summarizeOfflineVisits(visits: StoredOfflineVisit[]): OfflineVisitSummary {
  const oldest = visits.reduce<string | null>((current, visit) => !current || visit.createdAt < current ? visit.createdAt : current, null);
  return { count: visits.length, oldestCreatedAt: oldest };
}

async function readAll(db: IDBDatabase) {
  return new Promise<StoredOfflineVisit[]>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as StoredOfflineVisit[]);
    request.onerror = () => reject(request.error);
  });
}

async function cleanupExpiredInDb(db: IDBDatabase, now = new Date()) {
  const visits = await readAll(db);
  const expired = visits.filter(visit => isExpiredOfflineVisit(visit, now));
  if (!expired.length) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    expired.forEach(visit => tx.objectStore(STORE).delete(visit.clientReference));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueOfflineVisit(ownerUserId: number, visit: OfflineVisit) {
  const db = await openDb();
  await cleanupExpiredInDb(db);
  const stored = prepareStoredOfflineVisit(ownerUserId, visit);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(stored);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getQueuedVisits(ownerUserId: number) {
  const db = await openDb();
  await cleanupExpiredInDb(db);
  const visits = (await readAll(db)).filter(visit => visit.ownerUserId === ownerUserId);
  db.close();
  return visits;
}

export async function getOfflineVisitSummary(ownerUserId: number) {
  return summarizeOfflineVisits(await getQueuedVisits(ownerUserId));
}

export async function removeQueuedVisits(ownerUserId: number, references: string[]) {
  if (!references.length) return;
  const db = await openDb();
  const allowed = new Set(references);
  const visits = (await readAll(db)).filter(visit => visit.ownerUserId === ownerUserId && allowed.has(visit.clientReference));
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    visits.forEach(visit => tx.objectStore(STORE).delete(visit.clientReference));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearOfflineVisits(ownerUserId: number) {
  const db = await openDb();
  const visits = (await readAll(db)).filter(visit => visit.ownerUserId === ownerUserId || !visit.ownerUserId);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    visits.forEach(visit => tx.objectStore(STORE).delete(visit.clientReference));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
