import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(), listFieldVisits: vi.fn(), syncFieldVisits: vi.fn(), getVoter: vi.fn(), listConsentRecords: vi.fn(), createConsentRecord: vi.fn(), getConsentRecord: vi.fn(), revokeConsentRecord: vi.fn(), listCrisisCases: vi.fn(), createCrisisCase: vi.fn(), getCrisisCase: vi.fn(), updateCrisisCase: vi.fn(), listCrisisDecisions: vi.fn(), addCrisisDecision: vi.fn(), getTerritoryHeatmap: vi.fn(), getMobilizationScores: vi.fn(), listCampaignSurveys: vi.fn(), createCampaignSurvey: vi.fn(), submitSurveyResponse: vi.fn(), getSurveySummary: vi.fn(), getPublicCampaign: vi.fn(), getVolunteerByEmail: vi.fn(), getVolunteerByAccessTokenHash: vi.fn(), createVolunteer: vi.fn(), listVolunteers: vi.fn(), getVolunteer: vi.fn(), updateVolunteer: vi.fn(), updateVolunteerPortalProfile: vi.fn(), listVolunteerAssignments: vi.fn(), createVolunteerAssignment: vi.fn(), getVolunteerAssignment: vi.fn(), updateVolunteerAssignmentStatus: vi.fn(), listVolunteerTrainingMaterials: vi.fn(), getVolunteerTrainingMaterial: vi.fn(), completeVolunteerTrainingMaterial: vi.fn(), getVolunteerTrainingCertificate: vi.fn(), getVolunteerTrainingCertificateByCode: vi.fn(), createVolunteerTrainingMaterial: vi.fn(), getTeamBenchmark: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const campaign = { id: 1, organizationId: 1, ownerId: 99, name: "Campanha", candidateName: "Candidata", electionLabel: "Vereança", region: "Cidade", status: "active", createdAt: new Date(), updatedAt: new Date() };
const adminMember = { id: 10, campaignId: 1, userId: 99, role: "admin" as const };
const partnerMember = { id: 12, campaignId: 1, userId: 12, role: "partner" as const };
function context(userId = 99): TrpcContext { return { user: { id: userId, openId: `priority-${userId}`, name: "Equipe", email: "team@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }

afterEach(() => vi.clearAllMocks());

describe("módulos prioritários", () => {
  it("sincroniza visitas de campo com referência idempotente", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: partnerMember, organizationMember: { role: "operator" } } as never);
    vi.mocked(db.syncFieldVisits).mockResolvedValue({ created: 1, duplicates: 0 });
    const caller = appRouter.createCaller(context(12));
    await expect(caller.field.sync({ campaignId: 1, visits: [{ clientReference: "d4f60e6b-fd4b-43ae-a6b0-5eb0587cd8f5", outcome: "contacted", notes: "Conversa registrada", occurredAt: new Date() }] })).resolves.toEqual({ created: 1, duplicates: 0 });
    expect(db.syncFieldVisits).toHaveBeenCalledWith([expect.objectContaining({ campaignId: 1, memberId: 12, clientReference: "d4f60e6b-fd4b-43ae-a6b0-5eb0587cd8f5" })]);
  });

  it("registra consentimento apenas para contato acessível ao integrante", async () => {
    vi.mocked(db.getVoter).mockResolvedValue({ id: 4, campaignId: 1, ownerMemberId: 12 } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: partnerMember, organizationMember: { role: "operator" } } as never);
    vi.mocked(db.createConsentRecord).mockResolvedValue(33);
    const caller = appRouter.createCaller(context(12));
    const expiresAt = new Date("2027-01-31T23:59:59Z");
    await expect(caller.consent.create({ voterId: 4, purpose: "Relacionamento consentido", source: "Visita", consentedAt: new Date(), expiresAt })).resolves.toEqual({ id: 33 });
    expect(db.createConsentRecord).toHaveBeenCalledWith(expect.objectContaining({ voterId: 4, campaignId: 1, createdByUserId: 12, expiresAt }));
    vi.mocked(db.getConsentRecord).mockResolvedValue({ id: 33, voterId: 4 } as never); vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: adminMember, organizationMember: { role: "admin" } } as never); vi.mocked(db.revokeConsentRecord).mockResolvedValue(undefined);
    await expect(appRouter.createCaller(context()).consent.revoke({ consentId: 33 })).resolves.toEqual({ success: true });
    expect(db.revokeConsentRecord).toHaveBeenCalledWith(expect.objectContaining({ consentId: 33, revokedAt: expect.any(Date) }));
  });

  it("reserva a sala de crise para perfis gestores", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: partnerMember, organizationMember: { role: "operator" } } as never);
    const partnerCaller = appRouter.createCaller(context(12));
    await expect(partnerCaller.crisis.list({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: adminMember, organizationMember: { role: "admin" } } as never);
    vi.mocked(db.createCrisisCase).mockResolvedValue(41);
    const adminCaller = appRouter.createCaller(context());
    const dueAt = new Date("2026-09-01T12:00:00Z");
    await expect(adminCaller.crisis.create({ campaignId: 1, title: "Informação incorreta", severity: "high", assignedToId: 10, dueAt })).resolves.toEqual({ id: 41 });
    expect(db.createCrisisCase).toHaveBeenCalledWith(expect.objectContaining({ assignedToId: 10, dueAt, createdByUserId: 99 }));
    vi.mocked(db.getCrisisCase).mockResolvedValue({ id: 41, campaignId: 1 } as never); vi.mocked(db.addCrisisDecision).mockResolvedValue(42);
    await expect(adminCaller.crisis.addDecision({ crisisId: 41, decision: "Revisar a informação e publicar esclarecimento." })).resolves.toEqual({ id: 42 });
    expect(db.addCrisisDecision).toHaveBeenCalledWith(expect.objectContaining({ crisisCaseId: 41, createdByUserId: 99 }));
  });

  it("reserva calor e score de mobilização para gestão da campanha", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: partnerMember, organizationMember: { role: "operator" } } as never);
    await expect(appRouter.createCaller(context(12)).insights.heatmap({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: adminMember, organizationMember: { role: "admin" } } as never);
    vi.mocked(db.getTerritoryHeatmap).mockResolvedValue([]); vi.mocked(db.getMobilizationScores).mockResolvedValue([]);
    const caller = appRouter.createCaller(context());
    await expect(caller.insights.heatmap({ campaignId: 1 })).resolves.toEqual([]);
    await expect(caller.insights.mobilization({ campaignId: 1 })).resolves.toEqual([]);
  });

  it("cria pesquisa e registra resposta com território da campanha", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: adminMember, organizationMember: { role: "admin" } } as never);
    vi.mocked(db.createCampaignSurvey).mockResolvedValue(71); vi.mocked(db.getSurveySummary).mockResolvedValue({ survey: { id: 71 }, total: 0, answers: [], territories: [] } as never); vi.mocked(db.submitSurveyResponse).mockResolvedValue(72);
    const caller = appRouter.createCaller(context());
    await expect(caller.insights.surveys.create({ campaignId: 1, title: "Pulso", question: "Prioridade?", responseType: "single_choice", options: ["Saúde", "Segurança"], status: "active" })).resolves.toEqual({ id: 71 });
    await expect(caller.insights.surveys.respond({ surveyId: 71, campaignId: 1, response: "Saúde", neighborhood: "Centro", region: "Norte" })).resolves.toEqual({ id: 72 });
    expect(db.submitSurveyResponse).toHaveBeenCalledWith(expect.objectContaining({ surveyId: 71, campaignId: 1, neighborhood: "Centro", region: "Norte", submittedByUserId: 99 }));
  });

  it("recebe inscrição consentida de voluntário sem expor o painel administrativo", async () => {
    vi.mocked(db.getPublicCampaign).mockResolvedValue(campaign as never); vi.mocked(db.getVolunteerByEmail).mockResolvedValue(null); vi.mocked(db.createVolunteer).mockResolvedValue(81);
    const result = await appRouter.createCaller(context()).volunteers.publicSignup({ campaignId: 1, name: "Ana Voluntária", email: "ana@example.com", neighborhood: "Centro", region: "Norte", consent: true });
    expect(result).toEqual(expect.objectContaining({ id: 81, alreadyRegistered: false, portalToken: expect.any(String) }));
    expect(db.createVolunteer).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, email: "ana@example.com", accessTokenHash: expect.any(String), consent: true, status: "pending" }));
  });

  it("retorna somente o portal do voluntário associado ao token privado", async () => {
    vi.mocked(db.getVolunteerByAccessTokenHash).mockResolvedValue({ id: 81, campaignId: 1, name: "Ana Voluntária", neighborhood: "Centro", region: "Norte", availability: "Sábado", skills: "Eventos", trainingStatus: "in_progress", status: "active" } as never); vi.mocked(db.listVolunteerAssignments).mockResolvedValue([{ id: 90, volunteerId: 81, title: "Apoiar reunião", status: "assigned" }] as never); vi.mocked(db.listVolunteerTrainingMaterials).mockResolvedValue([{ id: 91, title: "Conduta", materialType: "guide", durationMinutes: 10, completedAt: null }] as never); vi.mocked(db.getVolunteerTrainingCertificate).mockResolvedValue(null);
    await expect(appRouter.createCaller(context()).volunteers.portal({ token: "x".repeat(32) })).resolves.toEqual(expect.objectContaining({ volunteer: expect.objectContaining({ name: "Ana Voluntária", trainingStatus: "in_progress" }), assignments: [expect.objectContaining({ id: 90, title: "Apoiar reunião" })], certificate: null }));
  });

  it("permite que o voluntário confirme apenas material ativo da própria campanha", async () => {
    vi.mocked(db.getVolunteerByAccessTokenHash).mockResolvedValue({ id: 81, campaignId: 1 } as never); vi.mocked(db.getVolunteerTrainingMaterial).mockResolvedValue({ id: 91, campaignId: 1, active: true } as never); vi.mocked(db.completeVolunteerTrainingMaterial).mockResolvedValue({ completed: 2, total: 2, trainingStatus: "completed", certificate: { certificateCode: "W9-TESTE", issuedAt: new Date("2026-08-19T12:00:00Z"), completedMaterials: 2 } } as never);
    await expect(appRouter.createCaller(context()).volunteers.completeTrainingMaterial({ token: "x".repeat(32), materialId: 91 })).resolves.toEqual(expect.objectContaining({ completed: 2, total: 2, trainingStatus: "completed", certificate: expect.objectContaining({ certificateCode: "W9-TESTE" }) }));
    expect(db.completeVolunteerTrainingMaterial).toHaveBeenCalledWith({ campaignId: 1, materialId: 91, volunteerId: 81 });
  });

  it("reserva a publicação de materiais de treinamento à coordenação", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: partnerMember, organizationMember: { role: "operator" } } as never);
    await expect(appRouter.createCaller(context(12)).volunteers.training.create({ campaignId: 1, title: "Guia de campo" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: adminMember, organizationMember: { role: "admin" } } as never); vi.mocked(db.createVolunteerTrainingMaterial).mockResolvedValue(101);
    await expect(appRouter.createCaller(context()).volunteers.training.create({ campaignId: 1, title: "Guia de campo", content: "Leia antes da visita.", durationMinutes: 12 })).resolves.toEqual({ id: 101 });
    expect(db.createVolunteerTrainingMaterial).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, title: "Guia de campo", createdByUserId: 99 }));
  });

  it("valida o certificado pelo QR Code somente para a coordenação da campanha", async () => {
    const certificate = { certificateCode: "W9-CERTIFICADO", campaignId: 1, organizationId: 1, volunteerName: "Ana Voluntária", campaignName: "Campanha", candidateName: "Candidata", completedMaterials: 3, issuedAt: new Date("2026-08-19T12:00:00Z") };
    vi.mocked(db.getVolunteerTrainingCertificateByCode).mockResolvedValue(certificate as never); vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: partnerMember, organizationMember: { role: "operator" } } as never);
    await expect(appRouter.createCaller(context(12)).volunteers.certificates.validate({ certificateCode: "W9-CERTIFICADO" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: adminMember, organizationMember: { role: "admin" } } as never);
    await expect(appRouter.createCaller(context()).volunteers.certificates.validate({ certificateCode: "W9-CERTIFICADO" })).resolves.toEqual(expect.objectContaining({ certificateCode: "W9-CERTIFICADO", volunteerName: "Ana Voluntária", completedMaterials: 3 }));
  });

  it("restringe benchmark regional a gestores e retorna somente agregados", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: partnerMember, organizationMember: { role: "operator" } } as never);
    await expect(appRouter.createCaller(context(12)).team.benchmark({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.mocked(db.getCampaignAccess).mockResolvedValue({ campaign, member: adminMember, organizationMember: { role: "admin" } } as never); vi.mocked(db.getTeamBenchmark).mockResolvedValue([{ region: "Norte", memberCount: 2, suppressed: false, tasks: 8, completed: 5, events: 2, visits: 4, productivityIndex: 19 }] as never);
    await expect(appRouter.createCaller(context()).team.benchmark({ campaignId: 1 })).resolves.toEqual([expect.objectContaining({ region: "Norte", memberCount: 2, productivityIndex: 19 })]);
  });
});
