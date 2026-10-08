// Preconfigured storage helpers for Manus WebDev templates.
// Uploads use Forge presigned URLs; every stored object must also receive
// persisted ownership/visibility metadata before its application URL is returned.

import { eq } from "drizzle-orm";
import { campaigns, storageObjects } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getDb } from "./db";

export type StorageObjectMetadataInput = {
  organizationId: number | null;
  campaignId: number | null;
  visibility: "private" | "public";
  resourceType: string;
  createdByUserId: number | null;
};

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function getStorageObjectMetadata(storageKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Storage metadata database unavailable");
  return (await db.select().from(storageObjects).where(eq(storageObjects.storageKey, normalizeKey(storageKey))).limit(1))[0] ?? null;
}

export async function registerStorageObjectMetadata(
  storageKey: string,
  metadata: StorageObjectMetadataInput,
) {
  const db = await getDb();
  if (!db) throw new Error("Storage metadata database unavailable");

  if (metadata.visibility === "private" && !metadata.organizationId) {
    throw new Error("Private storage objects require organization ownership");
  }

  if (metadata.campaignId !== null) {
    const campaign = (await db
      .select({ organizationId: campaigns.organizationId })
      .from(campaigns)
      .where(eq(campaigns.id, metadata.campaignId))
      .limit(1))[0];
    if (!campaign || campaign.organizationId !== metadata.organizationId) {
      throw new Error("Storage campaign ownership mismatch");
    }
  }

  await db.insert(storageObjects).values({
    storageKey: normalizeKey(storageKey),
    organizationId: metadata.organizationId,
    campaignId: metadata.campaignId,
    visibility: metadata.visibility,
    resourceType: metadata.resourceType,
    createdByUserId: metadata.createdByUserId,
  });
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
  metadata: StorageObjectMetadataInput,
): Promise<{ key: string; url: string }> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    throw new Error(`Storage presign failed (${presignResp.status})`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([new Uint8Array(data)], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  // Fail closed: an uploaded object without ownership metadata is intentionally
  // not returned as an application-accessible URL.
  await registerStorageObjectMetadata(key, metadata);

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

/**
 * Server-only signed URL helper. It refuses unknown/unregistered keys, but does
 * not replace user authorization at HTTP boundaries.
 */
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);
  const metadata = await getStorageObjectMetadata(key);
  if (!metadata) throw new Error("Storage object metadata missing");

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    throw new Error(`Storage signed URL failed (${resp.status})`);
  }

  const { url } = (await resp.json()) as { url: string };
  if (!url) throw new Error("Forge returned empty signed URL");
  return url;
}
