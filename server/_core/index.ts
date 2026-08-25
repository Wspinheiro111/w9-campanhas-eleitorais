import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleAuthRoutes } from "../googleAuth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { recordRoutePerformanceEvent } from "../campaignDb";
import { generatePlatformCustomerPortfolioReport } from "../campaignDb";
import { normalizeTelemetryRoute } from "../routeMetrics";
import { sdk } from "./sdk";
import { canonicalW9HostRedirect } from "../canonicalHost";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(canonicalW9HostRedirect);
  app.use((req, res, next) => {
    const startedAt = performance.now();
    res.on("finish", () => {
      if (!req.path.startsWith("/api")) return;
      const isTrpc = req.path.startsWith("/api/trpc");
      const rawRoute = normalizeTelemetryRoute(req.path, isTrpc);
      if (rawRoute.includes("organization.performance")) return;
      const header = req.get("x-w9-organization-id");
      const organizationId = header && /^\d+$/.test(header) ? Number(header) : null;
      void recordRoutePerformanceEvent({ organizationId, route: rawRoute, method: req.method, statusCode: res.statusCode, durationMs: performance.now() - startedAt });
    });
    next();
  });
  registerStorageProxy(app);
  registerGoogleAuthRoutes(app);
  registerOAuthRoutes(app);
  app.post("/api/scheduled/platform-customer-portfolio", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const result = await generatePlatformCustomerPortfolioReport(user.taskUid);
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error), context: { taskUid: "unavailable" }, timestamp: new Date().toISOString() });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  server.listen(port);
}

startServer().catch(console.error);
