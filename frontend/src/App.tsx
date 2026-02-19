import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LegalDataProvider } from "./contexts/LegalDataContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FormattingProvider } from "./contexts/FormattingContext";

// Import Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import LegalResearch from "./pages/LegalResearch";
import Billing from "./pages/Billing";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import News from "./pages/News";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import EmailVerificationPending from "./pages/EmailVerificationPending";
import EmailVerificationSuccess from "./pages/EmailVerificationSuccess";

// Import Layout
import DashboardLayout from "./components/layout/DashboardLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true, // Refetch on focus to ensure fresh auth state
      staleTime: 1000, // Consider data stale after 1 second
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (gcTime replaces cacheTime in v5)
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="legal-pro-theme">
      <AuthProvider>
        <FormattingProvider>
          <LegalDataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<EmailVerificationSuccess />} />
                  <Route path="/verification-pending" element={<EmailVerificationPending />} />

                  {/* Protected Dashboard Routes */}
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="cases" element={<Cases />} />
                    <Route path="calendar" element={<Calendar />} />
                    <Route path="clients" element={<Clients />} />
                    <Route path="legal-research" element={<LegalResearch />} />
                    <Route path="billing" element={<Billing />} />
                    <Route path="documents" element={<Documents />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="news" element={<News />} />
                  </Route>

                  {/* Catch All Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </LegalDataProvider>
        </FormattingProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;