import { and, eq, gt, or } from "drizzle-orm";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { authChallenges, authMfaFactors, authPasskeys, authenticationAuditLogs, InsertUser, loginSecurityStates, User, users } from "../drizzle/schema";
import { hashIp, hashSecurityIdentifier } from "./authSecurity";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
export async function getUserByEmail(email: string) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1))[0]; }

export async function upsertGoogleUser(input: { googleId: string; email: string; name: string | null; avatarUrl: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(users)
    .where(or(eq(users.googleId, input.googleId), eq(users.email, input.email)))
    .limit(1);

  const found = existing[0];
  if (found) {
    await db.update(users).set({
      googleId: input.googleId,
      name: input.name ?? found.name,
      avatarUrl: input.avatarUrl ?? found.avatarUrl,
      email: input.email,
      loginMethod: "google",
      lastSignedIn: new Date(),
    }).where(eq(users.id, found.id));
    return { ...found, googleId: input.googleId, email: input.email };
  }

  const openId = `google:${input.googleId}`;
  await db.insert(users).values({
    openId,
    googleId: input.googleId,
    email: input.email,
    name: input.name,
    avatarUrl: input.avatarUrl,
    loginMethod: "google",
    role: "user",
    lastSignedIn: new Date(),
  });
  return (await getUserByOpenId(openId))!;
}

function passwordDigest(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function passwordMatches(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export async function registerLocalUser(input: { name: string; email: string; password: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const email = input.email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) throw new Error("EMAIL_ALREADY_REGISTERED");
  const openId = `local:${createHash("sha256").update(email).digest("hex").slice(0, 56)}`;
  await db.insert(users).values({ openId, email, name: input.name.trim(), passwordHash: passwordDigest(input.password), loginMethod: "password", role: "user", lastSignedIn: new Date() });
  return (await getUserByOpenId(openId))!;
}

export async function authenticateLocalUser(emailInput: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const email = emailInput.trim().toLowerCase();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user?.passwordHash || !passwordMatches(password, user.passwordHash)) return null;
  return user;
}

export async function getLoginSecurityState(email: string) {
  const db = await getDb(); if (!db) return null;
  const emailHash = hashSecurityIdentifier(email); const row = (await db.select().from(loginSecurityStates).where(eq(loginSecurityStates.emailHash, emailHash)).limit(1))[0];
  return row ?? null;
}
export async function recordLoginAudit(input: { email: string; userId?: number | null; action: string; success: boolean; ip?: string; metadata?: Record<string, unknown> }) {
  const db = await getDb(); if (!db) return;
  await db.insert(authenticationAuditLogs).values({ emailHash: hashSecurityIdentifier(input.email), userId: input.userId ?? null, action: input.action, success: input.success, ipHash: hashIp(input.ip), metadata: input.metadata ?? null });
}
export async function recordLoginFailure(email: string, ip?: string) {
  const db = await getDb(); if (!db) return { lockedUntil: null, failedAttempts: 0 };
  const emailHash = hashSecurityIdentifier(email); const existing = (await db.select().from(loginSecurityStates).where(eq(loginSecurityStates.emailHash, emailHash)).limit(1))[0];
  const failedAttempts = (existing?.failedAttempts ?? 0) + 1; const lockMinutes = failedAttempts >= 10 ? 60 : failedAttempts >= 7 ? 15 : failedAttempts >= 5 ? 5 : 0; const lockedUntil = lockMinutes ? new Date(Date.now() + lockMinutes * 60_000) : null;
  if (existing) await db.update(loginSecurityStates).set({ failedAttempts, lockedUntil, lastFailedAt: new Date() }).where(eq(loginSecurityStates.id, existing.id)); else await db.insert(loginSecurityStates).values({ emailHash, failedAttempts, lockedUntil, lastFailedAt: new Date() });
  await recordLoginAudit({ email, action: "login_failed", success: false, ip, metadata: { failedAttempts, lockMinutes } }); return { failedAttempts, lockedUntil };
}
export async function clearLoginFailures(email: string, userId: number, ip?: string) {
  const db = await getDb(); if (!db) return;
  const emailHash = hashSecurityIdentifier(email); await db.delete(loginSecurityStates).where(eq(loginSecurityStates.emailHash, emailHash)); await db.update(users).set({ lastSignedIn: new Date(), loginMethod: "password" }).where(eq(users.id, userId)); await recordLoginAudit({ email, userId, action: "login_success", success: true, ip });
}
export async function getMfaFactor(userId: number) { const db = await getDb(); if (!db) return null; return (await db.select().from(authMfaFactors).where(eq(authMfaFactors.userId, userId)).limit(1))[0] ?? null; }
export async function saveMfaFactor(userId: number, secretCiphertext: string) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.insert(authMfaFactors).values({ userId, secretCiphertext }).onDuplicateKeyUpdate({ set: { secretCiphertext, enabledAt: new Date(), lastUsedAt: null } }); }
export async function markMfaUsed(userId: number) { const db = await getDb(); if (!db) return; await db.update(authMfaFactors).set({ lastUsedAt: new Date() }).where(eq(authMfaFactors.userId, userId)); }
export async function saveAuthChallenge(userId: number, purpose: string, challenge: string) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.delete(authChallenges).where(and(eq(authChallenges.userId, userId), eq(authChallenges.purpose, purpose))); await db.insert(authChallenges).values({ userId, purpose, challenge, expiresAt: new Date(Date.now() + 5 * 60_000) }); }
export async function takeAuthChallenge(userId: number, purpose: string) { const db = await getDb(); if (!db) return null; const row = (await db.select().from(authChallenges).where(and(eq(authChallenges.userId, userId), eq(authChallenges.purpose, purpose), gt(authChallenges.expiresAt, new Date()))).limit(1))[0] ?? null; if (row) await db.delete(authChallenges).where(eq(authChallenges.id, row.id)); return row; }
export async function listPasskeys(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(authPasskeys).where(eq(authPasskeys.userId, userId)); }
export async function getPasskey(credentialId: string) { const db = await getDb(); if (!db) return null; return (await db.select().from(authPasskeys).where(eq(authPasskeys.credentialId, credentialId)).limit(1))[0] ?? null; }
export async function savePasskey(input: { userId: number; credentialId: string; publicKey: string; counter: number; transports: string[] | null; label: string }) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.insert(authPasskeys).values(input); }
export async function markPasskeyUsed(id: number, counter: number) { const db = await getDb(); if (!db) return; await db.update(authPasskeys).set({ counter, lastUsedAt: new Date() }).where(eq(authPasskeys.id, id)); }

export async function updateUserThemePreference(userId: number, themePreference: string, themePalette: Record<string, string> | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ themePreference, themePalette }).where(eq(users.id, userId));
}

export function toPublicUser(user: User | null | undefined) {
  if (!user) return null;
  const { passwordHash: _passwordHash, googleId: _googleId, openId: _openId, ...safeUser } = user;
  return safeUser;
}
