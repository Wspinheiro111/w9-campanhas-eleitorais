import type { Express, Request, Response } from "express";
import * as campaignDb from "../campaignDb";
import { resolveStoredAssetScope, type StoredAssetScope } from "../storageAuthorization";
import { ENV } from "./env";
import { sdk } from "./sdk";

export function normalizeStorageKey(value: string | string[] | undefined) {
  const key = Array.isArray(value) ? value.join("/") : value;
  return key?.replace(/^\/+/, "") || undefined;
}

type StorageAccess = {
  campaign: { ownerId: number };
  member: { role: string } | null;
} | null;

export type StorageProxyDependencies = {
  resolveScope: (key: string) => Promise<StoredAssetScope | null>;
  authenticateRequest: (req: Request) => Promise<{ id: number }>;
  getCampaignAccess: (campaignId: number, userId: number) => Promise<StorageAccess>;
  fetchImpl: typeof fetch;
  forgeApiUrl: string;
  forgeApiKey: string;
};

const defaultDependencies: StorageProxyDependencies = {
  resolveScope: resolveStoredAssetScope,
  authenticateRequest: req => sdk.authenticateRequest(req),
  getCampaignAccess: (campaignId, userId) => campaignDb.getCampaignAccess(campaignId, userId),
  fetchImpl: fetch,
  forgeApiUrl: ENV.forgeApiUrl,
  forgeApiKey: ENV.forgeApiKey,
};

function noStore(res: Response) {
  res.set("Cache-Control", "no-store");
}

function hasPrivateCampaignAccess(access: StorageAccess, userId: number) {
  if (!access) return false;
  if (access.member?.role) return true;
  return access.campaign.ownerId === userId;
}

export function createStorageProxyHandler(deps: StorageProxyDependencies = defaultDependencies) {
  return async (req: Request, res: Response) => {
    const key = normalizeStorageKey((req.params as { key?: string | string[] }).key);
    noStore(res);

    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    let scope: StoredAssetScope | null;
    try {
      scope = await deps.resolveScope(key);
    } catch (error) {
      console.error("[StorageProxy] authorization lookup failed", error instanceof Error ? error.message : "unknown");
      res.status(503).send("Storage authorization unavailable");
      return;
    }

    if (!scope) {
      res.status(404).send("Storage object not found");
      return;
    }

    if (scope.visibility !== "public") {
      let user: { id: number };
      try {
        user = await deps.authenticateRequest(req);
      } catch {
        res.status(401).send("Unauthorized");
        return;
      }

      const access = await deps.getCampaignAccess(scope.campaignId, user.id);
      if (!hasPrivateCampaignAccess(access, user.id)) {
        res.status(403).send("Forbidden");
        return;
      }
    }

    if (!deps.forgeApiUrl || !deps.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        deps.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await deps.fetchImpl(forgeUrl, {
        headers: { Authorization: `Bearer ${deps.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        console.error(`[StorageProxy] forge error: ${forgeResp.status}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.redirect(307, url);
    } catch (error) {
      console.error("[StorageProxy] failed:", error instanceof Error ? error.message : "unknown");
      res.status(502).send("Storage proxy error");
    }
  };
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*key", createStorageProxyHandler());
}
