import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { PwaUpdateBanner } from "./components/PwaUpdateBanner";
import { W9GlobalReportGenerationFeedback } from "./components/W9ReportGenerationOverlay";
import { CampaignProvider } from "./contexts/CampaignContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { ThemeProvider } from "./contexts/ThemeContext";

const AIStudio = lazy(() => import("./pages/AIStudio"));
const AccountSecurity = lazy(() => import("./pages/AccountSecurity"));
const Agenda = lazy(() => import("./pages/Agenda"));
const AdminGeneral = lazy(() => import("./pages/AdminGeneral"));
const AdminPortal = lazy(() => import("./pages/AdminPortal"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const AudioCRM = lazy(() => import("./pages/AudioCRM"));
const CertificateValidation = lazy(() => import("./pages/CertificateValidation"));
const CommunicationCenter = lazy(() => import("./pages/CommunicationCenter"));
const Contents = lazy(() => import("./pages/Contents"));
const ConsentCenter = lazy(() => import("./pages/ConsentCenter"));
const CrisisRoom = lazy(() => import("./pages/CrisisRoom"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DailyCoordination = lazy(() => import("./pages/DailyCoordination"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));
const FieldOps = lazy(() => import("./pages/FieldOps"));
const FirstAccess = lazy(() => import("./pages/FirstAccess"));
const Login = lazy(() => import("./pages/Login"));
const Landing = lazy(() => import("./pages/Landing"));
const Monitoring = lazy(() => import("./pages/Monitoring"));
const Mobilization = lazy(() => import("./pages/Mobilization"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Operations = lazy(() => import("./pages/Operations"));
const OperationalGoals = lazy(() => import("./pages/OperationalGoals"));
const Organizations = lazy(() => import("./pages/Organizations"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const PwaInstallGuide = lazy(() => import("./pages/PwaInstallGuide"));
const PublicSignup = lazy(() => import("./pages/PublicSignup"));
const PublicSeoPage = lazy(() => import("./pages/PublicSeoPage"));
const PublicEventSignup = lazy(() => import("./pages/PublicEventSignup"));
const EventFeedback = lazy(() => import("./pages/EventFeedback"));
const Reports = lazy(() => import("./pages/Reports"));
const ScenarioSimulator = lazy(() => import("./pages/ScenarioSimulator"));
const StreetOperations = lazy(() => import("./pages/StreetOperations"));
const Tasks = lazy(() => import("./pages/Tasks"));
const TechnicalPerformance = lazy(() => import("./pages/TechnicalPerformance"));
const Team = lazy(() => import("./pages/Team"));
const TeamBenchmark = lazy(() => import("./pages/TeamBenchmark"));
const TeamPerformance = lazy(() => import("./pages/TeamPerformance"));
const Territory = lazy(() => import("./pages/Territory"));
const Voters = lazy(() => import("./pages/Voters"));
const VolunteerSignup = lazy(() => import("./pages/VolunteerSignup"));
const VolunteerPortal = lazy(() => import("./pages/VolunteerPortal"));
const Volunteers = lazy(() => import("./pages/Volunteers"));

function PageLoading() { return <div className="min-h-[55vh] animate-pulse rounded-2xl bg-muted/60" aria-label="Carregando módulo" />; }

function Router() {
  return <Switch>
    <Route path="/painel" component={Dashboard} />
    <Route path="/coordenacao-diaria" component={DailyCoordination} />
    <Route path="/executivo" component={ExecutiveDashboard} />
    <Route path="/notificacoes" component={Notifications} />
    <Route path="/escalas" component={Operations} />
    <Route path="/seguranca" component={AccountSecurity} />
    <Route path="/instalar-app" component={PwaInstallGuide} />
    <Route path="/organizacoes" component={Organizations} />
    <Route path="/auditoria" component={AuditLog} />
    <Route path="/tecnico" component={TechnicalPerformance} />
    <Route path="/equipe" component={Team} />
    <Route path="/equipe/desempenho" component={TeamPerformance} />
    <Route path="/benchmark-equipe" component={TeamBenchmark} />
    <Route path="/voluntarios" component={Volunteers} />
    <Route path="/certificados/validar/:certificateCode" component={CertificateValidation} />
    <Route path="/agenda" component={Agenda} />
    <Route path="/comunicacao" component={CommunicationCenter} />
    <Route path="/tarefas" component={Tasks} />
    <Route path="/metas-operacionais" component={OperationalGoals} />
    <Route path="/contatos" component={Voters} />
    <Route path="/campo" component={FieldOps} />
    <Route path="/operacoes-rua" component={StreetOperations} />
    <Route path="/consentimentos" component={ConsentCenter} />
    <Route path="/crise" component={CrisisRoom} />
    <Route path="/pipeline" component={Pipeline} />
    <Route path="/mobilizacao" component={Mobilization} />
    <Route path="/simulador" component={ScenarioSimulator} />
    <Route path="/territorio" component={Territory} />
    <Route path="/conteudos" component={Contents} />
    <Route path="/audio-crm" component={AudioCRM} />
    <Route path="/monitoramento" component={Monitoring} />
    <Route path="/inteligencia" component={AIStudio} />
    <Route path="/relatorios" component={Reports} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="w9"><TooltipProvider><Toaster /><PwaUpdateBanner /><W9GlobalReportGenerationFeedback /><Suspense fallback={<PageLoading />}><Switch>
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
    <Route><OrganizationProvider><CampaignProvider><DashboardLayout><Router /></DashboardLayout></CampaignProvider></OrganizationProvider></Route>
  </Switch></Suspense></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
