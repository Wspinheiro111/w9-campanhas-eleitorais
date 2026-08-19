import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(), getPublicCampaign: vi.fn(), createVoter: vi.fn(), getVoter: vi.fn(), updateVoterPipeline: vi.fn(), createFollowupForPipeline: vi.fn(), createCampaignContent: vi.fn(), getContentById: vi.fn(), saveCampaignContentAsset: vi.fn(), getTerritoryData: vi.fn(), getComparativeReport: vi.fn(),
}));

vi.mock("./storage", () => ({ storagePut: vi.fn() }));

import * as db from "./campaignDb";
import { storagePut } from "./storage";
import { appRouter } from "./routers";

const campaign = { id: 1, ownerId: 99, name: "Campanha", candidateName: "Candidata", electionLabel: "Vereança", region: "Cidade", status: "active", createdAt: new Date(), updatedAt: new Date() };
const member = { id: 10, campaignId: 1, userId: 99, role: "admin" as const };
const ctx: TrpcContext = { user: { id: 99, openId: "growth-test", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };

afterEach(() => vi.clearAllMocks());

describe("módulos de expansão", () => {
  it("aceita captação pública somente para campanha ativa e com consentimento", async () => {
    vi.mocked(db.getPublicCampaign).mockResolvedValue({ id: 1, name: "Campanha", candidateName: "Candidata", electionLabel: "Vereança", region: "Cidade", status: "active" } as never);
    vi.mocked(db.createVoter).mockResolvedValue(77);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.publicIntake.submit({ campaignId: 1, name: "Ana", phone: "51999990000", consent: true })).resolves.toEqual({ id: 77 });
    expect(db.createVoter).toHaveBeenCalledWith(expect.objectContaining({ contactConsent: true, pipelineStage: "identified", ownerMemberId: null }));
  });

  it("move um contato no pipeline somente para membro com acesso", async () => {
    vi.mocked(db.getVoter).mockResolvedValue({ id: 4, campaignId: 1, ownerMemberId: 10 } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member } as never);
    vi.mocked(db.updateVoterPipeline).mockResolvedValue(undefined);
    vi.mocked(db.createFollowupForPipeline).mockResolvedValue({ id: 31, created: true });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.voters.movePipeline({ voterId: 4, pipelineStage: "engaged" })).resolves.toEqual({ success: true, followup: { id: 31, created: true } });
    expect(db.updateVoterPipeline).toHaveBeenCalledWith(4, "engaged");
    expect(db.createFollowupForPipeline).toHaveBeenCalledWith({ campaignId: 1, voterId: 4, assignedToId: 10, stage: "engaged" });
  });

  it("reserva a criação de conteúdo para perfis gestores", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member } as never);
    vi.mocked(db.createCampaignContent).mockResolvedValue(22);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.contents.create({ campaignId: 1, title: "Roteiro", body: "Conteúdo revisado", channel: "social", status: "draft" })).resolves.toEqual({ id: 22 });
    expect(db.createCampaignContent).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, createdById: 99 }));
  });

  it("aplica filtros territoriais por período e responsável", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member } as never);
    vi.mocked(db.getTerritoryData).mockResolvedValue({ territories: [], events: [], incidents: [] } as never);
    const caller = appRouter.createCaller(ctx);
    const startsAt = new Date("2026-08-01T00:00:00Z"); const endsAt = new Date("2026-08-15T23:59:59Z");
    await caller.territory.overview({ campaignId: 1, startsAt, endsAt, memberId: 10 });
    expect(db.getTerritoryData).toHaveBeenCalledWith(1, { startsAt, endsAt, memberId: 10 });
  });

  it("envia anexo de material ao armazenamento apenas para gestor da campanha", async () => {
    vi.mocked(db.getContentById).mockResolvedValue({ id: 22, campaignId: 1 } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member } as never);
    vi.mocked(storagePut).mockResolvedValue({ key: "campaigns/1/material.pdf", url: "/manus-storage/campaigns/1/material.pdf" });
    vi.mocked(db.saveCampaignContentAsset).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contents.attach({ id: 22, fileName: "material.pdf", mimeType: "application/pdf", base64: Buffer.from("arquivo").toString("base64") });
    expect(result.url).toBe("/manus-storage/campaigns/1/material.pdf");
    expect(db.saveCampaignContentAsset).toHaveBeenCalledWith(22, expect.objectContaining({ assetName: "material.pdf", assetMime: "application/pdf" }));
  });
});
