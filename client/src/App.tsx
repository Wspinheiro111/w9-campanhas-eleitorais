import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { CampaignProvider } from "./contexts/CampaignContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import AIStudio from "./pages/AIStudio";
import Agenda from "./pages/Agenda";
import AudioCRM from "./pages/AudioCRM";
import Dashboard from "./pages/Dashboard";
import Monitoring from "./pages/Monitoring";
import Reports from "./pages/Reports";
import Tasks from "./pages/Tasks";
import Team from "./pages/Team";
import Voters from "./pages/Voters";

function Router() { return <Switch><Route path="/" component={Dashboard} /><Route path="/equipe" component={Team} /><Route path="/agenda" component={Agenda} /><Route path="/tarefas" component={Tasks} /><Route path="/contatos" component={Voters} /><Route path="/audio-crm" component={AudioCRM} /><Route path="/monitoramento" component={Monitoring} /><Route path="/inteligencia" component={AIStudio} /><Route path="/relatorios" component={Reports} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }
function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><DashboardLayout><CampaignProvider><Router /></CampaignProvider></DashboardLayout></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
