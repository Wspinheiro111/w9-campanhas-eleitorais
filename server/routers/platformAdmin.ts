import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as campaignDb from "../campaignDb";

const platformAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito à administração geral." });
  return next();
});

const phoneSchema = z.string().transform(value => value.replace(/\D/g, "")).refine(value => value.length === 10 || value.length === 11, "Informe um telefone brasileiro válido.");

export const platformAdminRouter = router({
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
    history: platformAdminProcedure.input(z.object({ customerId: z.number().int().positive() })).query(async ({ input }) => campaignDb.listPlatformCustomerInteractions(input.customerId)),
    addInteraction: platformAdminProcedure.input(z.object({ customerId: z.number().int().positive(), kind: z.string().trim().min(2).max(48), description: z.string().trim().min(3).max(4000) })).mutation(async ({ ctx, input }) => {
      const interactionId = await campaignDb.addPlatformCustomerInteraction({ ...input, actorUserId: ctx.user.id });
      return { interactionId };
    }),
  }),
});
