import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./campaignDb", () => ({
  getCampaignAccess: vi.fn(),
  updateCampaignDetails: vi.fn(),
  createMember: vi.fn(),
  getEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  getPublicEvent: vi.fn(),
  registerForPublicEvent: vi.fn(),
  getEventParticipationSummary: vi.fn(),
  listEventRegistrations: vi.fn(),
  updateEventRegistrationStatus: vi.fn(),
  getEventRegistrationByAccessToken: vi.fn(),
  submitEventFeedback: vi.fn(),
  deleteEventIfEmpty: vi.fn(),
  listFieldPlaybooks: vi.fn(),
  getFieldPlaybook: vi.fn(),
  createFieldPlaybook: vi.fn(),
  updateFieldPlaybook: vi.fn(),
  listCommunicationCandidates: vi.fn(),
  upsertVoterCommunicationPreference: vi.fn(),
  listCommunicationTemplates: vi.fn(),
  createCommunicationTemplate: vi.fn(),
  getCommunicationTemplate: vi.fn(),
  updateCommunicationTemplate: vi.fn(),
  logManualCommunication: vi.fn(),
  listCommunicationLogs: vi.fn(),
  saveIndicator: vi.fn(),
  getDashboardData: vi.fn(),
  getReportData: vi.fn(),
  createIncident: vi.fn(),
  listIncidents: vi.fn(),
  getVoter: vi.fn(),
  listVoterInteractions: vi.fn(),
  createVoterInteraction: vi.fn(),
  createTask: vi.fn(),
  getTask: vi.fn(),
  updateTaskStatus: vi.fn(),
}));

import * as db from "./campaignDb";
import { appRouter } from "./routers";

const campaign = { id: 1, ownerId: 99, name: "Campanha", candidateName: "Candidata", electionLabel: "Vereança", region: "Cidade", status: "active", createdAt: new Date(), updatedAt: new Date() };

