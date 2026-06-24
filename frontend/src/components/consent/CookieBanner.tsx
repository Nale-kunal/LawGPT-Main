import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl, apiFetch } from '@/lib/api';
import { Cookie, Shield, Lock, Check, X, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { REOPEN_EVENT } from '@/hooks/useCookieConsent';

interface CookiePrefs {
  functional: boolean;
  analytics: boolean;
  preferences: boolean;
}

const COOKIE_CONSENT_VERSION = '1.0';
const LOCAL_STORAGE_KEY = 'juriq_cookie_consent';

export const CookieBanner = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>({
    functional: true,
    analytics: false,
    preferences: true,
  });

  useEffect(() => {
    // Check if consent has already been given for the current version
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === COOKIE_CONSENT_VERSION) {
          return; // Consent already given for this version
        }
      } catch (e) {
        // Stale or invalid storage, ignore and prompt
      }
    }
    // Show banner after a slight delay for smoother entry animation
    const timer = setTimeout(() => setIsVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Listen for external reopen requests (e.g. "Cookie Settings" link in footer or Settings page)
  useEffect(() => {
    const handleReopen = () => {
      setIsVisible(true);
      setShowCustomize(true); // go directly to the customize panel
    };
    window.addEventListener(REOPEN_EVENT, handleReopen);
    return () => window.removeEventListener(REOPEN_EVENT, handleReopen);
  }, []);

  const saveConsent = async (newPrefs: CookiePrefs) => {
    const consentRecord = {
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      preferences: newPrefs,
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(consentRecord));
    setIsVisible(false);
    setShowCustomize(false);

    // If user is logged in, sync preferences to the backend database
    if (user) {
      try {
        await apiFetch(getApiUrl('/api/v1/legal/cookie-consent'), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            analytics: newPrefs.analytics,
            preferences: newPrefs.preferences,
          }),
        });
      } catch (err) {
        console.error('Failed to sync cookie preferences to backend:', err);
      }
    }
  };

  const handleAcceptAll = () => {
    const allOn = { functional: true, analytics: true, preferences: true };
    setPrefs(allOn);
    saveConsent(allOn);
  };

  const handleRejectOptional = () => {
    const minOn = { functional: true, analytics: false, preferences: false };
    setPrefs(minOn);
    saveConsent(minOn);
  };

  const handleSaveCustom = () => {
    saveConsent(prefs);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Cookie Consent Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Cookie className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold tracking-tight">Cookie Preferences</h4>
              <p className="text-xs text-muted-foreground leading-normal">
                We use cookies to secure accounts, optimize performance, and analyze platform usage. Functional cookies are active. You can customize optional cookies.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button 
              size="sm" 
              onClick={handleAcceptAll} 
              className="text-xs font-semibold px-4 flex-1 h-9"
            >
              Accept All
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRejectOptional} 
              className="text-xs font-semibold px-3 h-9"
            >
              Reject Optional
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowCustomize(true)} 
              className="text-xs h-9 px-2 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
            >
              <Settings className="h-3.5 w-3.5 mr-1" />
              Customize
            </Button>
          </div>
          <div className="text-[10px] text-center text-muted-foreground/60 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            Read our <Link to={location.pathname.startsWith('/dashboard') ? "/dashboard/cookie-policy" : "/cookie-policy"} className="underline hover:text-primary">Cookie Policy</Link>
          </div>
        </div>
      </div>

      {/* Customize Preferences Modal */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-border/80 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold">Customize Cookie Settings</h3>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => setShowCustomize(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Cookie Categories list */}
            <div className="space-y-4">
              {/* Category 1: Strictly Necessary (Functional) */}
              <div className="border border-border/40 rounded-xl p-4 bg-muted/20 flex items-start gap-3">
                <div className="mt-0.5">
                  <Checkbox id="cookie-functional" checked disabled />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <label htmlFor="cookie-functional" className="text-xs font-semibold text-foreground cursor-not-allowed">
                      Strictly Necessary Cookies
                    </label>
                    <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-mono uppercase tracking-wide">
                      Required
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Essential for login sessions, security, anti-abuse, routing, and subscription plan enforcement. Cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Category 2: Analytics & Insights */}
              <div className={`border rounded-xl p-4 transition-colors flex items-start gap-3 ${prefs.analytics ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-muted/10'}`}>
                <div className="mt-0.5">
                  <Checkbox 
                    id="cookie-analytics" 
                    checked={prefs.analytics} 
                    onCheckedChange={(checked) => setPrefs(prev => ({ ...prev, analytics: !!checked }))}
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <label htmlFor="cookie-analytics" className="text-xs font-semibold text-foreground cursor-pointer">
                      Analytics & Platform Insights
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Helps us understand platform usage, latency metrics, and error rates to refine the legal workspace.
                  </p>
                </div>
              </div>

              {/* Category 3: User Preferences */}
              <div className={`border rounded-xl p-4 transition-colors flex items-start gap-3 ${prefs.preferences ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-muted/10'}`}>
                <div className="mt-0.5">
                  <Checkbox 
                    id="cookie-preferences" 
                    checked={prefs.preferences} 
                    onCheckedChange={(checked) => setPrefs(prev => ({ ...prev, preferences: !!checked }))}
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <label htmlFor="cookie-preferences" className="text-xs font-semibold text-foreground cursor-pointer">
                      UI & Workspace Preferences
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Saves your side-panel states, default views, calendar sorting, and UI theme selections for your next session.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 text-xs" 
                onClick={handleRejectOptional}
              >
                Reject Optional
              </Button>
              <Button 
                className="flex-1 text-xs font-semibold" 
                onClick={handleSaveCustom}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieBanner;
