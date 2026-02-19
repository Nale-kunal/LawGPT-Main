import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useState, useEffect } from 'react';
import OnboardingOverlay from '@/components/onboarding/OnboardingOverlay';

const DashboardLayout = () => {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Prevent browser from caching protected pages
  useEffect(() => {
    // Add cache control meta tags if not already present
    let metaCacheControl = document.querySelector('meta[http-equiv="Cache-Control"]');
    if (!metaCacheControl) {
      metaCacheControl = document.createElement('meta');
      metaCacheControl.setAttribute('http-equiv', 'Cache-Control');
      metaCacheControl.setAttribute('content', 'no-cache, no-store, must-revalidate');
      document.head.appendChild(metaCacheControl);
    }

    let metaPragma = document.querySelector('meta[http-equiv="Pragma"]');
    if (!metaPragma) {
      metaPragma = document.createElement('meta');
      metaPragma.setAttribute('http-equiv', 'Pragma');
      metaPragma.setAttribute('content', 'no-cache');
      document.head.appendChild(metaPragma);
    }

    let metaExpires = document.querySelector('meta[http-equiv="Expires"]');
    if (!metaExpires) {
      metaExpires = document.createElement('meta');
      metaExpires.setAttribute('http-equiv', 'Expires');
      metaExpires.setAttribute('content', '0');
      document.head.appendChild(metaExpires);
    }

    // Handle browser back/forward cache (bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Force auth revalidation when page is restored from bfcache
        refreshUser();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [refreshUser]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col min-h-0">
          <Header />
          <main id="dashboard-main" className="flex-1 overflow-y-auto p-3 md:p-6">
            <Outlet />
          </main>
        </div>

        {/* Onboarding Overlay - appears when onboarding not completed */}
        {user && user.onboardingCompleted === false && (
          <OnboardingOverlay />
        )}
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;