import { eq, or } from "drizzle-orm";
import {
  audioCrmLogs,
  campaignCertificateSettings,
  campaignContents,
  campaignLegalDocuments,
  fieldPlaybookMaterials,
} from "../drizzle/schema";
import { getDb } from "./db";

export type StoredAssetScope = {
  campaignId: number;
  organizationId: number;
  kind: "campaign_content" | "legal_document" | "playbook_material" | "audio_crm" | "certificate_asset";
  visibility: "private" | "public";
};

function proxyUrlForKey(key: string) {
  return `/manus-storage/${key}`;
}

export async function resolveStoredAssetScope(key: string): Promise<StoredAssetScope | null> {
  const db = await getDb();
  if (!db) throw new Error("STORAGE_AUTH_DB_UNAVAILABLE");

  const content = await db
    .select({ campaignId: campaignContents.campaignId, organizationId: campaignContents.organizationId })
    .from(campaignContents)
    .where(eq(campaignContents.assetKey, key))
    .limit(1);
  if (content[0]) return { ...content[0], kind: "campaign_content", visibility: "private" };

  const legal = await db
    .select({ campaignId: campaignLegalDocuments.campaignId, organizationId: campaignLegalDocuments.organizationId })
    .from(campaignLegalDocuments)
    .where(eq(campaignLegalDocuments.storageKey, key))
    .limit(1);
  if (legal[0]) return { ...legal[0], kind: "legal_document", visibility: "private" };

  const playbook = await db
    .select({ campaignId: fieldPlaybookMaterials.campaignId, organizationId: fieldPlaybookMaterials.organizationId })
    .from(fieldPlaybookMaterials)
    .where(eq(fieldPlaybookMaterials.storageKey, key))
    .limit(1);
  if (playbook[0]) return { ...playbook[0], kind: "playbook_material", visibility: "private" };

  const proxyUrl = proxyUrlForKey(key);
  const audio = await db
    .select({ campaignId: audioCrmLogs.campaignId, organizationId: audioCrmLogs.organizationId })
    .from(audioCrmLogs)
    .where(eq(audioCrmLogs.audioUrl, proxyUrl))
    .limit(1);
  if (audio[0]) return { ...audio[0], kind: "audio_crm", visibility: "private" };

  const certificate = await db
    .select({ campaignId: campaignCertificateSettings.campaignId, organizationId: campaignCertificateSettings.organizationId })
    .from(campaignCertificateSettings)
    .where(or(eq(campaignCertificateSettings.logoUrl, proxyUrl), eq(campaignCertificateSettings.signatureImageUrl, proxyUrl)))
    .limit(1);
  if (certificate[0]) return { ...certificate[0], kind: "certificate_asset", visibility: "public" };

  return null;
}
