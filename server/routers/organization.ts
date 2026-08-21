import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import * as db from "../campaignDb";
import { protectedProcedure, router } from "../_core/trpc";
import { securityReleaseReports } from "../securityReport";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function requireOrganizationAdmin(userId: number, organizationId: number) {
  const member = await db.getOrganizationMembership(userId, organizationId);
  if (!member || !["admin", "manager"].includes(member.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui permissão para administrar esta organização." });
  return member;
}

async function requireOrganizationOwner(userId: number, organizationId: number) {
  const member = await db.getOrganizationMembership(userId, organizationId);
  if (!member || member.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem alterar papéis nesta organização." });
  return member;
}

export const organizationRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => db.listOrganizationsForUser(ctx.user.id)),
  create: protectedProcedure.input(z.object({ name: z.string().min(2).max(180), legalName: z.string().max(220).optional(), fiscalId: z.string().max(32).optional() })).mutation(async ({ ctx, input }) => ({ organizationId: await db.createOrganizationForUser({ userId: ctx.user.id, ...input }) })),
  select: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const membership = await db.getOrganizationMembership(ctx.user.id, input.organizationId);
    if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Organização não disponível para este usuário." });
    return membership;
  }),
  members: router({
    list: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const member = await db.getOrganizationMembership(ctx.user.id, input.organizationId);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      return db.listOrganizationMembers(input.organizationId);
    }),
    updateRole: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), memberId: z.number().int().positive(), role: z.enum(["admin", "manager", "operator", "viewer"]) })).mutation(async ({ ctx, input }) => {
      await requireOrganizationOwner(ctx.user.id, input.organizationId);
      await db.updateOrganizationMemberRole({ ...input, actorUserId: ctx.user.id });
      return { success: true };
    }),
  }),
  invitations: router({
    list: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOrganizationAdmin(ctx.user.id, input.organizationId);
      return db.listOrganizationInvitations(input.organizationId);
    }),
    create: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), phone: z.string().trim().min(8).max(32).regex(/^\+?[0-9()\s.-]+$/, "Informe um telefone válido."), role: z.enum(["admin", "manager", "operator", "viewer"]).default("operator") })).mutation(async ({ ctx, input }) => {
      await requireOrganizationAdmin(ctx.user.id, input.organizationId);
      const token = randomBytes(32).toString("base64url");
      const invitationId = await db.createOrganizationInvitation({ organizationId: input.organizationId, phone: input.phone, role: input.role, tokenHash: hashToken(token), invitedById: ctx.user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
      return { invitationId, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
    }),
    accept: protectedProcedure.input(z.object({ token: z.string().min(32).max(128) })).mutation(async ({ ctx, input }) => {
      return { organizationId: await db.acceptOrganizationInvitation({ userId: ctx.user.id, tokenHash: hashToken(input.token) }) };
    }),
  }),
  audit: router({
    list: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), limit: z.number().int().min(1).max(200).default(100) })).query(async ({ ctx, input }) => {
      await requireOrganizationAdmin(ctx.user.id, input.organizationId);
      return db.listOrganizationAuditLogs(input.organizationId, input.limit);
    }),
    securityReport: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireOrganizationAdmin(ctx.user.id, input.organizationId);
      return securityReleaseReports;
    }),
  }),
  performance: router({
    reportClientError: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), route: z.string().max(240), source: z.enum(["error_boundary", "window_error", "unhandled_rejection", "query_error", "mutation_error"]), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), message: z.string().min(1).max(280) })).mutation(async ({ ctx, input }) => {
      const membership = await db.getOrganizationMembership(ctx.user.id, input.organizationId);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
      await db.recordClientInterfaceError({ ...input, userId: ctx.user.id });
      return { recorded: true };
    }),
    byRoute: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), days: z.number().int().min(1).max(90).default(7) })).query(async ({ ctx, input }) => {
      await requireOrganizationAdmin(ctx.user.id, input.organizationId);
      return db.getRoutePerformanceMetrics(input);
    }),
  }),
});
