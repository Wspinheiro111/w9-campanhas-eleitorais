import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({ createPlatformContactRequest: vi.fn() }));

import * as campaignDb from "./campaignDb";
import { appRouter } from "./routers";

const context = { req: { ip: "127.0.0.1", headers: {} }, res: {}, user: null } as unknown as TrpcContext;

afterEach(() => vi.clearAllMocks());

describe("mensagens públicas de contato", () => {
  it("registra uma mensagem consentida e normaliza o telefone", async () => {
    vi.mocked(campaignDb.createPlatformContactRequest).mockResolvedValue(41);
    const caller = appRouter.createCaller(context);
    await expect(caller.contactRequests.submit({ name: "Ana Coordenação", email: "ANA@CAMPANHA.ORG", phone: "(51) 99999-8888", message: "Gostaria de entender melhor a solução para a equipe.", consent: true })).resolves.toEqual({ submitted: true, requestId: 41 });
    expect(campaignDb.createPlatformContactRequest).toHaveBeenCalledWith(expect.objectContaining({ phone: "51999998888", email: "ANA@CAMPANHA.ORG" }));
  });

  it("ignora silenciosamente envios preenchidos pelo campo anti-spam", async () => {
    const caller = appRouter.createCaller(context);
    await expect(caller.contactRequests.submit({ name: "Ana Coordenação", email: "ana@campanha.org", phone: "51999998888", message: "Quero falar com a equipe comercial.", consent: true, website: "https://spam.example" })).resolves.toEqual({ submitted: true, ignored: true });
    expect(campaignDb.createPlatformContactRequest).not.toHaveBeenCalled();
  });
});
