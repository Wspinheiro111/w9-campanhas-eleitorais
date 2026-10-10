import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { campaignConsentLedger, campaigns, organizations, users, volunteers, voters } from "../drizzle/schema";
import * as campaignDb from "./campaignDb";
import { getDb } from "./db";
import { appRouter } from "./routers";
import {
  PublicAbuseStore,
  PublicRateLimitError,
  hashVolunteerToken,
} from "./publicAbuseProtection";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
let campaignId = 0;
let volunteerId = 0;
let storeA: PublicAbuseStore;
let storeB: PublicAbuseStore;

describeDb("public abuse protection on shared MySQL", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB required");
    const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
    const user = await db.insert(users).values({ openId: `abuse-${suffix}`, name: "Abuse Test", email: `abuse-${suffix}@example.com`, loginMethod: "local" });
    const userId = Number(user[0].insertId);
    const org = await db.insert(organizations).values({ name: `Abuse ${suffix}`, status: "active", createdById: userId });
    const organizationId = Number(org[0].insertId);
    const campaign = await db.insert(campaigns).values({ organizationId, name: `Campaign ${suffix}`, candidateName: "Pessoa", electionLabel: "Eleição teste", region: "RS", status: "active", ownerId: userId });
    campaignId = Number(campaign[0].insertId);
    const volunteer = await db.insert(volunteers).values({ organizationId, campaignId, name: "Voluntária", email: `vol-${suffix}@example.com`, accessTokenHash: hashVolunteerToken(randomBytes(32).toString("base64url")), consent: true, consentedAt: new Date(), status: "active", trainingStatus: "not_started" });
    volunteerId = Number(volunteer[0].insertId);
    storeA = new PublicAbuseStore(process.env.DATABASE_URL!);
    storeB = new PublicAbuseStore(process.env.DATABASE_URL!);
  });

  afterAll(async () => {
    await Promise.all([storeA?.close(), storeB?.close()]);
  });

  it("compartilha o contador entre duas instâncias", async () => {
    const signal = randomUUID();
    const routeKey = `integration_${randomUUID().slice(0, 8)}`;
    await expect(storeA.assertRateLimit({ campaignId, routeKey, signal, limit: 2, windowMs: 60_000 })).resolves.toMatchObject({ hitCount: 1 });
    await expect(storeB.assertRateLimit({ campaignId, routeKey, signal, limit: 2, windowMs: 60_000 })).resolves.toMatchObject({ hitCount: 2 });
    await expect(storeA.assertRateLimit({ campaignId, routeKey, signal, limit: 2, windowMs: 60_000 })).rejects.toBeInstanceOf(PublicRateLimitError);
  });

  it("retorna 429 antes de nova escrita e não duplica contato por e-mail normalizado", async () => {
    const db = (await getDb())!;
    const email = `burst-${randomUUID().slice(0, 8)}@example.com`;
    const ctx = { user: null, req: { ip: `198.51.100.${Math.floor(Math.random() * 150) + 1}`, socket: { remoteAddress: "127.0.0.1" }, protocol: "https", headers: {} }, res: {} } as any;
    const caller = appRouter.createCaller(ctx);
    let voterId = 0;
    for (let i = 0; i < 8; i++) {
      await expect(caller.publicIntake.submit({ campaignId, name: "Pessoa Pública", email: ` ${email.toUpperCase()} `, consent: true, requestId: randomUUID(), formStartedAt: Date.now() - 2_000 })).resolves.toEqual({ accepted: true, reference: expect.any(String) });
      const rows = await db.select({ id: voters.id }).from(voters).where(and(eq(voters.campaignId, campaignId), eq(voters.email, email)));
      expect(rows).toHaveLength(1);
      voterId = rows[0]!.id;
    }
    const before = await db.select().from(campaignConsentLedger).where(eq(campaignConsentLedger.voterId, voterId));
    expect(before).toHaveLength(8);
    await expect(caller.publicIntake.submit({ campaignId, name: "Pessoa Pública", email, consent: true, requestId: randomUUID(), formStartedAt: Date.now() - 2_000 })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    const after = await db.select().from(campaignConsentLedger).where(eq(campaignConsentLedger.voterId, voterId));
    expect(after).toHaveLength(8);
  });

  it("deduplica telefone mesmo quando a formatação pública muda", async () => {
    const db = (await getDb())!;
    const ctx = { user: null, req: { ip: "198.51.100.201", socket: { remoteAddress: "127.0.0.1" }, protocol: "https", headers: {} }, res: {} } as any;
    const caller = appRouter.createCaller(ctx);
    await caller.publicIntake.submit({ campaignId, name: "Telefone Um", phone: "(51) 98888-1234", consent: true, requestId: randomUUID(), formStartedAt: Date.now() - 2_000 });
    await caller.publicIntake.submit({ campaignId, name: "Telefone Dois", phone: "51988881234", consent: true, requestId: randomUUID(), formStartedAt: Date.now() - 2_000 });
    expect(await db.select().from(voters).where(and(eq(voters.campaignId, campaignId), eq(voters.phone, "51988881234")))).toHaveLength(1);

    const first = await caller.volunteers.publicSignup({ campaignId, name: "Voluntária Um", email: `phone-a-${randomUUID().slice(0, 8)}@example.com`, phone: "(51) 97777-4321", consent: true, requestId: randomUUID(), formStartedAt: Date.now() - 2_000 });
    const second = await caller.volunteers.publicSignup({ campaignId, name: "Voluntária Dois", email: `phone-b-${randomUUID().slice(0, 8)}@example.com`, phone: "51977774321", consent: true, requestId: randomUUID(), formStartedAt: Date.now() - 2_000 });
    expect(first).toEqual({ accepted: true, reference: expect.any(String) });
    expect(second).toEqual({ accepted: true, reference: expect.any(String) });
    expect(await db.select().from(volunteers).where(and(eq(volunteers.campaignId, campaignId), eq(volunteers.phone, "51977774321")))).toHaveLength(1);
  });

  it("aceita token válido e bloqueia token revogado, expirado ou inválido", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const issued = await storeA.issuePortalToken({ campaignId, volunteerId });
      await expect(storeB.resolvePortalToken(issued.token)).resolves.toMatchObject({ id: volunteerId, campaignId });
      await storeB.revokePortalAccess({ campaignId, volunteerId });
      await expect(storeA.resolvePortalToken(issued.token)).resolves.toBeNull();
      await expect(campaignDb.getVolunteerByAccessTokenHash(hashVolunteerToken(issued.token))).resolves.toBeNull();

      const expired = await storeA.issuePortalToken({ campaignId, volunteerId, ttlMs: -5_000 });
      await expect(storeB.resolvePortalToken(expired.token)).resolves.toBeNull();
      await expect(storeB.resolvePortalToken(randomBytes(32).toString("base64url"))).resolves.toBeNull();

      const emitted = [...log.mock.calls, ...warn.mock.calls, ...error.mock.calls].flat().join(" ");
      expect(emitted).not.toContain(issued.token);
      expect(emitted).not.toContain(expired.token);
    } finally {
      log.mockRestore(); warn.mockRestore(); error.mockRestore();
    }
  });
});
