import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../campaignDb";

const resellerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso reservado ao painel de revendedor." });
  return next();
});

const organizationStatus = z.enum(["active", "suspended", "archived"]);
const proposalStatus = z.enum(["draft", "sent", "negotiation", "accepted", "lost", "archived"]);

export const resellerRouter = router({
  overview: resellerProcedure.query(async ({ ctx }) => {
    const [clients, proposals] = await Promise.all([db.listResellerClients(ctx.user.id), db.listResellerProposals(ctx.user.id)]);
    return { clients, proposals, summary: { totalClients: clients.length, activeClients: clients.filter(item => item.client.active && item.organization.status === "active").length, openProposals: proposals.filter(item => ["draft", "sent", "negotiation"].includes(item.status)).length } };
  }),
  clients: router({
    create: resellerProcedure.input(z.object({ name: z.string().min(2).max(180), legalName: z.string().max(220).optional(), fiscalId: z.string().max(32).optional() })).mutation(async ({ ctx, input }) => ({ organizationId: await db.createResellerClient({ resellerUserId: ctx.user.id, ...input }) })),
    linkExisting: resellerProcedure.input(z.object({ organizationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => ({ organizationId: await db.linkResellerClient({ resellerUserId: ctx.user.id, ...input }) })),
    update: resellerProcedure.input(z.object({ organizationId: z.number().int().positive(), name: z.string().min(2).max(180), legalName: z.string().max(220).nullable().optional(), fiscalId: z.string().max(32).nullable().optional(), status: organizationStatus })).mutation(async ({ ctx, input }) => { await db.updateResellerClient({ resellerUserId: ctx.user.id, ...input }); return { success: true }; }),
    openSupport: resellerProcedure.input(z.object({ organizationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => ({ organizationId: await db.openResellerSupportAccess({ resellerUserId: ctx.user.id, ...input }) })),
  }),
  proposals: router({
    create: resellerProcedure.input(z.object({ organizationId: z.number().int().positive().nullable().optional(), title: z.string().min(2).max(180), contactName: z.string().max(180).optional(), contactPhone: z.string().max(32).optional(), notes: z.string().max(3000).optional() })).mutation(async ({ ctx, input }) => ({ proposalId: await db.createResellerProposal({ resellerUserId: ctx.user.id, ...input }) })),
    updateStatus: resellerProcedure.input(z.object({ proposalId: z.number().int().positive(), status: proposalStatus })).mutation(async ({ ctx, input }) => { await db.updateResellerProposalStatus({ resellerUserId: ctx.user.id, ...input }); return { success: true }; }),
  }),
});
