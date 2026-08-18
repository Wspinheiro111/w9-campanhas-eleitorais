import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { aiRouter, campaignRouter, contentsRouter, dashboardRouter, goalsRouter, monitoringRouter, planningRouter, publicIntakeRouter, reportsRouter, tasksRouter, teamRouter, territoryRouter, votersRouter } from "./routers/index";

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
  territory: territoryRouter,
  contents: contentsRouter,
  publicIntake: publicIntakeRouter,
  reports: reportsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
