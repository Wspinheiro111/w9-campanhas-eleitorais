import { createHash, createHmac, randomBytes } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import { createPool, type Pool, type RowDataPacket } from "mysql2/promise";
import { campaigns, volunteers } from "../drizzle/schema";
import { ENV } from "./_core/env";
import * as campaignDb from "./campaignDb";
import { getDb } from "./db";

const DEFAULT_PORTAL_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const TEST_HMAC_KEY = "w9-public-abuse-test-only";

export class PublicRateLimitError extends Error {
  constructor() {
    super("PUBLIC_RATE_LIMITED");
  }
}

export class PublicFormRejectedError extends Error {
  constructor() {
    super("PUBLIC_FORM_REJECTED");
  }
}

export function normalizePublicEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePublicPhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits || null;
}

function hmacKey() {
  const configured = ENV.cookieSecret || process.env.JWT_SECRET || "";
  if (configured) return configured;
  if (process.env.NODE_ENV === "test") return TEST_HMAC_KEY;
  throw new Error("PUBLIC_ABUSE_HMAC_KEY_REQUIRED");
}

export function hashPublicSignal(value: string) {
  return createHmac("sha256", hmacKey()).update(value).digest("hex");
}

export function opaquePublicReference(input: { campaignId: number; routeKey: string; requestKey: string }) {
  return createHmac("sha256", hmacKey())
    .update(`${input.campaignId}:${input.routeKey}:${input.requestKey}`)
    .digest("hex")
    .slice(0, 24);
}

export function publicCommandKey(input: { campaignId: number; routeKey: string; normalizedEmail?: string | null; normalizedPhone?: string | null; requestId: string }) {
  return hashPublicSignal(`${input.campaignId}:${input.routeKey}:request:${input.requestId}`);
}

export function assertPublicFormTiming(input: { website?: string | null; formStartedAt: number; now?: number; minimumMs?: number; maximumMs?: number }) {
  if ((input.website ?? "").trim()) throw new PublicFormRejectedError();
  const now = input.now ?? Date.now();
  const elapsed = now - input.formStartedAt;
  const minimumMs = input.minimumMs ?? 1500;
  const maximumMs = input.maximumMs ?? 2 * 60 * 60 * 1000;
  if (!Number.isFinite(elapsed) || elapsed < minimumMs || elapsed > maximumMs) throw new PublicFormRejectedError();
}

function ensureDatabaseUrl(databaseUrl?: string) {
  const value = databaseUrl ?? process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL_REQUIRED");
  return value;
}

export class PublicAbuseStore {
  private readonly pool: Pool;

  constructor(databaseUrl?: string) {
    this.pool = createPool({ uri: ensureDatabaseUrl(databaseUrl), connectionLimit: 4 });
  }

  async close() {
    await this.pool.end();
  }

  async assertRateLimit(input: { campaignId: number; routeKey: string; signal: string; limit: number; windowMs: number }) {
    const bucketKey = hashPublicSignal(`${input.campaignId}:${input.routeKey}:${input.signal}`);
    const windowMs = Math.max(1000, Math.floor(input.windowMs));
    const windowStartedAt = new Date();
    const expiresAt = new Date(windowStartedAt.getTime() + windowMs);
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO public_rate_limit_buckets (bucketKey, routeKey, campaignId, hitCount, windowStartedAt, expiresAt)
         VALUES (?, ?, ?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE
           hitCount = IF(expiresAt <= CURRENT_TIMESTAMP(3), 1, hitCount + 1),
           windowStartedAt = IF(expiresAt <= CURRENT_TIMESTAMP(3), VALUES(windowStartedAt), windowStartedAt),
           expiresAt = IF(expiresAt <= CURRENT_TIMESTAMP(3), VALUES(expiresAt), expiresAt),
           updatedAt = CURRENT_TIMESTAMP(3)`,
        [bucketKey, input.routeKey, input.campaignId, windowStartedAt, expiresAt],
      );
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT hitCount FROM public_rate_limit_buckets WHERE bucketKey = ? FOR UPDATE`,
        [bucketKey],
      );
      const hitCount = Number(rows[0]?.hitCount ?? 0);
      await connection.commit();
      // Keep retention short without making cleanup part of the critical path.
      void this.pool.execute(`DELETE FROM public_rate_limit_buckets WHERE expiresAt < DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 HOUR) LIMIT 100`).catch(() => undefined);
      if (hitCount > input.limit) throw new PublicRateLimitError();
      return { hitCount, remaining: Math.max(0, input.limit - hitCount) };
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      throw error;
    } finally {
      connection.release();
    }
  }

  async resolvePortalToken(token: string) {
    const tokenHash = hashVolunteerToken(token);
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT volunteerId, campaignId
         FROM volunteer_portal_tokens
        WHERE tokenHash = ?
          AND revokedAt IS NULL
          AND (expiresAt IS NULL OR expiresAt > CURRENT_TIMESTAMP(3))
        LIMIT 1`,
      [tokenHash],
    );
    if (!rows[0]) return null;
    await this.pool.execute(`UPDATE volunteer_portal_tokens SET lastUsedAt = CURRENT_TIMESTAMP(3) WHERE tokenHash = ?`, [tokenHash]);
    const volunteer = await campaignDb.getVolunteerByAccessTokenHash(tokenHash);
    if (!volunteer || volunteer.id !== Number(rows[0].volunteerId) || volunteer.campaignId !== Number(rows[0].campaignId)) return null;
    return volunteer;
  }

  async issuePortalToken(input: { campaignId: number; volunteerId: number; ttlMs?: number }) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashVolunteerToken(token);
    const ttlMs = input.ttlMs ?? DEFAULT_PORTAL_TTL_MS;
    const expiresAt = new Date(Date.now() + ttlMs);
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [volunteerRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, campaignId FROM volunteers WHERE id = ? AND campaignId = ? FOR UPDATE`,
        [input.volunteerId, input.campaignId],
      );
      if (!volunteerRows[0]) throw new Error("VOLUNTEER_NOT_FOUND");
      await connection.execute(
        `UPDATE volunteer_portal_tokens SET revokedAt = CURRENT_TIMESTAMP(3)
          WHERE volunteerId = ? AND campaignId = ? AND revokedAt IS NULL`,
        [input.volunteerId, input.campaignId],
      );
      await connection.execute(
        `INSERT INTO volunteer_portal_tokens (tokenHash, volunteerId, campaignId, expiresAt)
         VALUES (?, ?, ?, ?)`,
        [tokenHash, input.volunteerId, input.campaignId, expiresAt],
      );
      await connection.execute(`UPDATE volunteers SET accessTokenHash = ? WHERE id = ? AND campaignId = ?`, [tokenHash, input.volunteerId, input.campaignId]);
      await connection.commit();
      return { token, expiresAt };
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      throw error;
    } finally {
      connection.release();
    }
  }

  async revokePortalAccess(input: { campaignId: number; volunteerId: number }) {
    const replacementHash = hashVolunteerToken(randomBytes(32).toString("base64url"));
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `UPDATE volunteer_portal_tokens SET revokedAt = CURRENT_TIMESTAMP(3)
          WHERE volunteerId = ? AND campaignId = ? AND revokedAt IS NULL`,
        [input.volunteerId, input.campaignId],
      );
      await connection.execute(`UPDATE volunteers SET accessTokenHash = ? WHERE id = ? AND campaignId = ?`, [replacementHash, input.volunteerId, input.campaignId]);
      await connection.commit();
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      throw error;
    } finally {
      connection.release();
    }
  }
}

