import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LegalDataProvider } from "./contexts/LegalDataContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FormattingProvider } from "./contexts/FormattingContext";
import React, { Suspense } from "react";
import RequireAuth from "./components/auth/RequireAuth";
import { Loader2 } from "lucide-react";

// ── Consolidated Landing Pages ─────────────────────────────────────────────
const Home = React.lazy(() => import("./pages/Home"));
const Product = React.lazy(() => import("./pages/Product"));
const Experience = React.lazy(() => import("./pages/Experience"));
const Security = React.lazy(() => import("./pages/Security"));
const About = React.lazy(() => import("./pages/About"));

const Login = React.lazy(() => import("./pages/Login"));
const Signup = React.lazy(() => import("./pages/Signup"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Cases = React.lazy(() => import("./pages/Cases"));
const Calendar = React.lazy(() => import("./pages/Calendar"));
const Clients = React.lazy(() => import("./pages/Clients"));
const LegalResearch = React.lazy(() => import("./pages/LegalResearch"));
const Billing = React.lazy(() => import("./pages/Billing"));
const Documents = React.lazy(() => import("./pages/Documents"));
const Settings = React.lazy(() => import("./pages/Settings"));
const News = React.lazy(() => import("./pages/News"));
const Notes = React.lazy(() => import("./pages/Notes"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const EmailVerificationPending = React.lazy(
  () => import("./pages/EmailVerificationPending")
);
const EmailVerificationSuccess = React.lazy(
  () => import("./pages/EmailVerificationSuccess")
);
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Terms = React.lazy(() => import("./pages/Terms"));
const DataProcessing = React.lazy(() => import("./pages/DataProcessing"));
const CookiePolicy = React.lazy(() => import("./pages/CookiePolicy"));
const ClientPortalLanding = React.lazy(() => import("./pages/ClientPortalLanding"));
const LegalNotesLanding = React.lazy(() => import("./pages/LegalNotesLanding"));

// Import Layout (not lazy — needed immediately for dashboard shell)
import DashboardLayout from "./components/layout/DashboardLayout";
import ScrollToHash from "./components/ScrollToHash";

// Suspense fallback loader
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);


const DynamicCanonical = () => {
  const location = useLocation();
  React.useEffect(() => {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    const baseUrl = 'https://juriq.app';
    link.setAttribute('href', `${baseUrl}${location.pathname}`);
  }, [location]);
  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
});


const AuthLoaderWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="legal-pro-theme">
      <AuthProvider>
        <AuthLoaderWrapper>
        <FormattingProvider>
          <LegalDataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ScrollToHash />
                <DynamicCanonical />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Landing Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/product" element={<Product />} />
                    <Route path="/experience" element={<Experience />} />
                    <Route path="/security" element={<Security />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/data-processing" element={<DataProcessing />} />
                    <Route path="/cookie-policy" element={<CookiePolicy />} />
                    <Route path="/client-portal" element={<ClientPortalLanding />} />
                    <Route path="/legal-notes" element={<LegalNotesLanding />} />

                    {/* Auth & Support */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<EmailVerificationSuccess />} />
                    <Route path="/verification-pending" element={<EmailVerificationPending />} />

                    {/* 14. Protected Dashboard Routes — wrapped with RequireAuth */}
                    <Route
                      path="/dashboard"
                      element={
                        <RequireAuth>
                          <DashboardLayout />
                        </RequireAuth>
                      }
                    >
                      <Route index element={<Dashboard />} />
                      <Route path="cases" element={<Cases />} />
                      <Route path="calendar" element={<Calendar />} />
                      <Route path="clients" element={<Clients />} />
                      <Route path="legal-research" element={<LegalResearch />} />
                      <Route path="billing" element={<Billing />} />
                      <Route path="documents" element={<Documents />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="news" element={<News />} />
                      <Route path="notes" element={<Notes />} />
                    </Route>

                    {/* Catch All */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </LegalDataProvider>
        </FormattingProvider>
        </AuthLoaderWrapper>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;