import { describe, expect, it, vi } from "vitest";
import { createStorageProxyHandler, normalizeStorageKey } from "./storageProxy";

describe("normalizeStorageKey", () => {
  it("preserva uma chave simples de armazenamento", () => {
    expect(normalizeStorageKey("assets/trailer.mp4")).toBe("assets/trailer.mp4");
  });

  it("recompõe o wildcard nomeado do Express 5 sem barra inicial", () => {
    expect(normalizeStorageKey(["assets", "trailer.mp4"])).toBe("assets/trailer.mp4");
    expect(normalizeStorageKey(["/assets", "trailer.mp4"])).toBe("assets/trailer.mp4");
  });

  it("rejeita chave ausente", () => {
    expect(normalizeStorageKey(undefined)).toBeUndefined();
  });
});

function responseMock() {
  const state = { status: 200, body: undefined as unknown, headers: {} as Record<string, string>, redirect: undefined as undefined | { status: number; url: string } };
  const res = {
    status: vi.fn((status: number) => { state.status = status; return res; }),
    send: vi.fn((body: unknown) => { state.body = body; return res; }),
    set: vi.fn((name: string, value: string) => { state.headers[name] = value; return res; }),
    redirect: vi.fn((status: number, url: string) => { state.redirect = { status, url }; return res; }),
  };
  return { res: res as never, state };
}

function dependencies() {
  return {
    resolveScope: vi.fn(),
    authenticateRequest: vi.fn(),
    getCampaignAccess: vi.fn(),
    fetchImpl: vi.fn(),
    forgeApiUrl: "https://forge.example/",
    forgeApiKey: "forge-secret",
  };
}

const privateScope = { campaignId: 11, organizationId: 7, kind: "legal_document", visibility: "private" as const };
const publicScope = { campaignId: 11, organizationId: 7, kind: "certificate_asset", visibility: "public" as const };

describe("storage proxy authorization", () => {
  it("nega chave sem registro antes de autenticar ou chamar o Forge", async () => {
    const deps = dependencies();
    deps.resolveScope.mockResolvedValue(null);
    const handler = createStorageProxyHandler(deps as never);
    const { res, state } = responseMock();

    await handler({ params: { key: ["campaigns", "11", "unknown.pdf"] } } as never, res);

    expect(state.status).toBe(404);
    expect(state.headers["Cache-Control"]).toBe("no-store");
    expect(deps.authenticateRequest).not.toHaveBeenCalled();
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it("exige sessão para arquivo privado e não chama o Forge quando não autenticado", async () => {
    const deps = dependencies();
    deps.resolveScope.mockResolvedValue(privateScope);
    deps.authenticateRequest.mockRejectedValue(new Error("invalid session"));
    const handler = createStorageProxyHandler(deps as never);
    const { res, state } = responseMock();

    await handler({ params: { key: "private.pdf" } } as never, res);

    expect(state.status).toBe(401);
    expect(state.headers["Cache-Control"]).toBe("no-store");
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it("nega membro apenas da organização sem vínculo com a campanha", async () => {
    const deps = dependencies();
    deps.resolveScope.mockResolvedValue(privateScope);
    deps.authenticateRequest.mockResolvedValue({ id: 20 });
    deps.getCampaignAccess.mockResolvedValue({ campaign: { ownerId: 10 }, member: null });
    const handler = createStorageProxyHandler(deps as never);
    const { res, state } = responseMock();

    await handler({ params: { key: "private.pdf" } } as never, res);

    expect(state.status).toBe(403);
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it("permite arquivo privado para campaignMember explícito", async () => {
    const deps = dependencies();
    deps.resolveScope.mockResolvedValue(privateScope);
    deps.authenticateRequest.mockResolvedValue({ id: 20 });
    deps.getCampaignAccess.mockResolvedValue({ campaign: { ownerId: 10 }, member: { role: "partner" } });
    deps.fetchImpl.mockResolvedValue({ ok: true, json: async () => ({ url: "https://signed.example/private" }) });
    const handler = createStorageProxyHandler(deps as never);
    const { res, state } = responseMock();

    await handler({ params: { key: "private.pdf" } } as never, res);

    expect(state.redirect).toEqual({ status: 307, url: "https://signed.example/private" });
    expect(state.headers["Cache-Control"]).toBe("no-store");
    expect(deps.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("permite arquivo privado ao owner real mesmo sem campaignMember legado", async () => {
    const deps = dependencies();
    deps.resolveScope.mockResolvedValue(privateScope);
    deps.authenticateRequest.mockResolvedValue({ id: 10 });
    deps.getCampaignAccess.mockResolvedValue({ campaign: { ownerId: 10 }, member: null });
    deps.fetchImpl.mockResolvedValue({ ok: true, json: async () => ({ url: "https://signed.example/owner" }) });
    const handler = createStorageProxyHandler(deps as never);
    const { res, state } = responseMock();

    await handler({ params: { key: "private.pdf" } } as never, res);

    expect(state.redirect?.url).toBe("https://signed.example/owner");
  });

  it("permite somente a classe pública explicitamente registrada sem sessão", async () => {
    const deps = dependencies();
    deps.resolveScope.mockResolvedValue(publicScope);
    deps.fetchImpl.mockResolvedValue({ ok: true, json: async () => ({ url: "https://signed.example/certificate" }) });
    const handler = createStorageProxyHandler(deps as never);
    const { res, state } = responseMock();

    await handler({ params: { key: "certificate.png" } } as never, res);

    expect(deps.authenticateRequest).not.toHaveBeenCalled();
    expect(state.redirect).toEqual({ status: 307, url: "https://signed.example/certificate" });
  });
});
