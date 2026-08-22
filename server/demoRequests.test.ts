import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  createPlatformDemoRequest: vi.fn(),
}));

import * as campaignDb from "./campaignDb";
import { appRouter } from "./routers";

const context = {
  req: { ip: "127.0.0.1", headers: {} },
  res: {},
  user: null,
} as unknown as TrpcContext;

afterEach(() => vi.clearAllMocks());

describe("solicitações públicas de demonstração", () => {
  it("registra um lead consentido e normaliza o telefone", async () => {
    vi.mocked(campaignDb.createPlatformDemoRequest).mockResolvedValue(31);
    const caller = appRouter.createCaller(context);
    await expect(caller.demoRequests.submit({ name: "Ana Coordenação", email: "ana@campanha.org", phone: "(51) 99999-8888", organizationName: "Campanha Ana", role: "candidate", city: "Porto Alegre", state: "rs", consent: true })).resolves.toEqual({ submitted: true, requestId: 31 });
    expect(campaignDb.createPlatformDemoRequest).toHaveBeenCalledWith(expect.objectContaining({ phone: "51999998888", state: "rs" }));
  });

  it("ignora silenciosamente envios preenchidos pelo campo anti-spam", async () => {
    const caller = appRouter.createCaller(context);
    await expect(caller.demoRequests.submit({ name: "Ana Coordenação", email: "ana@campanha.org", phone: "51999998888", organizationName: "Campanha Ana", role: "candidate", consent: true, website: "https://spam.example" })).resolves.toEqual({ submitted: true, ignored: true });
    expect(campaignDb.createPlatformDemoRequest).not.toHaveBeenCalled();
  });

  it("exige consentimento e um telefone brasileiro válido", async () => {
    const caller = appRouter.createCaller(context);
    await expect(caller.demoRequests.submit({ name: "Ana Coordenação", email: "ana@campanha.org", phone: "123", organizationName: "Campanha Ana", role: "candidate", consent: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
