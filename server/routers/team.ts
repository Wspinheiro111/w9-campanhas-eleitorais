import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../campaignDb";
import { campaignCapabilityProcedure } from "../campaignAuthorization";
import { router } from "../_core/trpc";

const campaignIdInput = z.object({ campaignId: z.number().int().positive() });
const memberRoles = ["admin", "coordinator", "partner"] as const;
const phoneInput = z.string().trim().min(8).max(32).regex(/^\+?[0-9()\s.-]+$/, "Informe um telefone válido.");

export const teamRouter = router({
  list: campaignCapabilityProcedure("campaign.read")
    .input(campaignIdInput)
    .query(async ({ input }) => db.listMembers(input.campaignId)),

  create: campaignCapabilityProcedure("team.manage")
    .input(campaignIdInput.extend({
      name: z.string().min(2).max(160),
      phone: phoneInput,
      role: z.enum(memberRoles),
      responsibility: z.string().max(220).optional(),
      workRegion: z.string().max(160).optional(),
    }))
    .mutation(async ({ input }) => {
      const { campaignId, ...member } = input;
      return { id: await db.createMember({ campaignId, ...member }) };
    }),

  updatePhone: campaignCapabilityProcedure("team.manage")
    .input(campaignIdInput.extend({
      memberId: z.number().int().positive(),
      phone: phoneInput,
    }))
    .mutation(async ({ input }) => {
      const member = await db.getCampaignMember(input.campaignId, input.memberId);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Membro não encontrado nesta campanha." });
      await db.updateMemberPhone(input.campaignId, input.memberId, input.phone);
      return { success: true as const };
    }),

  performance: campaignCapabilityProcedure("campaign.manage")
    .input(campaignIdInput)
    .query(async ({ input }) => db.getTeamPerformance(input.campaignId)),

  benchmark: campaignCapabilityProcedure("campaign.manage")
    .input(campaignIdInput)
    .query(async ({ input }) => db.getTeamBenchmark(input.campaignId)),
});
