import type { Express } from "express";
import * as db from "../campaignDb";
import { ENV } from "./env";
import { sdk } from "./sdk";

export function normalizeStorageKey(value: string | string[] | undefined) {
  const key = Array.isArray(value) ? value.join("/") : value;
  return key?.replace(/^\/+/, "") || undefined;
}

type StorageScope =
  | { kind: "public" }
  | { kind: "campaign"; campaignId: number }
  | { kind: "denied" };

export function classifyStorageKey(key: string): StorageScope {
  const segments = key.split("/");
  if (segments.some(segment => segment === "" || segment === "." || segment === "..")) {
    return { kind: "denied" };
  }

  if (segments[0] === "assets" && segments.length >= 2) {
    return { kind: "public" };
  }

  if (
    segments[0] === "campaign-certificates" &&
    /^\d+$/.test(segments[1] ?? "") &&
    /^\d+$/.test(segments[2] ?? "") &&
    segments.length >= 4
  ) {
    return { kind: "public" };
  }

  if (
    segments[0] === "campaigns" &&
    /^[1-9]\d*$/.test(segments[1] ?? "") &&
    segments.length >= 3
  ) {
    return { kind: "campaign", campaignId: Number(segments[1]) };
  }

  return { kind: "denied" };
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*key", async (req, res) => {
    const key = normalizeStorageKey(
      (req.params as { key?: string | string[] }).key,
    );
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const scope = classifyStorageKey(key);
    if (scope.kind === "denied") {
      res.status(404).send("Storage object not found");
      return;
    }

    if (scope.kind === "campaign") {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).send("Authentication required");
        return;
      }

      const access = await db.getCampaignAccess(scope.campaignId, user.id);
      if (!access) {
        res.status(403).send("Storage object not available");
        return;
      }
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
