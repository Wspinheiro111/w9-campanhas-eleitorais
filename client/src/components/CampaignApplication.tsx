import { lazy } from "react";
import { Route, Switch } from "wouter";
import DashboardLayout from "./DashboardLayout";
import { CampaignProvider } from "../contexts/CampaignContext";
import { OrganizationProvider } from "../contexts/OrganizationContext";
import NotFound from "../pages/NotFound";

const AIStudio = lazy(() => import("../pages/AIStudio"));
const AccountSecurity = lazy(() => import("../pages/AccountSecurity"));
const Agenda = lazy(() => import("../pages/Agenda"));
const AuditLog = lazy(() => import("../pages/AuditLog"));
const AudioCRM = lazy(() => import("../pages/AudioCRM"));
const CertificateValidation = lazy(() => import("../pages/CertificateValidation"));
const CommunicationCenter = lazy(() => import("../pages/CommunicationCenter"));
const ComplianceCenter = lazy(() => import("../pages/ComplianceCenter"));
const Contents = lazy(() => import("../pages/Contents"));
const ConsentCenter = lazy(() => import("../pages/ConsentCenter"));
const CrisisRoom = lazy(() => import("../pages/CrisisRoom"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const DailyCoordination = lazy(() => import("../pages/DailyCoordination"));
const ExecutiveDashboard = lazy(() => import("../pages/ExecutiveDashboard"));
const FieldOps = lazy(() => import("../pages/FieldOps"));
const Mobilization = lazy(() => import("../pages/Mobilization"));
const Monitoring = lazy(() => import("../pages/Monitoring"));
const Notifications = lazy(() => import("../pages/Notifications"));
const Operations = lazy(() => import("../pages/Operations"));
const OperationalGoals = lazy(() => import("../pages/OperationalGoals"));
const Organizations = lazy(() => import("../pages/Organizations"));
const Pipeline = lazy(() => import("../pages/Pipeline"));
const PwaInstallGuide = lazy(() => import("../pages/PwaInstallGuide"));
const Reports = lazy(() => import("../pages/Reports"));
const ScenarioSimulator = lazy(() => import("../pages/ScenarioSimulator"));
const StreetOperations = lazy(() => import("../pages/StreetOperations"));
const Tasks = lazy(() => import("../pages/Tasks"));
const TechnicalPerformance = lazy(() => import("../pages/TechnicalPerformance"));
const Team = lazy(() => import("../pages/Team"));
const TeamBenchmark = lazy(() => import("../pages/TeamBenchmark"));
const TeamPerformance = lazy(() => import("../pages/TeamPerformance"));
const Territory = lazy(() => import("../pages/Territory"));
const Voters = lazy(() => import("../pages/Voters"));
const Volunteers = lazy(() => import("../pages/Volunteers"));

function InternalRouter() {
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
    <Route path="/compliance" component={ComplianceCenter} />
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

export default function CampaignApplication() {
  return <OrganizationProvider><CampaignProvider><DashboardLayout><InternalRouter /></DashboardLayout></CampaignProvider></OrganizationProvider>;
}
