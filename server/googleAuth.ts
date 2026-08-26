import { randomBytes } from "crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { normalizeGoogleReturnOrigin } from "../shared/googleAuth";

const GOOGLE_STATE_COOKIE = "w9_google_oauth_state";
const GOOGLE_RETURN_ORIGIN_COOKIE = "w9_google_return_origin";
const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

type GoogleProfile = { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };

function configured() {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret && ENV.googleRedirectUri);
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!configured()) return res.status(503).json({ error: "Google login is not configured" });
    const state = randomBytes(32).toString("base64url");
    const returnOrigin = normalizeGoogleReturnOrigin(typeof req.query.returnOrigin === "string" ? req.query.returnOrigin : null);
    res.cookie(GOOGLE_STATE_COOKIE, state, {
      ...getSessionCookieOptions(req),
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
      sameSite: "lax",
    });
    res.cookie(GOOGLE_RETURN_ORIGIN_COOKIE, returnOrigin, {
      ...getSessionCookieOptions(req),
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
      sameSite: "lax",
    });
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: ENV.googleRedirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    res.redirect(302, `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`);
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const expectedState = parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE];
    const returnOrigin = normalizeGoogleReturnOrigin(parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_RETURN_ORIGIN_COOKIE]);
    res.clearCookie(GOOGLE_STATE_COOKIE, { ...getSessionCookieOptions(req), sameSite: "lax" });
    res.clearCookie(GOOGLE_RETURN_ORIGIN_COOKIE, { ...getSessionCookieOptions(req), sameSite: "lax" });

    if (!configured() || !code || !state || !expectedState || state !== expectedState) {
      return res.redirect(302, `${returnOrigin}/login?authError=google_state`);
    }

    try {
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: ENV.googleRedirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenResponse.json() as { access_token?: string };
      if (!tokenResponse.ok || !tokens.access_token) throw new Error("Google token exchange failed");

      const profileResponse = await fetch(GOOGLE_USERINFO_URL, { headers: { authorization: `Bearer ${tokens.access_token}` } });
      const profile = await profileResponse.json() as GoogleProfile;
      if (!profileResponse.ok || !profile.sub || !profile.email || !profile.email_verified) {
        throw new Error("Google profile is missing a verified email");
      }

      const user = await db.upsertGoogleUser({
        googleId: profile.sub,
        email: profile.email.toLowerCase(),
        name: profile.name ?? null,
        avatarUrl: profile.picture ?? null,
      });
      const handoffCode = await db.createGoogleAuthHandoff(user.id, returnOrigin);
      res.redirect(302, `${returnOrigin}/api/auth/google/complete?code=${encodeURIComponent(handoffCode)}`);
    } catch (error) {
      console.error("[GoogleAuth] Callback failed", error);
      res.redirect(302, `${returnOrigin}/login?authError=google`);
    }
  });

  app.get("/api/auth/google/complete", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const handoff = code ? await db.consumeGoogleAuthHandoff(code) : null;
    if (!handoff) return res.redirect(302, "/login?authError=google_handoff");
    const user = await db.getUserById(handoff.userId);
    if (!user) return res.redirect(302, "/login?authError=google_handoff");
    const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: ONE_YEAR_MS });
    res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
    res.redirect(302, "/onboarding");
  });
}
