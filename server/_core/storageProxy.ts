import type { Express } from "express";
import * as campaignDb from "../campaignDb";
import { getStorageObjectMetadata } from "../storage";
import { ENV } from "./env";
import { sdk } from "./sdk";

export function normalizeStorageKey(value: string | string[] | undefined) {
  const key = Array.isArray(value) ? value.join("/") : value;
  return key?.replace(/^\/+/, "") || undefined;
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*key", async (req, res) => {
    // Storage responses must never be cached, including denials and backend errors.
    res.set("Cache-Control", "no-store");

    const key = normalizeStorageKey(
      (req.params as { key?: string | string[] }).key,
    );
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    let metadata;
    try {
      metadata = await getStorageObjectMetadata(key);
    } catch {
      res.status(503).send("Storage metadata unavailable");
      return;
    }

    // Exact metadata lookup is the authority. A plausible path/prefix alone is never enough.
    if (!metadata) {
      res.status(404).send("Storage object not found");
      return;
    }

    if (metadata.visibility !== "public") {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).send("Authentication required");
        return;
      }

      if (metadata.campaignId !== null) {
        const access = await campaignDb.getCampaignAccess(metadata.campaignId, user.id);
        if (!access || access.campaign.organizationId !== metadata.organizationId) {
          res.status(403).send("Storage object not available");
          return;
        }
      } else if (metadata.organizationId !== null) {
        const membership = await campaignDb.getOrganizationMembership(user.id, metadata.organizationId);
        if (!membership || membership.active === false) {
          res.status(403).send("Storage object not available");
          return;
        }
      } else {
        // Private objects without an owning tenant are invalid metadata and fail closed.
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
        // Do not log Forge response bodies: they may contain sensitive backend details.
        console.error(`[StorageProxy] forge request failed with status ${forgeResp.status}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Storage backend returned no URL");
        return;
      }

      res.redirect(307, url);
    } catch {
      // Keep logs free of API keys, object PII and signed URLs.
      console.error("[StorageProxy] backend request failed");
      res.status(502).send("Storage proxy error");
    }
  });
}
