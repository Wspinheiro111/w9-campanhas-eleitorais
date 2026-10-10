import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../campaignDb";
import {
  campaignCapabilityProcedure,
  requireOrganizationAuthorization,
  requireOrganizationCapability,
} from "../campaignAuthorization";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { isValidIanaTimeZone } from "../syntheticContentPolicy";

const campaignIdInput = z.object({ campaignId: z.number().int().positive() });

function validateElectionConfiguration(electionEndsAt: Date | null | undefined, electionTimeZone: string | null | undefined) {
  const hasEnd = Boolean(electionEndsAt);
  const hasZone = Boolean(electionTimeZone?.trim());
  if (hasEnd !== hasZone) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Informe juntos o término do pleito e o timezone da campanha." });
  }
  if (hasZone && !isValidIanaTimeZone(electionTimeZone)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Informe um timezone IANA válido para a campanha." });
  }
}

export const campaignRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (input?.organizationId) {
        requireOrganizationCapability(
          await requireOrganizationAuthorization(ctx.user.id, input.organizationId),
          "organization.read",
        );
      }
      return db.listCampaignsForUser(ctx.user.id, input?.organizationId);
    }),

  create: protectedProcedure
    .input(z.object({
      organizationId: z.number().int().positive().optional(),
      name: z.string().min(3).max(160),
      candidateName: z.string().min(3).max(160),
      electionLabel: z.string().min(3).max(120),
      electionEndsAt: z.date().nullable().optional(),
      electionTimeZone: z.string().trim().max(80).nullable().optional(),
      region: z.string().min(2).max(160),
    }))
    .mutation(async ({ ctx, input }) => {
      validateElectionConfiguration(input.electionEndsAt, input.electionTimeZone);
      const organizationId = input.organizationId ?? await db.getOrCreateInitialOrganization(ctx.user.id, ctx.user.name);
      requireOrganizationCapability(
        await requireOrganizationAuthorization(ctx.user.id, organizationId),
        "organization.manage",
      );
      const id = await db.createCampaignWithOwner({
        organizationId,
        ownerId: ctx.user.id,
        ownerName: ctx.user.name ?? "Administrador",
        ownerEmail: ctx.user.email ?? "sem-email@w9.local",
        ...input,
      });
      return { id };
    }),

  details: campaignCapabilityProcedure("campaign.read")
    .input(campaignIdInput)
    .query(async ({ ctx }) => ctx.campaignAuthorization.access),

  updateDetails: campaignCapabilityProcedure("team.manage")
    .input(campaignIdInput.extend({
      name: z.string().min(3).max(160),
      candidateName: z.string().min(3).max(160),
      electionLabel: z.string().min(3).max(120),
      electionEndsAt: z.date().nullable().optional(),
      electionTimeZone: z.string().trim().max(80).nullable().optional(),
      region: z.string().min(2).max(160),
      status: z.enum(["planning", "active", "paused", "closed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const access = ctx.campaignAuthorization.access;
      const electionEndsAt = input.electionEndsAt === undefined
        ? access.campaign.electionEndsAt
        : input.electionEndsAt;
      const electionTimeZone = input.electionTimeZone === undefined
        ? access.campaign.electionTimeZone
        : input.electionTimeZone;
      validateElectionConfiguration(electionEndsAt, electionTimeZone);
      const { campaignId, ...details } = input;
      await db.updateCampaignDetails(campaignId, {
        ...details,
        electionEndsAt,
        electionTimeZone: electionTimeZone?.trim() || null,
        actorUserId: ctx.user.id,
      });
      return { success: true as const };
    }),

  publicInfo: publicProcedure
    .input(campaignIdInput)
    .query(({ input }) => db.getPublicCampaign(input.campaignId)),
});
