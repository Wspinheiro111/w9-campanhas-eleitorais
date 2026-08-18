import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { aiRouter, campaignRouter, dashboardRouter, goalsRouter, monitoringRouter, planningRouter, reportsRouter, tasksRouter, teamRouter, votersRouter } from "./routers/index";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  campaign: campaignRouter,
  dashboard: dashboardRouter,
  team: teamRouter,
  planning: planningRouter,
  goals: goalsRouter,
  tasks: tasksRouter,
  voters: votersRouter,
  monitoring: monitoringRouter,
  reports: reportsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
