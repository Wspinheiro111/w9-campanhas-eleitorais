import { createHash, randomBytes } from "node:crypto";
import { parse as parseCookie } from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { protectedProcedure, router } from "../_core/trpc";
import * as campaignDb from "../campaignDb";

const platformAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito à administração geral." });
  return next();
});

const phoneSchema = z.string().transform(value => value.replace(/\D/g, "")).refine(value => value.length === 10 || value.length === 11, "Informe um telefone brasileiro válido.");
const portfolioFrequencySchema = z.enum(["daily", "weekly", "monthly"]);
const portfolioCronByFrequency = { daily: "0 0 12 * * *", weekly: "0 0 12 * * 1", monthly: "0 0 12 1 * *" } as const;

export const platformAdminRouter = router({
  demoRequests: router({
    list: platformAdminProcedure.query(() => campaignDb.listPlatformDemoRequests()),
    unseenCount: platformAdminProcedure.query(() => campaignDb.countUnviewedPlatformDemoRequests()),
    markViewed: platformAdminProcedure.mutation(async () => {
      await campaignDb.markPlatformDemoRequestsViewed();
      return { updated: true };
    }),
    setStatus: platformAdminProcedure.input(z.object({ requestId: z.number().int().positive(), status: z.enum(["new", "contacted", "qualified", "converted", "archived"]) })).mutation(async ({ input }) => {
      await campaignDb.updatePlatformDemoRequestStatus(input);
      return { updated: true };
    }),
  }),
  contactRequests: router({
    list: platformAdminProcedure.query(() => campaignDb.listPlatformContactRequests()),
    unseenCount: platformAdminProcedure.query(() => campaignDb.countUnviewedPlatformContactRequests()),
    markViewed: platformAdminProcedure.mutation(async () => {
      await campaignDb.markPlatformContactRequestsViewed();
      return { updated: true };
    }),
    setStatus: platformAdminProcedure.input(z.object({ requestId: z.number().int().positive(), status: z.enum(["new", "contacted", "archived"]) })).mutation(async ({ input }) => {
      await campaignDb.updatePlatformContactRequestStatus(input);
      return { updated: true };
    }),
  }),
  customers: router({
    list: platformAdminProcedure.query(() => campaignDb.listPlatformCustomers()),
    create: platformAdminProcedure.input(z.object({ organizationName: z.string().min(2).max(160), legalName: z.string().max(220).optional(), fiscalId: z.string().max(32).optional(), contactName: z.string().min(2).max(180), contactPhone: phoneSchema })).mutation(async ({ ctx, input }) => campaignDb.createPlatformCustomer({ ...input, actorUserId: ctx.user.id })),
    releaseAccess: platformAdminProcedure.input(z.object({ customerId: z.number().int().positive(), role: z.enum(["admin", "manager", "operator", "viewer"]).default("admin"), origin: z.string().url() })).mutation(async ({ ctx, input }) => {
      const customer = await campaignDb.getPlatformCustomer(input.customerId);
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Comprador não encontrado." });
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const invitationId = await campaignDb.createOrganizationInvitation({ organizationId: customer.organization.id, phone: customer.customer.contactPhone, role: input.role, tokenHash, invitedById: ctx.user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
      await campaignDb.markPlatformCustomerAccessReleased({ customerId: input.customerId, invitationId, actorUserId: ctx.user.id });
      return { invitationUrl: `${input.origin}/onboarding?invite=${token}`, phone: customer.customer.contactPhone };
    }),
    setStatus: platformAdminProcedure.input(z.object({ customerId: z.number().int().positive(), status: z.enum(["active", "suspended"]) })).mutation(async ({ ctx, input }) => {
      await campaignDb.updatePlatformCustomerStatus({ ...input, actorUserId: ctx.user.id });
      return { updated: true };
    }),
    history: platformAdminProcedure.input(z.object({ customerId: z.number().int().positive(), kind: z.string().trim().min(2).max(48).optional() })).query(async ({ input }) => campaignDb.listPlatformCustomerInteractions(input.customerId, input.kind)),
    addInteraction: platformAdminProcedure.input(z.object({ customerId: z.number().int().positive(), kind: z.string().trim().min(2).max(48), description: z.string().trim().min(3).max(4000) })).mutation(async ({ ctx, input }) => {
      const interactionId = await campaignDb.addPlatformCustomerInteraction({ ...input, actorUserId: ctx.user.id });
      return { interactionId };
    }),
    scheduleNextContact: platformAdminProcedure.input(z.object({ customerId: z.number().int().positive(), nextContactAt: z.date(), note: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      if (input.nextContactAt.getTime() < Date.now() - 60_000) throw new TRPCError({ code: "BAD_REQUEST", message: "O próximo contato deve ser agendado para agora ou para uma data futura." });
      await campaignDb.schedulePlatformCustomerNextContact({ ...input, actorUserId: ctx.user.id });
      return { scheduled: true };
    }),
  }),
  portfolioReports: router({
    schedule: platformAdminProcedure.query(() => campaignDb.getPlatformCustomerPortfolioSchedule()),
    history: platformAdminProcedure.query(() => campaignDb.listPlatformCustomerPortfolioReports()),
    configure: platformAdminProcedure.input(z.object({ frequency: portfolioFrequencySchema })).mutation(async ({ ctx, input }) => {
      const cron = portfolioCronByFrequency[input.frequency];
      const current = await campaignDb.getPlatformCustomerPortfolioSchedule();
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (current) {
        await updateHeartbeatJob(current.scheduleTaskUid, { cron, path: "/api/scheduled/platform-customer-portfolio", enable: true, description: "Relatório semanal interno da carteira de clientes" }, sessionToken);
        await campaignDb.savePlatformCustomerPortfolioSchedule({ cron, frequency: input.frequency, scheduleTaskUid: current.scheduleTaskUid, actorUserId: ctx.user.id });
        return { taskUid: current.scheduleTaskUid, activated: true };
      }
      const job = await createHeartbeatJob({ name: `platform-customer-portfolio-${ctx.user.id}`, cron, path: "/api/scheduled/platform-customer-portfolio", payload: {}, description: "Relatório semanal interno da carteira de clientes" }, sessionToken);
      await campaignDb.savePlatformCustomerPortfolioSchedule({ cron, frequency: input.frequency, scheduleTaskUid: job.taskUid, actorUserId: ctx.user.id });
      return { taskUid: job.taskUid, activated: true, nextExecutionAt: job.nextExecutionAt ?? null };
    }),
    markViewed: platformAdminProcedure.mutation(async () => { await campaignDb.markPlatformCustomerPortfolioReportsViewed(); return { updated: true }; }),
  }),
});
