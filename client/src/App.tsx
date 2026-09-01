import { Toaster } from "@/components/ui/sonner";
import { AnalyticsConsentBanner } from "./components/AnalyticsConsentBanner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trackGooglePageView } from "./lib/ga4";

const AdminPortal = lazy(() => import("./pages/AdminPortal"));
const CampaignApplication = lazy(() => import("./components/CampaignApplication"));
const EventFeedback = lazy(() => import("./pages/EventFeedback"));
const FirstAccess = lazy(() => import("./pages/FirstAccess"));
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PublicEventSignup = lazy(() => import("./pages/PublicEventSignup"));
const PublicSeoPage = lazy(() => import("./pages/PublicSeoPage"));
const PublicSignup = lazy(() => import("./pages/PublicSignup"));
const VolunteerPortal = lazy(() => import("./pages/VolunteerPortal"));
const VolunteerSignup = lazy(() => import("./pages/VolunteerSignup"));
const PwaUpdateBanner = lazy(() => import("./components/PwaUpdateBanner").then((module) => ({ default: module.PwaUpdateBanner })));
const W9GlobalReportGenerationFeedback = lazy(() => import("./components/W9ReportGenerationOverlay").then((module) => ({ default: module.W9GlobalReportGenerationFeedback })));

function PageLoading() {
  return <div className="min-h-[55vh] animate-pulse rounded-2xl bg-muted/60" aria-label="Carregando conteúdo" />;
}

function App() {
  const [location] = useLocation();

  useEffect(() => {
    trackGooglePageView(location);
  }, [location]);

  return <ErrorBoundary><ThemeProvider defaultTheme="w9"><TooltipProvider><Toaster />
    <Suspense fallback={null}><PwaUpdateBanner /><W9GlobalReportGenerationFeedback /></Suspense>
    <AnalyticsConsentBanner />
    <Suspense fallback={<PageLoading />}><Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/primeiro-acesso" component={FirstAccess} />
      <Route path="/paineladmin" component={AdminPortal} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/cadastro/:campaignId" component={PublicSignup} />
      <Route path="/evento/feedback/:token" component={EventFeedback} />
      <Route path="/evento/:eventId" component={PublicEventSignup} />
      <Route path="/voluntario/acesso/:token" component={VolunteerPortal} />
      <Route path="/voluntario/:campaignId" component={VolunteerSignup} />
      <Route path="/gestao-de-campanha-eleitoral"><PublicSeoPage pageKey="campaign" /></Route>
      <Route path="/crm-eleitoral"><PublicSeoPage pageKey="crm" /></Route>
      <Route path="/gestao-de-equipe-de-campanha"><PublicSeoPage pageKey="team" /></Route>
      <Route path="/gestao-de-campo-eleitoral"><PublicSeoPage pageKey="field" /></Route>
      <Route path="/financeiro-e-juridico-de-campanha"><PublicSeoPage pageKey="finance" /></Route>
      <Route><CampaignApplication /></Route>
    </Switch></Suspense>
  </TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
