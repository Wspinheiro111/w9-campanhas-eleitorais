import { eq, or } from "drizzle-orm";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, User, users } from "../drizzle/schema";
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
  await db.update(users).set({ lastSignedIn: new Date(), loginMethod: "password" }).where(eq(users.id, user.id));
  return user;
}

export function toPublicUser(user: User | null | undefined) {
  if (!user) return null;
  const { passwordHash: _passwordHash, googleId: _googleId, openId: _openId, ...safeUser } = user;
  return safeUser;
}
