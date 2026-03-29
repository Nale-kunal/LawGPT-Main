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

// Session boundaries are now strictly governed by secure backend cookies
// and synchronous /validate calls, destroying old frontend fallbacks.

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated" | "unknown">("loading");
  // Guard: prevents refreshUser() from re-authenticating while logout is in progress
  const isLoggingOut = useRef(false);
  const hasInitialized = useRef(false);

  const persistUser = useCallback((userData: User | null, shouldClearCookies = false) => {
    if (userData) {
      setUser(userData);
      setAuthState("authenticated");
    } else {
      setUser(null);
      setAuthState("unauthenticated");
      
      if (shouldClearCookies) {
        // Clear cookies generically from frontend just in case backend fails
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
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
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

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

    const runGlobalAuthGuard = async () => {
      try {
        setAuthState("loading");
        
        // 1. Core verification against new /validate endpoint
        const valRes = await apiFetch(getApiUrl('/api/v1/auth/validate'), {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        const valData = await valRes.json();
        
        if (!valData.authenticated) {
          if (mounted) {
            persistUser(null);
            setIsLoading(false);
          }
          return;
        }

        // 3. GLOBAL AUTH GUARD (IF AUTHENTICATED -> NO RENDER OF LOGIN)
        const p = window.location.pathname;
        if (['/login', '/signup', '/forgot-password', '/reset-password'].includes(p)) {
           // 4. HARD REDIRECT
           window.location.replace('/dashboard');
           return;
        }

        // 2. We are validated. Fetch context profile memory.
        const res = await apiFetch(getApiUrl('/api/v1/auth/me'), {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!res.ok) {
           // if /me fails but /validate succeeds, try full refresh
           await refreshUser();
           if (mounted) setIsLoading(false);
           return;
        }
        
        const data = await res.json();
        if (mounted) {
          persistUser(data.user as User);
          setIsLoading(false);
        }
      } catch (err) {
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
             cache: 'no-store'
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
    const handleUnauthorized = () => {
      console.warn('Handling global auth:unauthorized event');
      persistUser(null, true);
      if (!isLoggingOut.current) {
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
        // 5. HISTORY STACK ELIMINATION
        // We do NOT use React Router here to jump. We trigger a real hard redirect destroying backward trace natively.
        window.location.replace('/dashboard');
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
    isLoggingOut.current = true;
    setIsLoading(true);
    try {
      await apiFetch(getApiUrl('/api/v1/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // This call handles clearing memory (setUser(null)), authState, 
      // localStorage (SESSION_FLAG), and all cookie variants.
      persistUser(null, true);
      
      setIsLoading(false);
      isLoggingOut.current = false;
      
      // Use replace to prevent the protected page from staying in history
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

  if (authState === "loading") {
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