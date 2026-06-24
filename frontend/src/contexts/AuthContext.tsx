import React, {
  type ReactNode,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { getApiUrl, apiFetch } from '@/lib/api';
import JuriqLoader from '@/components/ui/JuriqLoader';
import { logger } from '@/lib/logger';

interface NotificationSettings {
  emailAlerts: boolean;
  smsAlerts: boolean;
  pushNotifications: boolean;
  hearingReminders: boolean;
  clientUpdates: boolean;
  weeklyReports: boolean;
}

interface PreferenceSettings {
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: string;
  loginNotifications: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  recoveryEmail?: string;
  recoveryGoogleId?: string | null;
  googleId?: string | null;
  authProviders?: string[];
  role: 'lawyer' | 'assistant' | 'admin';
  emailVerified?: boolean;
  hasPassword?: boolean;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string | null;
  onboardingVersion?: number;
  immutableFieldsLocked?: boolean;
  profile?: {
    fullName?: string | null;
    barCouncilNumber?: string | null;
    currency?: string | null;
    phoneNumber?: string | null;
    lawFirmName?: string | null;
    practiceAreas?: string[];
    courtLevels?: string[];
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    timezone?: string | null;
  };
  notifications?: NotificationSettings;
  preferences?: PreferenceSettings;
  security?: SecuritySettings;
  /** ISO 8601 timestamp — when the user account was created (from DB) */
  createdAt?: string;
  /** ISO 8601 timestamp — last time the user record was updated (from DB) */
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  register: (
    userData: RegisterData
  ) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resendVerificationEmail: (
    email: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  isLoading: boolean;
  isAuthenticated: boolean;
  complianceStatus: 'loading' | 'accepted' | 'requires_acceptance';
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
  barNumber?: string;
  firm?: string;
  // Legal consent — sent when the user explicitly accepts policies on the signup form
  consentGiven?: boolean;
  termsVersion?: string;
  privacyVersion?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Session boundaries are now strictly governed by secure backend cookies
// and synchronous /validate calls, destroying old frontend fallbacks.

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<
    'loading' | 'authenticated' | 'unauthenticated' | 'unknown'
  >('loading');
  const [complianceStatus, setComplianceStatus] = useState<
    'loading' | 'accepted' | 'requires_acceptance'
  >('loading');
  // Guard: prevents refreshUser() from re-authenticating while logout is in progress
  const isLoggingOut = useRef(false);

  const persistUser = useCallback((userData: User | null, shouldClearCookies = false) => {
    if (userData) {
      setUser(userData);
      setAuthState('authenticated');
    } else {
      setUser(null);
      setAuthState('unauthenticated');
      setComplianceStatus('accepted');

      if (shouldClearCookies) {
        // Clear cookies generically from frontend just in case backend fails
        document.cookie =
          'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' +
          window.location.hostname +
          ';';
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'is_authenticated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/me'), {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });

      if (res.status === 401) {
        // user not logged in → expected
        // Skip refresh entirely if logout is in progress to prevent re-login after logout
        if (isLoggingOut.current) {
          persistUser(null);
          return;
        }
        try {
          const refreshRes = await apiFetch(getApiUrl('/api/v1/auth/refresh'), {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
          });
          if (!refreshRes.ok) {
            persistUser(null);
            return;
          }
          // Retry /me with the new access token
          const retryRes = await apiFetch(getApiUrl('/api/v1/auth/me'), {
            credentials: 'include',
            cache: 'no-store',
          });
          if (!retryRes.ok) {
            persistUser(null);
            return;
          }
          const retryData = await retryRes.json();
          // Check consent status
          const consentRes = await apiFetch(getApiUrl('/api/v1/auth/consent-status'), {
            credentials: 'include',
            cache: 'no-store',
          });
          if (consentRes.ok) {
            const consentData = await consentRes.json();
            setComplianceStatus(consentData.compliant ? 'accepted' : 'requires_acceptance');
          } else {
            setComplianceStatus('accepted');
          }
          persistUser(retryData.user ? (retryData.user as User) : null);
          return;
        } catch {
          persistUser(null);
          return;
        }
      }

      if (!res.ok) {
        persistUser(null);
        return;
      }
      const data = await res.json();
      // Check consent status
      const consentRes = await apiFetch(getApiUrl('/api/v1/auth/consent-status'), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (consentRes.ok) {
        const consentData = await consentRes.json();
        setComplianceStatus(consentData.compliant ? 'accepted' : 'requires_acceptance');
      } else {
        setComplianceStatus('accepted');
      }
      persistUser(data.user ? (data.user as User) : null);
    } catch (error: unknown) {
      if ((error as any).name !== 'AbortError') persistUser(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  }, [persistUser]);

  useEffect(() => {
    let mounted = true;

    const runGlobalAuthGuard = async () => {
      try {
        setAuthState('loading');
        setComplianceStatus('loading');

        // 1. Core verification against new /validate endpoint
        const valRes = await apiFetch(getApiUrl('/api/v1/auth/validate'), {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });

        const valData = await valRes.json();

        if (!valData.authenticated) {
          if (mounted) {
            persistUser(null);
            setIsLoading(false);
          }
          return;
        }

        // 3. GLOBAL AUTH GUARD (IF AUTHENTICATED -> NO RENDER OF LOGIN/LANDING)
        const p = window.location.pathname;
        // /consent-gate is exempt — authenticated users must be allowed to stay there
        const authGuardExcluded = ['/consent-gate'];
        if (!authGuardExcluded.includes(p) && ['/login', '/signup', '/forgot-password', '/reset-password', '/'].includes(p)) {
          // 4. HARD REDIRECT
          window.location.replace('/dashboard');
          return;
        }

        // 2. We are validated. Fetch context profile memory and consent status in parallel
        const [res, consentRes] = await Promise.all([
          apiFetch(getApiUrl('/api/v1/auth/me'), {
            credentials: 'include',
            cache: 'no-store',
          }),
          apiFetch(getApiUrl('/api/v1/auth/consent-status'), {
            credentials: 'include',
            cache: 'no-store',
          })
        ]);

        if (!res.ok) {
          // if /me fails but /validate succeeds, try full refresh
          await refreshUser();
          if (mounted) setIsLoading(false);
          return;
        }

        const data = await res.json();
        let isCompliant = true;
        if (consentRes.ok) {
          const consentData = await consentRes.json();
          isCompliant = !!consentData.compliant;
        }

        if (mounted) {
          // Clear stale circuit-breaker so plan fetches work after Google OAuth login
          sessionStorage.removeItem('__refreshFailTs');
          sessionStorage.removeItem('__isRefreshing');
          setComplianceStatus(isCompliant ? 'accepted' : 'requires_acceptance');
          persistUser(data.user as User);
          setIsLoading(false);
        }
      } catch (_err) {
        if (mounted) {
          persistUser(null);
          setIsLoading(false);
        }
      }
    };

    runGlobalAuthGuard();

    // 6. PAGE VISIBILITY + PAGESHOW HANDLING
    const handlePageShow = async (event: PageTransitionEvent) => {
      if (event.persisted) {
        // BFCache restored detected. Force aggressive revalidation.
        try {
          const res = await apiFetch(getApiUrl('/api/v1/auth/validate'), {
            credentials: 'include',
            cache: 'no-store',
          });
          const data = await res.json();
          if (data.authenticated) {
            const path = window.location.pathname;
            if (['/login', '/signup', '/forgot-password'].includes(path) || path === '/') {
              window.location.replace('/dashboard');
            }
          }
        } catch {
          // ignore background errors
        }
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    // 7. GLOBAL 401 UNAUTHORIZED LISTENER
    // Triggered by apiFetch when a token refresh fails
    const PUBLIC_PATHS = [
      '/',
      '/product',
      '/experience',
      '/security',
      '/about',
      '/pricing',
      '/privacy',
      '/terms',
      '/data-processing',
      '/cookie-policy',
      '/client-portal',
      '/legal-notes',
    ];
    const handleUnauthorized = () => {
      logger.warn('Handling global auth:unauthorized event');
      // NOTE: Do NOT clear __refreshFailTs here — the circuit breaker must stay
      // active across the redirect so it suppresses the next cycle's retry.
      sessionStorage.removeItem('__isRefreshing');
      // Wipe plan cache so next user login never inherits this session's plan.
      import('@/contexts/PlanContext')
        .then(({ clearAllPlanCaches }) => clearAllPlanCaches())
        .catch(() => {});
      persistUser(null, true);
      // Do NOT redirect to /login if the user is already on a public page.
      // This prevents unauthenticated visitors from being kicked to login
      // just because a background API call (e.g. PlanContext) got a 401.
      const currentPath = window.location.pathname;
      const isPublicPage = PUBLIC_PATHS.some(
        (p) => currentPath === p || currentPath.startsWith(p + '/')
      );
      if (!isLoggingOut.current && !isPublicPage) {
        window.location.replace('/login');
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      mounted = false;
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [refreshUser, persistUser]);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    setIsLoading(true);
    setAuthState('loading');
    try {
      // Clear any existing auth state before login
      persistUser(null);

      const res = await apiFetch(getApiUrl('/api/v1/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        persistUser(null);
        setIsLoading(false);
        // Return specific error message and errorCode from backend
        return {
          success: false,
          error: data.error || data.message || 'Login failed',
          errorCode: data.errorCode, // Pass through errorCode for deleted account detection
        };
      }

      if (data.user) {
        // Clear stale circuit-breaker state so plan fetches work immediately after fresh login
        sessionStorage.removeItem('__refreshFailTs');
        sessionStorage.removeItem('__isRefreshing');
        setComplianceStatus(data.consentRequired ? 'requires_acceptance' : 'accepted');
        // 5. HISTORY STACK ELIMINATION
        // If the user has not accepted current required policies, gate them first.
        if (data.consentRequired) {
          window.location.replace('/consent-gate');
        } else {
          window.location.replace('/dashboard');
        }
        return { success: true };
      } else {
        persistUser(null);
        setIsLoading(false);
        setAuthState('unauthenticated');
        return { success: false, error: 'Invalid response from server' };
      }
    } catch {
      persistUser(null);
      setIsLoading(false);
      setAuthState('unauthenticated');
      return { success: false, error: 'Network error occurred' };
    }
  };

  const register = async (
    userData: RegisterData
  ): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    setIsLoading(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (!res.ok) {
        persistUser(null);
        setIsLoading(false);
        setAuthState('unauthenticated');
        return {
          success: false,
          error: data.error || 'Registration failed',
          errorCode: data.errorCode,
        };
      }

      persistUser(data.user as User);
      setComplianceStatus('accepted');
      setIsLoading(false);
      setAuthState('authenticated');
      return { success: true };
    } catch {
      persistUser(null);
      setIsLoading(false);
      setAuthState('unauthenticated');
      return { success: false, error: 'Network error occurred' };
    }
  };

  const logout = async () => {
    isLoggingOut.current = true;
    setIsLoading(true);
    try {
      await apiFetch(getApiUrl('/api/v1/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      // Wipe ALL user-scoped plan caches so the next account login starts fresh.
      try {
        const { clearAllPlanCaches } = await import('@/contexts/PlanContext');
        clearAllPlanCaches();
      } catch {
        /* non-fatal */
      }

      // This call handles clearing memory (setUser(null)), authState,
      // localStorage (SESSION_FLAG), and all cookie variants.
      persistUser(null, true);

      setIsLoading(false);
      isLoggingOut.current = false;

      // Use replace to prevent the protected page from staying in history
      window.location.replace('/login');
    }
  };

  const verifyEmail = async (
    token: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/verify-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Verification failed' };
      }

      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Network error occurred' };
    }
  };

  const resendVerificationEmail = async (
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/resend-verification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to send email' };
      }

      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Network error occurred' };
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    refreshUser,
    verifyEmail,
    resendVerificationEmail,
    isLoading,
    isAuthenticated: !!user,
    complianceStatus,
  };

  /**
   * Non-blocking render for public routes.
   *
   * Public pages (landing, login, signup, etc.) render immediately without
   * waiting for auth validation. This eliminates the full-page spinner that
   * previously blocked FCP on every landing page visit.
   *
   * Protected routes (/dashboard/*) still block on loading — they will show
   * the loader until the session is verified, then RequireAuth redirects
   * unauthenticated users to /login.
   *
   * Auth redirect for authenticated users on public routes still works:
   *  - Fast path: boot.js cookie check (synchronous, before React)
   *  - Slow path: runGlobalAuthGuard calls window.location.replace('/dashboard')
   *    after validation completes (~200-400ms after first paint)
   */
  const PUBLIC_RENDER_PATHS = [
    '/',
    '/product',
    '/experience',
    '/security',
    '/about',
    '/pricing',
    '/privacy',
    '/terms',
    '/data-processing',
    '/cookie-policy',
    '/client-portal',
    '/legal-notes',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/verification-pending',
  ];
  const isPublicRenderPath = PUBLIC_RENDER_PATHS.some(
    (p) => window.location.pathname === p || window.location.pathname.startsWith(p + '/')
  );

  if (authState === 'loading' && !isPublicRenderPath) {
    return <JuriqLoader size="full" text="Checking session..." />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
