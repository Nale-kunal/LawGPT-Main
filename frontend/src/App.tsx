import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LegalDataProvider } from "./contexts/LegalDataContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FormattingProvider } from "./contexts/FormattingContext";
import { PlanProvider } from "./contexts/PlanContext";
import { CommunityProvider } from "./modules/community/contexts/CommunityContext";
import React, { Suspense, useEffect } from "react";
import RequireAuth from "./components/auth/RequireAuth";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute";

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
const TemplatesDashboard = React.lazy(() => import("./modules/legalTemplates/pages/TemplatesDashboard"));
const TemplateWorkspace = React.lazy(() => import("./modules/legalTemplates/pages/TemplateWorkspace"));
const Pricing = React.lazy(() => import("./pages/Pricing"));
const SubscriptionDashboard = React.lazy(() => import("./pages/SubscriptionDashboard"));
const PaymentSuccess = React.lazy(() => import("./pages/PaymentSuccess"));
const PaymentFailed = React.lazy(() => import("./pages/PaymentFailed"));
const SubscriptionExpired = React.lazy(() => import("./pages/SubscriptionExpired"));
const CommunityPage = React.lazy(() => import("./modules/community/pages/CommunityPage"));
const SupportPage = React.lazy(() => import("./modules/community/pages/SupportPage"));
const FeedbackPage = React.lazy(() => import("./modules/community/pages/FeedbackPage"));
const AdminCommunityPage = React.lazy(() => import("./modules/community/pages/AdminCommunityPage"));


// Import Layout (not lazy — needed immediately for dashboard shell)
import DashboardLayout from "./components/layout/DashboardLayout";
import ScrollToHash from "./components/ScrollToHash";
import JuriqLoader from "./components/ui/JuriqLoader";
import { FeatureGate } from "./components/subscription/FeatureGate";

// Suspense fallback loader
const PageLoader = () => <JuriqLoader size="full" />;


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
      refetchOnWindowFocus: false,
      staleTime: 30000,
      gcTime: 5 * 60 * 1000,
    },
  },
});




const App = () => {
  useEffect(() => {
    const loader = document.querySelector('.initial-loader');
    if (loader) {
      loader.remove();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="legal-pro-theme">
        <AuthProvider>
          <PlanProvider>
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
                    {/* Public Landing Routes — landing is always immediately visible; authenticated
                        users are bounced to /dashboard by the global auth guard in AuthContext */}
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

                    {/* Auth pages — authenticated users are immediately bounced to /dashboard */}
                    <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                    <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
                    <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<EmailVerificationSuccess />} />
                    <Route path="/verification-pending" element={<EmailVerificationPending />} />

                    {/* 14. Protected Dashboard Routes — wrapped with RequireAuth */}
                    <Route
                      path="/dashboard"
                      element={
                        <RequireAuth>
                          <CommunityProvider>
                            <DashboardLayout />
                          </CommunityProvider>
                        </RequireAuth>
                      }
                    >
                      <Route index element={<Dashboard />} />
                      <Route path="cases" element={<Cases />} />
                      <Route path="calendar" element={<Calendar />} />
                      <Route path="clients" element={<Clients />} />
                      <Route path="legal-research" element={<FeatureGate feature="legal-research"><LegalResearch /></FeatureGate>} />
                      <Route path="documents" element={<FeatureGate feature="documents"><Documents /></FeatureGate>} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="news" element={<FeatureGate feature="news"><News /></FeatureGate>} />
                      <Route path="notes" element={<FeatureGate feature="notes"><Notes /></FeatureGate>} />
                      <Route path="templates" element={<FeatureGate feature="templates"><TemplatesDashboard /></FeatureGate>} />
                      <Route path="templates/:id" element={<FeatureGate feature="templates"><TemplateWorkspace /></FeatureGate>} />
                      <Route path="community" element={<CommunityPage />} />
                      <Route path="support" element={<SupportPage />} />
                      <Route path="feedback" element={<FeedbackPage />} />
                      <Route path="admin/community" element={<AdminCommunityPage />} />
                      <Route path="pricing" element={<Pricing />} />
                      <Route path="subscription" element={<SubscriptionDashboard />} />
                    </Route>

                    {/* Payment status pages — outside DashboardLayout (full screen) */}
                    <Route path="/payment/success" element={<RequireAuth><PaymentSuccess /></RequireAuth>} />
                    <Route path="/payment/failed" element={<RequireAuth><PaymentFailed /></RequireAuth>} />
                    <Route path="/subscription/expired" element={<RequireAuth><SubscriptionExpired /></RequireAuth>} />

                    {/* Catch All */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </LegalDataProvider>
        </FormattingProvider>
        </PlanProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;