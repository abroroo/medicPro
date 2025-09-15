import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import PatientDetail from "@/pages/patient-detail";
import Doctors from "@/pages/doctors";
import Queue from "@/pages/queue";
import WaitingDisplay from "@/pages/waiting-display";
import Reports from "@/pages/reports";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/patients" component={Patients} />
      <ProtectedRoute path="/patients/:id" component={PatientDetail} />
      <ProtectedRoute path="/doctors" component={Doctors} />
      <ProtectedRoute path="/queue" component={Queue} />
      <ProtectedRoute path="/display" component={WaitingDisplay} />
      <ProtectedRoute path="/reports" component={Reports} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
