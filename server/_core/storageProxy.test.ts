import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
}));

const accessMocks = vi.hoisted(() => ({
  getCampaignAccess: vi.fn(),
  getOrganizationMembership: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  getStorageObjectMetadata: vi.fn(),
}));

vi.mock("./sdk", () => ({
  sdk: { authenticateRequest: authMocks.authenticateRequest },
}));

vi.mock("../campaignDb", () => ({
  getCampaignAccess: accessMocks.getCampaignAccess,
  getOrganizationMembership: accessMocks.getOrganizationMembership,
}));

vi.mock("../storage", () => ({
  getStorageObjectMetadata: storageMocks.getStorageObjectMetadata,
}));

vi.mock("./env", () => ({
  ENV: {
    forgeApiUrl: "https://forge.example/",
    forgeApiKey: "forge-test-key",
  },
}));

import { normalizeStorageKey, registerStorageProxy } from "./storageProxy";

type RouteHandler = (req: any, res: any) => Promise<void> | void;

function captureStorageHandler() {
  let handler: RouteHandler | undefined;
  const app = {
    get(path: string, candidate: RouteHandler) {
      expect(path).toBe("/manus-storage/*key");
      handler = candidate;
    },
  };
  registerStorageProxy(app as any);
  if (!handler) throw new Error("storage proxy handler was not registered");
  return handler;
}

function createResponse() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    location: undefined,
    headers: new Map<string, string>(),
  };
  response.status = vi.fn((statusCode: number) => {
    response.statusCode = statusCode;
    return response;
  });
  response.send = vi.fn((body: unknown) => {
    response.body = body;
    return response;
  });
  response.set = vi.fn((name: string, value: string) => {
    response.headers.set(name, value);
    return response;
  });
  response.redirect = vi.fn((statusCode: number, location: string) => {
    response.statusCode = statusCode;
    response.location = location;
    return response;
  });
  return response;
}

function requestFor(key: string) {
  return {
    params: { key: key.split("/") },
    headers: {},
  };
}

function signedUrlResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ url: "https://storage.example/signed" }),
    text: async () => "",
  } as any;
}

function privateMetadata(key: string, campaignId = 42, organizationId = 7) {
  return {
    id: 1,
    storageKey: key,
    organizationId,
    campaignId,
    visibility: "private" as const,
    resourceType: "legal_document",
    createdByUserId: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function publicMetadata(key: string, campaignId = 42, organizationId = 7) {
  return {
    ...privateMetadata(key, campaignId, organizationId),
    visibility: "public" as const,
    resourceType: "certificate_asset",
  };
}

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

describe("storage proxy authorization por metadado persistido", () => {
  beforeEach(() => {
    authMocks.authenticateRequest.mockReset();
    accessMocks.getCampaignAccess.mockReset();
    accessMocks.getOrganizationMembership.mockReset();
    storageMocks.getStorageObjectMetadata.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(signedUrlResponse()));
  });

  it("nega chave sem metadado persistido antes de autenticar ou chamar Forge", async () => {
    storageMocks.getStorageObjectMetadata.mockResolvedValue(null);
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor("campaigns/42/legal/7/documento.pdf"), response);

    expect(storageMocks.getStorageObjectMetadata).toHaveBeenCalledWith("campaigns/42/legal/7/documento.pdf");
    expect(response.status).toHaveBeenCalledWith(404);
    expect(authMocks.authenticateRequest).not.toHaveBeenCalled();
    expect(accessMocks.getCampaignAccess).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("nega objeto privado quando não existe sessão autenticada", async () => {
    const key = "campaigns/42/legal/7/documento.pdf";
    storageMocks.getStorageObjectMetadata.mockResolvedValue(privateMetadata(key));
    authMocks.authenticateRequest.mockRejectedValue(new Error("invalid session"));
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor(key), response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(accessMocks.getCampaignAccess).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("nega objeto privado de campanha sem vínculo do usuário", async () => {
    const key = "campaigns/42/audio-crm/audio.webm";
    storageMocks.getStorageObjectMetadata.mockResolvedValue(privateMetadata(key));
    authMocks.authenticateRequest.mockResolvedValue({ id: 20 });
    accessMocks.getCampaignAccess.mockResolvedValue(null);
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor(key), response);

    expect(accessMocks.getCampaignAccess).toHaveBeenCalledWith(42, 20);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("nega metadado inconsistente entre campanha e organização", async () => {
    const key = "campaigns/42/legal/7/documento.pdf";
    storageMocks.getStorageObjectMetadata.mockResolvedValue(privateMetadata(key, 42, 7));
    authMocks.authenticateRequest.mockResolvedValue({ id: 20 });
    accessMocks.getCampaignAccess.mockResolvedValue({ campaign: { id: 42, organizationId: 99 } });
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor(key), response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("assina objeto privado somente para usuário com acesso à campanha do metadado", async () => {
    const key = "campaigns/42/legal/7/documento.pdf";
    storageMocks.getStorageObjectMetadata.mockResolvedValue(privateMetadata(key, 42, 7));
    authMocks.authenticateRequest.mockResolvedValue({ id: 20 });
    accessMocks.getCampaignAccess.mockResolvedValue({ campaign: { id: 42, organizationId: 7 } });
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor(key), response);

    expect(accessMocks.getCampaignAccess).toHaveBeenCalledWith(42, 20);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(response.redirect).toHaveBeenCalledWith(307, "https://storage.example/signed");
  });

  it("usa o campaignId persistido e não o campaignId embutido na chave", async () => {
    const key = "campaigns/999/legal/7/documento.pdf";
    storageMocks.getStorageObjectMetadata.mockResolvedValue(privateMetadata(key, 42, 7));
    authMocks.authenticateRequest.mockResolvedValue({ id: 20 });
    accessMocks.getCampaignAccess.mockResolvedValue({ campaign: { id: 42, organizationId: 7 } });
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor(key), response);

    expect(accessMocks.getCampaignAccess).toHaveBeenCalledWith(42, 20);
    expect(accessMocks.getCampaignAccess).not.toHaveBeenCalledWith(999, 20);
    expect(response.redirect).toHaveBeenCalledWith(307, "https://storage.example/signed");
  });

  it("autoriza objeto privado de organização sem campanha somente para membro da organização", async () => {
    const key = "organization-private/report.pdf";
    storageMocks.getStorageObjectMetadata.mockResolvedValue(privateMetadata(key, null as any, 7));
    authMocks.authenticateRequest.mockResolvedValue({ id: 20 });
    accessMocks.getOrganizationMembership.mockResolvedValue({ organizationId: 7, userId: 20, active: true });
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor(key), response);

    expect(accessMocks.getOrganizationMembership).toHaveBeenCalledWith(20, 7);
    expect(response.redirect).toHaveBeenCalledWith(307, "https://storage.example/signed");
  });

  it("mantém asset explicitamente público pelo metadado sem exigir sessão", async () => {
    const key = "campaign-certificates/7/42/logo-abc.png";
    storageMocks.getStorageObjectMetadata.mockResolvedValue(publicMetadata(key));
    authMocks.authenticateRequest.mockRejectedValue(new Error("no session"));
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor(key), response);

    expect(authMocks.authenticateRequest).not.toHaveBeenCalled();
    expect(accessMocks.getCampaignAccess).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(307, "https://storage.example/signed");
  });

  it("aplica Cache-Control no-store também nas respostas de erro", async () => {
    storageMocks.getStorageObjectMetadata.mockResolvedValue(null);
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor("missing/object.pdf"), response);

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.status).toHaveBeenCalledWith(404);
  });
});
