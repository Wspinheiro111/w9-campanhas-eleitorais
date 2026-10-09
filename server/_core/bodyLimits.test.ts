import { createServer } from "node:http";
import express, { type Express } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ authenticateRequest: vi.fn() }));
vi.mock("./sdk", () => ({ sdk: { authenticateRequest: authMocks.authenticateRequest } }));

import { AUDIO_CRM_TRPC_PATH, registerBodyParsers } from "./bodyLimits";

const servers: ReturnType<typeof createServer>[] = [];

async function postJson(app: Express, path: string, body: unknown) {
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server address unavailable");
  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("body limits", () => {
  beforeEach(() => {
    authMocks.authenticateRequest.mockReset();
    authMocks.authenticateRequest.mockResolvedValue({ id: 1 });
  });

  afterEach(async () => {
    await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
  });

  it("permite JSON comum abaixo de 2 MB", async () => {
    const app = express();
    registerBodyParsers(app);
    app.post("/api/test", (req, res) => res.json({ value: req.body.value }));
    const response = await postJson(app, "/api/test", { value: "ok" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ value: "ok" });
  });

  it("rejeita JSON comum acima de 2 MB com 413 sanitizado", async () => {
    const marker = "NAO_ECOAR_ESTE_PAYLOAD";
    const app = express();
    registerBodyParsers(app);
    app.post("/api/test", (_req, res) => res.json({ ok: true }));
    const response = await postJson(app, "/api/test", { value: marker + "x".repeat(2 * 1024 * 1024) });
    const text = await response.text();
    expect(response.status).toBe(413);
    expect(text).toContain("Payload muito grande");
    expect(text).not.toContain(marker);
  });

  it("permite payload de áudio acima do limite global e abaixo de 24 MB", async () => {
    const app = express();
    registerBodyParsers(app);
    app.post(AUDIO_CRM_TRPC_PATH, (req, res) => res.json({ length: req.body.dataBase64.length }));
    const payload = "a".repeat(3 * 1024 * 1024);
    const response = await postJson(app, AUDIO_CRM_TRPC_PATH, { dataBase64: payload });
    expect(response.status).toBe(200);
    expect(authMocks.authenticateRequest).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({ length: payload.length });
  });

  it("rejeita áudio acima de 24 MB antes do handler", async () => {
    const app = express();
    registerBodyParsers(app);
    const handler = vi.fn((_req, res) => res.json({ ok: true }));
    app.post(AUDIO_CRM_TRPC_PATH, handler);
    const response = await postJson(app, AUDIO_CRM_TRPC_PATH, { dataBase64: "a".repeat(25 * 1024 * 1024) });
    expect(response.status).toBe(413);
    expect(handler).not.toHaveBeenCalled();
  });

  it("autentica o endpoint de áudio antes de aceitar o parser grande", async () => {
    authMocks.authenticateRequest.mockRejectedValue(new Error("invalid session"));
    const app = express();
    registerBodyParsers(app);
    const handler = vi.fn((_req, res) => res.json({ ok: true }));
    app.post(AUDIO_CRM_TRPC_PATH, handler);
    const response = await postJson(app, AUDIO_CRM_TRPC_PATH, { dataBase64: "a".repeat(3 * 1024 * 1024) });
    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});
