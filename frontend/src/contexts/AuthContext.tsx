import React, { type ReactNode, createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import { getApiUrl, apiFetch } from '@/lib/api';

interface NotificationSettings {
  emailAlerts: boolean;
  smsAlerts: boolean;
  pushNotifications: boolean;
  hearingReminders: boolean;
  clientUpdates: boolean;
  billingAlerts: boolean;
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
  onboardingCompleted?: boolean;
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
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
  barNumber?: string;
  firm?: string;
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

// Lightweight flag — set on login/register, cleared on logout.
// Prevents /auth/me + /auth/refresh from firing when there is provably no session.
const SESSION_FLAG = 'juriq_has_session';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated" | "unknown">("loading");
  // Guard: prevents refreshUser() from re-authenticating while logout is in progress
  const isLoggingOut = useRef(false);
  const hasInitialized = useRef(false);

  const persistUser = useCallback((userData: User | null) => {
    if (userData) {
      setUser(userData);
      setAuthState("authenticated");
      // Mark that a session exists so future page loads can skip the blind auth check
      localStorage.setItem(SESSION_FLAG, '1');
    } else {
      setUser(null);
      setAuthState("unauthenticated");
      // Clear session flag so next page load skips /auth/me entirely
      localStorage.removeItem(SESSION_FLAG);
      localStorage.removeItem('juriq_user');
      // Clear cookies (belt-and-suspenders alongside httpOnly cookie cleared by backend)
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length > 1) {
        const domain = '.' + parts.slice(-2).join('.');
        document.cookie = `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await apiFetch(getApiUrl('/api/v1/auth/me'), {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        // user not logged in → expected
        // Skip refresh entirely if logout is in progress to prevent re-login after logout
        if (isLoggingOut.current) { persistUser(null); return; }
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
          if (!retryRes.ok) { persistUser(null); return; }
          const retryData = await retryRes.json();
          persistUser(retryData.user ? retryData.user as User : null);
          return;
        } catch {
          persistUser(null);
          return;
        }
      }

      if (!res.ok) { persistUser(null); return; }
      const data = await res.json();
      persistUser(data.user ? data.user as User : null);
    } catch (error: unknown) {
      if ((error as any).name !== 'AbortError') persistUser(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  }, [persistUser]);

  useEffect(() => {
    let mounted = true;
    let visibilityTimeout: NodeJS.Timeout | null = null;
    let focusTimeout: NodeJS.Timeout | null = null;

    const init = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      const hasSessionFlag = !!localStorage.getItem(SESSION_FLAG);

      try {
        setAuthState("loading");

        if (!hasSessionFlag) {
          // No prior session flag — could still be a Google OAuth redirect (JWT cookie
          // was set by backend but localStorage flag not yet written).
          // Do ONE fast /auth/me check with no refresh retry:
          //   • Google OAuth redirect  → /auth/me 200  → logs in, sets flag ✓
          //   • Truly logged-out user  → /auth/me 401  → goes unauthenticated (1 console error, unavoidable)
          try {
            const fastRes = await apiFetch(getApiUrl('/api/v1/auth/me'), {
              credentials: 'include',
              cache: 'no-store',
            });
            if (fastRes.ok) {
              const data = await fastRes.json();
              if (mounted) persistUser(data.user ? data.user as User : null);
            } else {
              if (mounted) persistUser(null);
            }
          } catch {
            if (mounted) persistUser(null);
          }
        } else {
          // Has session flag — do full refreshUser (includes /auth/refresh retry for expired sessions)
          const fetchWithTimeoutLocal = async <T,>(promise: Promise<T>, timeoutMs = 5000): Promise<T> => {
            const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Auth timeout")), timeoutMs));
            return Promise.race([promise, timeout]);
          };
          await fetchWithTimeoutLocal(refreshUser(), 5000);
        }
      } catch (err: unknown) {
        if (mounted) {
            const message = err instanceof Error ? err.message : '';
            if (message === 'Auth timeout' || message === 'timeout' || message.includes('fetch') || message.includes('Network')) {
                setAuthState("unknown"); // IMPORTANT: Keep user in unknown state rather than force logout
            } else {
                setAuthState("unauthenticated");
                persistUser(null);
            }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set a timeout to ensure loading doesn't hang forever
    const timeout = setTimeout(() => {
      if (mounted && authState !== 'unknown') {
        setIsLoading(false);
      }
    }, 5000); // Max 5 seconds for initial load

    init();

    // Handle browser back/forward cache (bfcache) - always revalidate
    const handlePageShow = async (event: PageTransitionEvent) => {
      // Always revalidate auth state when page is shown
      // This prevents stale auth state when using browser back/forward buttons
      if (event.persisted && mounted) {
        // If BFCache restored an unauthenticated state, but a session flag exists
        // (e.g. they logged in via Google redirect), show a loader to hide stale UI
        const needsLoader = authState !== 'authenticated' && !!localStorage.getItem(SESSION_FLAG);
        if (needsLoader) setIsLoading(true);
        
        await refreshUser();
        
        if (needsLoader && mounted) setIsLoading(false);
      }
    };

    // Also handle visibility change (tab switching) - debounced
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted) {
        // Debounce to prevent excessive calls
        if (visibilityTimeout) clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(async () => {
          if (mounted) {
            const needsLoader = authState !== 'authenticated' && !!localStorage.getItem(SESSION_FLAG);
            if (needsLoader) setIsLoading(true);
            await refreshUser();
            if (needsLoader && mounted) setIsLoading(false);
          }
        }, 500);
      }
    };

    // Handle focus events (window regains focus) - debounced
    const handleFocus = () => {
      if (focusTimeout) clearTimeout(focusTimeout);
      focusTimeout = setTimeout(async () => {
        if (mounted) {
            const needsLoader = authState !== 'authenticated' && !!localStorage.getItem(SESSION_FLAG);
            if (needsLoader) setIsLoading(true);
            await refreshUser();
            if (needsLoader && mounted) setIsLoading(false);
        }
      }, 500);
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
      if (focusTimeout) clearTimeout(focusTimeout);
    };
  }, [refreshUser, persistUser, authState]);

  useEffect(() => {
    if (authState === "unknown") {
      const timer = setTimeout(() => {
        setAuthState("unauthenticated");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [authState]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    setIsLoading(true);
    setAuthState("loading");
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
          errorCode: data.errorCode // Pass through errorCode for deleted account detection
        };
      }

      if (data.user) {
        persistUser(data.user as User);
        setIsLoading(false);
        setAuthState("authenticated");
        return { success: true };
      } else {
        persistUser(null);
        setIsLoading(false);
        setAuthState("unauthenticated");
        return { success: false, error: 'Invalid response from server' };
      }
    } catch {
      persistUser(null);
      setIsLoading(false);
      setAuthState("unauthenticated");
      return { success: false, error: 'Network error occurred' };
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
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
        setAuthState("unauthenticated");
        return { success: false, error: data.error || 'Registration failed', errorCode: data.errorCode };
      }

      persistUser(data.user as User);
      setIsLoading(false);
      setAuthState("authenticated");
      return { success: true };
    } catch {
      persistUser(null);
      setIsLoading(false);
      setAuthState("unauthenticated");
      return { success: false, error: 'Network error occurred' };
    }
  };

  const logout = async () => {
    // Set guard immediately — prevents any concurrent refreshUser() from re-logging in
    isLoggingOut.current = true;
    try {
      // Clear local state first
      persistUser(null);

      // Attempt server logout
      await apiFetch(getApiUrl('/api/v1/auth/logout'), {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store'
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Always clear local state regardless of server response
      persistUser(null);

      // Clear all cookies manually with all possible configurations
      const hostname = window.location.hostname;
      const cookiesToClear = [
        'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;',
        `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`,
      ];

      // Try clearing with parent domain if applicable
      const parts = hostname.split('.');
      if (parts.length > 1) {
        const domain = '.' + parts.slice(-2).join('.');
        cookiesToClear.push(`token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`);
      }

      cookiesToClear.forEach(cookie => {
        document.cookie = cookie;
      });

      // Clear sessionStorage and localStorage completely
      sessionStorage.clear();
      localStorage.removeItem('juriq_user');
      setAuthState("unauthenticated");

      // Replace current history entry with /login so protected pages
      // are not reachable via browser back/forward after logout.
      window.location.replace('/login');
    }
  };

  const verifyEmail = async (token: string): Promise<{ success: boolean; message?: string; error?: string }> => {
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

  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
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
    isAuthenticated: !!user
  };

  if (authState === "loading" || authState === "unknown") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};