let defaultStore: PublicAbuseStore | null = null;

export function getPublicAbuseStore() {
  if (!defaultStore) defaultStore = new PublicAbuseStore();
  return defaultStore;
}

export function hashVolunteerToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function submitPublicVolunteer(input: {
  campaignId: number;
  requestId: string;
  name: string;
  email: string;
  phone?: string | null;
  neighborhood?: string | null;
  region?: string | null;
  availability?: string | null;
  skills?: string | null;
}) {
  const email = normalizePublicEmail(input.email);
  const phone = normalizePublicPhone(input.phone);
  const requestKey = publicCommandKey({ campaignId: input.campaignId, routeKey: "volunteer_signup", normalizedEmail: email, normalizedPhone: phone, requestId: input.requestId });
  const reference = opaquePublicReference({ campaignId: input.campaignId, routeKey: "volunteer_signup", requestKey });

  if (process.env.NODE_ENV === "test" && !process.env.DATABASE_URL) {
    const existingByEmail = await campaignDb.getVolunteerByEmail(input.campaignId, email);
    const existingByPhone = !existingByEmail && phone
      ? ((await campaignDb.listVolunteers(input.campaignId)) ?? []).find(item => normalizePublicPhone(item.phone) === phone)
      : null;
    if (!existingByEmail && !existingByPhone) {
      const unissuedHash = hashVolunteerToken(randomBytes(32).toString("base64url"));
      await campaignDb.createVolunteer({
        campaignId: input.campaignId,
        name: input.name.trim(),
        email,
        accessTokenHash: unissuedHash,
        phone,
        neighborhood: input.neighborhood?.trim() || null,
        region: input.region?.trim() || null,
        availability: input.availability?.trim() || null,
        skills: input.skills?.trim() || null,
        trainingStatus: "not_started",
        status: "pending",
        consent: true,
        consentedAt: new Date(),
        notes: null,
      });
    }
    return { accepted: true as const, reference };
  }

  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.transaction(async tx => {
    const campaignRows = await tx.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, input.campaignId)).for("update");
    if (!campaignRows[0]) throw new Error("CAMPAIGN_NOT_FOUND");
    const identityMatch = phone ? or(eq(volunteers.email, email), eq(volunteers.phone, phone)) : eq(volunteers.email, email);
    const existing = await tx.select({ id: volunteers.id }).from(volunteers).where(and(eq(volunteers.campaignId, input.campaignId), identityMatch)).limit(1);
    if (existing[0]) return;
    const unissuedHash = hashVolunteerToken(randomBytes(32).toString("base64url"));
    await tx.insert(volunteers).values({
      campaignId: input.campaignId,
      organizationId: (await tx.select({ organizationId: campaigns.organizationId }).from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1))[0]!.organizationId,
      name: input.name.trim(),
      email,
      accessTokenHash: unissuedHash,
      phone,
      neighborhood: input.neighborhood?.trim() || null,
      region: input.region?.trim() || null,
      availability: input.availability?.trim() || null,
      skills: input.skills?.trim() || null,
      trainingStatus: "not_started",
      status: "pending",
      consent: true,
      consentedAt: new Date(),
      notes: null,
    });
  });
  return { accepted: true as const, reference };
}