function context(): TrpcContext {
  return {
    user: { id: 99, openId: "route-test", name: "Usuário", email: "user@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {}, get: () => "example.test" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function access(role: "admin" | "coordinator" | "partner", memberId = 10) {
  return { campaign, member: { id: memberId, campaignId: 1, userId: 99, role } };
}

afterEach(() => vi.clearAllMocks());

describe("routers operacionais da campanha", () => {
  it("permite que administrador atualize os dados da campanha e do candidato", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.updateCampaignDetails).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(context());
    await expect(caller.campaign.updateDetails({ campaignId: 1, name: "Nova Campanha", candidateName: "Novo Nome", electionLabel: "Prefeitura", region: "Nova Região", status: "active" })).resolves.toEqual({ success: true });
    expect(db.updateCampaignDetails).toHaveBeenCalledWith(1, expect.objectContaining({ candidateName: "Novo Nome" }));
  });

  it("impede parceiro de editar um compromisso da agenda", async () => {
    vi.mocked(db.getEvent).mockResolvedValue({ id: 77, campaignId: 1 } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner") as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.planning.update({ eventId: 77, title: "Reunião", type: "meeting", startsAt: new Date(), status: "scheduled" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.updateEvent).not.toHaveBeenCalled();
  });

  it("reserva a inclusão de equipe ao administrador", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator") as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.team.create({ campaignId: 1, name: "Parceiro", email: "parceiro@example.com", role: "partner" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.createMember).not.toHaveBeenCalled();
  });

  it("permite que administrador inclua um membro na equipe", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.createMember).mockResolvedValue(41);
    const caller = appRouter.createCaller(context());
    await expect(caller.team.create({ campaignId: 1, name: "Nova Parceira", email: "nova@example.com", role: "partner" })).resolves.toEqual({ id: 41 });
    expect(db.createMember).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, role: "partner" }));
  });

  it("permite que coordenador crie um compromisso na agenda", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator") as never);
    vi.mocked(db.createEvent).mockResolvedValue(19);
    const caller = appRouter.createCaller(context());
    await expect(caller.planning.create({ campaignId: 1, title: "Visita", type: "visit", startsAt: new Date() })).resolves.toEqual({ id: 19 });
    expect(db.createEvent).toHaveBeenCalled();
  });

  it("permite RSVP público apenas para evento disponível", async () => {
    vi.mocked(db.registerForPublicEvent).mockResolvedValue({ id: 31, accessToken: "token-publico-de-evento-comprido", alreadyRegistered: false } as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.publicEvents.register({ eventId: 7, name: "Participante", email: "participante@example.com" })).resolves.toMatchObject({ id: 31, alreadyRegistered: false });
    expect(db.registerForPublicEvent).toHaveBeenCalledWith(expect.objectContaining({ eventId: 7, email: "participante@example.com" }));
  });

  it("impede parceiro de alterar check-in do evento", async () => {
    vi.mocked(db.getEvent).mockResolvedValue({ id: 7, campaignId: 1 } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner") as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.planning.updateRegistrationStatus({ eventId: 7, registrationId: 12, status: "checked_in" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.updateEventRegistrationStatus).not.toHaveBeenCalled();
  });

  it("permite avaliação apenas por token de inscrição válido", async () => {
    vi.mocked(db.getEventRegistrationByAccessToken).mockResolvedValue({ registration: { name: "Participante", status: "checked_in" }, event: { id: 7, title: "Encontro" }, campaign: { id: 1, name: "Campanha" } } as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.publicEvents.feedback({ token: "token-publico-de-evento-comprido" })).resolves.toMatchObject({ registration: { name: "Participante" } });
  });

  it("restringe a central assistida de comunicação à coordenação", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner") as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.communication.candidates({ campaignId: 1, channel: "email" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.listCommunicationCandidates).not.toHaveBeenCalled();
  });

  it("permite à coordenação criar modelo para comunicação manual", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator") as never);
    vi.mocked(db.createCommunicationTemplate).mockResolvedValue(42);
    const caller = appRouter.createCaller(context());
    await expect(caller.communication.templates.create({ campaignId: 1, title: "Convite", channel: "email", subject: "Convite", body: "Olá, {{nome}}" })).resolves.toEqual({ id: 42 });
    expect(db.createCommunicationTemplate).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, createdByUserId: 99 }));
  });

  it("reserva a criação de playbook de campo para a coordenação", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner") as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.field.playbooks.create({ campaignId: 1, title: "Abordagem territorial", talkingPoints: ["Apresentar proposta"], checklist: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.createFieldPlaybook).not.toHaveBeenCalled();
  });

  it("permite à coordenação criar playbook versionado de campo", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator") as never);
    vi.mocked(db.createFieldPlaybook).mockResolvedValue(8);
    const caller = appRouter.createCaller(context());
    await expect(caller.field.playbooks.create({ campaignId: 1, title: "Abordagem territorial", talkingPoints: ["Apresentar proposta"], checklist: ["Registrar demanda"], status: "active" })).resolves.toEqual({ id: 8 });
    expect(db.createFieldPlaybook).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 1, createdByUserId: 99, status: "active" }));
  });

  it("bloqueia exclusão de evento com inscrições e orienta cancelamento", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator") as never);
    vi.mocked(db.getEvent).mockResolvedValue({ id: 9, campaignId: 1 } as never);
    vi.mocked(db.deleteEventIfEmpty).mockRejectedValue(new Error("EVENT_HAS_REGISTRATIONS"));
    const caller = appRouter.createCaller(context());
    await expect(caller.planning.remove({ eventId: 9 })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("Cancele-o") });
  });

  it("permite que coordenador atualize um indicador da campanha", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator") as never);
    vi.mocked(db.saveIndicator).mockResolvedValue(4);
    const caller = appRouter.createCaller(context());
    await expect(caller.monitoring.indicators.save({ campaignId: 1, label: "Visitas", currentValue: 12, targetValue: 30, unit: "visitas" })).resolves.toEqual({ id: 4 });
    expect(db.saveIndicator).toHaveBeenCalledWith(expect.objectContaining({ label: "Visitas", currentValue: 12 }));
  });

  it("atribui responsável na criação de tarefa por perfil com gestão", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.createTask).mockResolvedValue(8);
    const caller = appRouter.createCaller(context());
    await expect(caller.tasks.create({ campaignId: 1, title: "Confirmar pauta", priority: "high", assignedToId: 21 })).resolves.toEqual({ id: 8 });
    expect(db.createTask).toHaveBeenCalledWith(expect.objectContaining({ assignedToId: 21, createdById: 99 }));
  });

  it("permite que parceiro atualize somente a tarefa que lhe pertence", async () => {
    vi.mocked(db.getTask).mockResolvedValue({ id: 6, campaignId: 1, assignedToId: 10 } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10) as never);
    vi.mocked(db.updateTaskStatus).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(context());
    await expect(caller.tasks.updateStatus({ taskId: 6, status: "done" })).resolves.toEqual({ success: true });
    expect(db.updateTaskStatus).toHaveBeenCalledWith(6, "done");
  });

  it("impede parceiro de consultar interações de contato de outro responsável", async () => {
    vi.mocked(db.getVoter).mockResolvedValue({ id: 5, campaignId: 1, ownerMemberId: 22 } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10) as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.voters.interactions({ voterId: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.listVoterInteractions).not.toHaveBeenCalled();
  });

  it("permite a consulta do painel para parceiro com escopo próprio", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10) as never);
    vi.mocked(db.getDashboardData).mockResolvedValue({ metrics: {}, upcomingEvents: [], recentIncidents: [], indicators: [] } as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.dashboard.summary({ campaignId: 1 })).resolves.toMatchObject({ metrics: {} });
    expect(db.getDashboardData).toHaveBeenCalledWith(1, 10);
  });

  it("permite ao coordenador consultar o painel consolidado", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("coordinator", 10) as never);
    vi.mocked(db.getDashboardData).mockResolvedValue({ metrics: { tasks: 1 }, upcomingEvents: [], recentIncidents: [], indicators: [] } as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.dashboard.summary({ campaignId: 1 })).resolves.toMatchObject({ metrics: { tasks: 1 } });
    expect(db.getDashboardData).toHaveBeenCalledWith(1, null);
  });

  it("bloqueia painel e monitoramento para usuário sem vínculo com a campanha", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(null);
    const caller = appRouter.createCaller(context());
    await expect(caller.dashboard.summary({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.monitoring.list({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.monitoring.create({ campaignId: 1, title: "Registro", description: "Descrição de teste válida.", category: "Campo", priority: "low" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getDashboardData).not.toHaveBeenCalled();
    expect(db.createIncident).not.toHaveBeenCalled();
  });

  it("bloqueia relatórios consolidados para parceiro", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10) as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.reports.summary({ campaignId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getReportData).not.toHaveBeenCalled();
  });

  it("permite ao administrador acessar o relatório consolidado", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("admin") as never);
    vi.mocked(db.getReportData).mockResolvedValue({ goals: [], tasks: [], voters: 0, events: 0, incidents: 0 });
    const caller = appRouter.createCaller(context());
    await expect(caller.reports.summary({ campaignId: 1 })).resolves.toEqual({ goals: [], tasks: [], voters: 0, events: 0, incidents: 0 });
  });

  it("permite que parceiro registre e consulte ocorrências no seu escopo", async () => {
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10) as never);
    vi.mocked(db.createIncident).mockResolvedValue(61);
    vi.mocked(db.listIncidents).mockResolvedValue([]);
    const caller = appRouter.createCaller(context());
    await expect(caller.monitoring.create({ campaignId: 1, title: "Atenção no local", description: "Equipe relatou necessidade de acompanhamento.", category: "Campo", priority: "medium" })).resolves.toEqual({ id: 61 });
    await expect(caller.monitoring.list({ campaignId: 1 })).resolves.toEqual([]);
    expect(db.createIncident).toHaveBeenCalledWith(expect.objectContaining({ reportedById: 10 }));
    expect(db.listIncidents).toHaveBeenCalledWith(1, 10);
  });

  it("permite que parceiro registre interação no contato sob sua responsabilidade", async () => {
    vi.mocked(db.getVoter).mockResolvedValue({ id: 5, campaignId: 1, ownerMemberId: 10 } as never);
    vi.mocked(db.getCampaignAccess).mockResolvedValue(access("partner", 10) as never);
    vi.mocked(db.createVoterInteraction).mockResolvedValue(31);
    const caller = appRouter.createCaller(context());
    await expect(caller.voters.addInteraction({ voterId: 5, type: "visit", notes: "Contato realizado." })).resolves.toEqual({ id: 31 });
    expect(db.createVoterInteraction).toHaveBeenCalledWith(expect.objectContaining({ memberId: 10 }));
  });

  it("bloqueia o processamento de áudio CRM sem sessão", async () => {
    const anonymous = { ...context(), user: null };
    const caller = appRouter.createCaller(anonymous);
    await expect(caller.ai.processAudioCrm({ campaignId: 1, filename: "relato.webm", mimeType: "audio/webm", dataBase64: "data:audio/webm;base64,AAAA", consentConfirmed: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
