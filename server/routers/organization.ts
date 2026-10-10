import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import * as db from "../campaignDb";
import { protectedProcedure, router } from "../_core/trpc";
import { organizationCapabilityProcedure } from "../campaignAuthorization";
import { securityReleaseReports } from "../securityReport";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const organizationIdInput = z.object({ organizationId: z.number().int().positive() });

export const organizationRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => db.listOrganizationsForUser(ctx.user.id)),
  create: protectedProcedure.input(z.object({ name: z.string().min(2).max(180), legalName: z.string().max(220).optional(), fiscalId: z.string().max(32).optional() })).mutation(async ({ ctx, input }) => ({ organizationId: await db.createOrganizationForUser({ userId: ctx.user.id, ...input }) })),
  select: organizationCapabilityProcedure("organization.read").input(organizationIdInput).query(async ({ ctx }) => ctx.organizationAuthorization.membership),
  members: router({
    list: organizationCapabilityProcedure("organization.read").input(organizationIdInput).query(async ({ input }) => db.listOrganizationMembers(input.organizationId)),
    updateRole: organizationCapabilityProcedure("organization.roles.manage").input(organizationIdInput.extend({ memberId: z.number().int().positive(), role: z.enum(["admin", "manager", "operator", "viewer"]) })).mutation(async ({ ctx, input }) => {
      await db.updateOrganizationMemberRole({ ...input, actorUserId: ctx.user.id });
      return { success: true };
    }),
  }),
  invitations: router({
    list: organizationCapabilityProcedure("organization.invitations.manage").input(organizationIdInput).query(async ({ input }) => db.listOrganizationInvitations(input.organizationId)),
    create: organizationCapabilityProcedure("organization.invitations.manage").input(organizationIdInput.extend({ phone: z.string().trim().min(8).max(32).regex(/^\+?[0-9()\s.-]+$/, "Informe um telefone válido."), role: z.enum(["admin", "manager", "operator", "viewer"]).default("operator") })).mutation(async ({ ctx, input }) => {
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const invitationId = await db.createOrganizationInvitation({ organizationId: input.organizationId, phone: input.phone, role: input.role, tokenHash: hashToken(token), invitedById: ctx.user.id, expiresAt });
      return { invitationId, token, expiresAt };
    }),
    accept: protectedProcedure.input(z.object({ token: z.string().min(32).max(128) })).mutation(async ({ ctx, input }) => {
      return { organizationId: await db.acceptOrganizationInvitation({ userId: ctx.user.id, tokenHash: hashToken(input.token) }) };
    }),
  }),
  audit: router({
    list: organizationCapabilityProcedure("organization.audit.read").input(organizationIdInput.extend({ limit: z.number().int().min(1).max(200).default(100) })).query(async ({ input }) => db.listOrganizationAuditLogs(input.organizationId, input.limit)),
    securityReport: organizationCapabilityProcedure("organization.audit.read").input(organizationIdInput).query(async () => securityReleaseReports),
  }),
  performance: router({
    reportClientError: organizationCapabilityProcedure("organization.read").input(organizationIdInput.extend({ route: z.string().max(240), source: z.enum(["error_boundary", "window_error", "unhandled_rejection", "query_error", "mutation_error"]), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), message: z.string().min(1).max(280) })).mutation(async ({ ctx, input }) => {
      await db.recordClientInterfaceError({ ...input, userId: ctx.user.id });
      return { recorded: true };
    }),
    byRoute: organizationCapabilityProcedure("organization.performance.read").input(organizationIdInput.extend({ days: z.number().int().min(1).max(90).default(7) })).query(async ({ input }) => db.getRoutePerformanceMetrics(input)),
  }),
});
