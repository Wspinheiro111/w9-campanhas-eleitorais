import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
}));

const accessMocks = vi.hoisted(() => ({
  getCampaignAccess: vi.fn(),
}));

vi.mock("./sdk", () => ({
  sdk: { authenticateRequest: authMocks.authenticateRequest },
}));

vi.mock("../campaignDb", () => ({
  getCampaignAccess: accessMocks.getCampaignAccess,
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

describe("storage proxy authorization", () => {
  beforeEach(() => {
    authMocks.authenticateRequest.mockReset();
    accessMocks.getCampaignAccess.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(signedUrlResponse()));
  });

  it("nega objeto privado quando não existe sessão autenticada", async () => {
    authMocks.authenticateRequest.mockRejectedValue(new Error("invalid session"));
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor("campaigns/42/legal/7/documento.pdf"), response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(accessMocks.getCampaignAccess).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("nega objeto privado de campanha sem vínculo do usuário", async () => {
    authMocks.authenticateRequest.mockResolvedValue({ id: 20 });
    accessMocks.getCampaignAccess.mockResolvedValue(null);
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor("campaigns/42/audio-crm/audio.webm"), response);

    expect(accessMocks.getCampaignAccess).toHaveBeenCalledWith(42, 20);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("assina objeto privado somente para usuário com acesso à campanha", async () => {
    authMocks.authenticateRequest.mockResolvedValue({ id: 20 });
    accessMocks.getCampaignAccess.mockResolvedValue({ campaign: { id: 42 } });
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor("campaigns/42/legal/7/documento.pdf"), response);

    expect(accessMocks.getCampaignAccess).toHaveBeenCalledWith(42, 20);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(response.redirect).toHaveBeenCalledWith(307, "https://storage.example/signed");
  });

  it("mantém asset estático explicitamente público sem exigir sessão", async () => {
    authMocks.authenticateRequest.mockRejectedValue(new Error("no session"));
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor("assets/trailer.mp4"), response);

    expect(authMocks.authenticateRequest).not.toHaveBeenCalled();
    expect(accessMocks.getCampaignAccess).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(307, "https://storage.example/signed");
  });

  it("mantém assets de certificado explicitamente públicos para o portal de validação", async () => {
    authMocks.authenticateRequest.mockRejectedValue(new Error("no session"));
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor("campaign-certificates/7/42/logo-abc.png"), response);

    expect(authMocks.authenticateRequest).not.toHaveBeenCalled();
    expect(accessMocks.getCampaignAccess).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(307, "https://storage.example/signed");
  });

  it("nega por padrão prefixo de armazenamento não classificado", async () => {
    const handler = captureStorageHandler();
    const response = createResponse();

    await handler(requestFor("misc/private-object.bin"), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(authMocks.authenticateRequest).not.toHaveBeenCalled();
    expect(accessMocks.getCampaignAccess).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
