import { z } from "zod";
import * as db from "../campaignDb";
import { campaignCapabilityProcedure } from "../campaignAuthorization";
import { router } from "../_core/trpc";

const campaignIdInput = z.object({ campaignId: z.number().int().positive() });

export const dashboardRouter = router({
  summary: campaignCapabilityProcedure("campaign.read")
    .input(campaignIdInput)
    .query(async ({ ctx, input }) => db.getDashboardData(
      input.campaignId,
      ctx.campaignAuthorization.campaignRole === "partner"
        ? ctx.campaignAuthorization.currentMemberId
        : null,
    )),

  dailySummary: campaignCapabilityProcedure("campaign.read")
    .input(campaignIdInput)
    .query(async ({ ctx, input }) => db.getDailySummary(
      input.campaignId,
      ctx.campaignAuthorization.campaignRole === "partner"
        ? ctx.campaignAuthorization.currentMemberId
        : null,
    )),

  dailyCoordination: campaignCapabilityProcedure("campaign.manage")
    .input(campaignIdInput)
    .query(async ({ input }) => db.getDailyCoordinationReport(input.campaignId)),
});
