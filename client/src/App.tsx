import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import MemphisBackground from "./components/MemphisBackground";
import AppNav from "./components/AppNav";
import Home from "./pages/Home";
import Research from "./pages/Research";
import Listings from "./pages/Listings";
import Templates from "./pages/Templates";
import Alerts from "./pages/Alerts";
import History from "./pages/History";
import TrackingPage from "./pages/TrackingPage";
import Privacy from "./pages/Privacy";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/research" component={Research} />
      <Route path="/research/:id" component={Research} />
      <Route path="/listings" component={Listings} />
      <Route path="/templates" component={Templates} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/history" component={History} />
      <Route path="/track/:token" component={TrackingPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  return (
    <>
      <MemphisBackground />
      <div className="relative z-10 min-h-dvh flex flex-col">
        <AppNav />
        <main className="flex-1">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/research" component={Research} />
            <Route path="/research/:id" component={Research} />
            <Route path="/listings" component={Listings} />
            <Route path="/templates" component={Templates} />
            <Route path="/alerts" component={Alerts} />
            <Route path="/history" component={History} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" />
          <Switch>
            {/* Public pages — no nav (no AppNav/MemphisBackground) */}
            <Route path="/track/:token" component={TrackingPage} />
            <Route path="/privacy" component={Privacy} />
            {/* All other pages with nav */}
            <Route component={AppShell} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
