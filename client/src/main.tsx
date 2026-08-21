import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { ClientErrorSource, fingerprintClientError, normalizeClientRoute, sanitizeClientErrorMessage } from "./lib/clientErrorTelemetry";
import { startLogin } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // Em pré-visualizações incorporadas, um redirecionamento OAuth sem gesto do usuário
  // pode entrar em ciclo. O DashboardLayout apresenta o botão de acesso explícito.
  if (window.self !== window.top) return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        const telemetryHeaders: Record<string, string> = {};
        try {
          const organizationId = localStorage.getItem("w9-active-organization");
          if (organizationId && /^\d+$/.test(organizationId)) telemetryHeaders["x-w9-organization-id"] = organizationId;
        } catch {
          // localStorage unavailable
        }
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { ...telemetryHeaders, Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return telemetryHeaders;
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

const recentlyReported = new Map<string, number>();

async function reportInterfaceError(source: ClientErrorSource, error: unknown) {
  const message = sanitizeClientErrorMessage(error);
  const route = normalizeClientRoute(window.location.pathname);
  let organizationId = 0;
  try { organizationId = Number(localStorage.getItem("w9-active-organization")); } catch { return; }
  if (!Number.isInteger(organizationId) || organizationId <= 0) return;
  const fingerprint = await fingerprintClientError(`${source}:${route}:${message}`);
  const previous = recentlyReported.get(fingerprint) ?? 0;
  if (Date.now() - previous < 60_000) return;
  recentlyReported.set(fingerprint, Date.now());
  try { await trpcClient.organization.performance.reportClientError.mutate({ organizationId, route, source, fingerprint, message }); } catch { /* Telemetria não deve causar novo erro de interface. */ }
}

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    void reportInterfaceError("query_error", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    void reportInterfaceError("mutation_error", error);
  }
});

window.addEventListener("error", event => { void reportInterfaceError("window_error", event.error ?? event.message); });
window.addEventListener("unhandledrejection", event => { void reportInterfaceError("unhandled_rejection", event.reason); });
window.addEventListener("w9-interface-error", event => { void reportInterfaceError("error_boundary", (event as CustomEvent<{ message?: unknown }>).detail?.message); });

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
