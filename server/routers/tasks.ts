import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../campaignDb";
import {
  assertOwnedCampaignRecord,
  campaignCapabilityProcedure,
  requireCampaignAuthorization,
} from "../campaignAuthorization";
import { protectedProcedure, router } from "../_core/trpc";

const campaignIdInput = z.object({ campaignId: z.number().int().positive() });

export const tasksRouter = router({
  list: campaignCapabilityProcedure("campaign.read")
    .input(campaignIdInput)
    .query(async ({ ctx, input }) => db.listTasks(
      input.campaignId,
      ctx.campaignAuthorization.campaignRole === "partner"
        ? ctx.campaignAuthorization.currentMemberId
        : null,
    )),

  create: campaignCapabilityProcedure("campaign.manage")
    .input(campaignIdInput.extend({
      goalId: z.number().int().positive().optional(),
      title: z.string().min(3).max(220),
      description: z.string().max(3000).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]),
      assignedToId: z.number().int().positive().optional(),
      dueAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => ({
      id: await db.createTask({
        campaignId: input.campaignId,
        goalId: input.goalId ?? null,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        assignedToId: input.assignedToId ?? null,
        dueAt: input.dueAt ?? null,
        createdById: ctx.user.id,
      }),
    })),

  updateStatus: protectedProcedure
    .input(z.object({
      taskId: z.number().int().positive(),
      status: z.enum(["backlog", "todo", "in_progress", "review", "done"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.getTask(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      const authorization = await requireCampaignAuthorization(ctx.user.id, task.campaignId);
      assertOwnedCampaignRecord(authorization, task.assignedToId);
      await db.updateTaskStatus(input.taskId, input.status);
      return { success: true as const };
    }),
});
