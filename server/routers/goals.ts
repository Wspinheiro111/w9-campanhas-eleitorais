import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../campaignDb";
import { campaignCapabilityProcedure } from "../campaignAuthorization";
import { router } from "../_core/trpc";

const campaignIdInput = z.object({ campaignId: z.number().int().positive() });

export const goalsRouter = router({
  list: campaignCapabilityProcedure("campaign.read")
    .input(campaignIdInput)
    .query(async ({ input }) => db.listGoals(input.campaignId)),

  create: campaignCapabilityProcedure("campaign.manage")
    .input(campaignIdInput.extend({
      title: z.string().min(3).max(200),
      description: z.string().max(3000).optional(),
      targetValue: z.number().int().positive(),
      unit: z.string().min(1).max(40),
      deadline: z.date().optional(),
    }))
    .mutation(async ({ input }) => ({
      id: await db.createGoal({
        ...input,
        description: input.description ?? null,
        deadline: input.deadline ?? null,
      }),
    })),

  updateProgress: campaignCapabilityProcedure("campaign.manage")
    .input(campaignIdInput.extend({
      goalId: z.number().int().positive(),
      currentValue: z.number().int().min(0).max(100_000_000),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.updateGoalProgress({ ...input, actorUserId: ctx.user.id });
      } catch (error) {
        if (error instanceof Error && error.message === "GOAL_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meta não encontrada nesta campanha." });
        }
        throw error;
      }
    }),
});
