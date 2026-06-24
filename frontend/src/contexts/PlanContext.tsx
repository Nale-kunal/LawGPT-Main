import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl, apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = 'free' | 'basic' | 'pro' | 'premium' | 'elite';

interface PlanInfo {
  plan:           Plan;
  rawPlan:        Plan;
  planStartDate:  string | null;
  planEndDate:    string | null;
  isCouponActive: boolean;
  couponCodeUsed: string | null;
  expired:        boolean;
}

interface PlanContextType {
  plan:              Plan;
  planInfo:          PlanInfo | null;
  isFeatureAllowed:  (feature: string) => boolean;
  refreshPlan:       () => Promise<void>;
  applyCoupon:       (code: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  createOrder:       (plan: Plan, billingCycle: 'monthly' | 'yearly') => Promise<{ success: boolean; data?: object; error?: string }>;
  isLoadingPlan:     boolean;
  isPlanLoaded:      boolean;
}

// ─── Feature map (mirrors backend planFeatures.js) ───────────────────────────

const PLAN_HIERARCHY: Plan[] = ['free', 'basic', 'pro', 'premium', 'elite'];

const FEATURE_MAP: Record<string, Plan> = {
  dashboard:        'free',
  calendar:         'free',
  cases:            'free',
  clients:          'free',
  settings:         'free',
  documents:        'pro',
  'legal-research': 'pro',
  hearings:         'pro',
  templates:        'premium',
  notes:            'premium',
  news:             'elite',
};

function planCanAccess(userPlan: Plan, requiredPlan: Plan): boolean {
  return PLAN_HIERARCHY.indexOf(userPlan) >= PLAN_HIERARCHY.indexOf(requiredPlan);
}

// ─── Cache helpers (USER-SCOPED key — prevents plan bleed between accounts) ───

const CACHE_PREFIX = 'juriq_plan_cache_';
const CACHE_TTL    = 5 * 60 * 1000; // 5 minutes

/** Returns the sessionStorage key scoped to this user's ID. */
function cacheKey(userId: string | undefined): string {
  return userId ? `${CACHE_PREFIX}${userId}` : `${CACHE_PREFIX}anonymous`;
}

function readCache(userId: string | undefined): PlanInfo | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(cacheKey(userId));
      return null;
    }
    return data as PlanInfo;
  } catch { return null; }
}

function writeCache(userId: string | undefined, info: PlanInfo) {
  try {
    sessionStorage.setItem(cacheKey(userId), JSON.stringify({ data: info, ts: Date.now() }));
  } catch { /* ignore */ }
}

function clearCache(userId: string | undefined) {
  try { sessionStorage.removeItem(cacheKey(userId)); } catch { /* ignore */ }
}

/**
 * Wipe ALL plan caches for every user stored in this browser session.
 * Called on logout so no plan data leaks to the next login.
 */
export function clearAllPlanCaches() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const usePlan = (): PlanContextType => {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
};

interface PlanProviderProps { children: React.ReactNode }

export const PlanProvider: React.FC<PlanProviderProps> = ({ children }) => {
  // Read the authenticated user and compliance status.
  const { user, complianceStatus } = useAuth();
  const userId = user?.id;

  // Initialize from user-scoped cache — NOT from anonymous/other-user cache.
  const [planInfo, setPlanInfo]     = useState<PlanInfo | null>(() => readCache(userId));
  const [isLoadingPlan, setLoading] = useState(!readCache(userId));
  const [isPlanLoaded, setLoaded]   = useState(!!readCache(userId));
  const fetchingRef                 = useRef(false);

  const refreshPlan = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/subscription/plan'), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.ok) {
        const data: PlanInfo = await res.json();
        setPlanInfo(data);
        writeCache(userId, data);
      }
    } catch { /* fail silently — default to free */ }
    finally {
      setLoading(false);
      setLoaded(true);
      fetchingRef.current = false;
    }
  }, [userId]);

  // Re-run whenever the logged-in user changes (login / logout / account switch).
  useEffect(() => {
    // No user logged in — skip all plan fetching to avoid triggering 401s
    // on protected endpoints (which would fire auth:unauthorized and redirect to login).
    if (!userId) {
      setPlanInfo(null);
      setLoading(false);
      setLoaded(true);
      return;
    }

    // Gate on compliance status: do not fetch subscription plan until compliance is verified and passes
    if (complianceStatus !== 'accepted') {
      setPlanInfo(null);
      setLoading(false);
      setLoaded(true);
      return;
    }

    // When userId changes (account switch), always drop any stale in-memory state
    // and re-read from the correct user-scoped cache.
    const cached = readCache(userId);
    if (cached) {
      setPlanInfo(cached);
      setLoading(false);
      setLoaded(true);
    } else {
      // No cache for this user — reset state and fetch fresh.
      setPlanInfo(null);
      setLoaded(false);
      refreshPlan();
    }
  }, [userId, complianceStatus, refreshPlan]);

  const effectivePlan: Plan = planInfo?.plan ?? 'free';

  const isFeatureAllowed = useCallback((feature: string): boolean => {
    const required = FEATURE_MAP[feature] ?? 'free';
    return planCanAccess(effectivePlan, required);
  }, [effectivePlan]);

  const applyCoupon = useCallback(async (code: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await apiFetch(getApiUrl('/api/v1/subscription/apply-coupon'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        clearCache(userId);
        await refreshPlan();
        return { success: true, message: data.message };
      }
      return { success: false, error: data.message || data.error || 'Failed to apply coupon' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [userId, refreshPlan]);

  const createOrder = useCallback(async (plan: Plan, billingCycle: 'monthly' | 'yearly') => {
    try {
      const res = await apiFetch(getApiUrl('/api/v1/payment/create-order'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle }),
      });
      const data = await res.json();
      if (res.ok) return { success: true, data };
      return { success: false, error: data.message || data.error || 'Failed to create order' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  return (
    <PlanContext.Provider value={{
      plan: effectivePlan,
      planInfo,
      isFeatureAllowed,
      refreshPlan,
      applyCoupon,
      createOrder,
      isLoadingPlan,
      isPlanLoaded,
    }}>
      {children}
    </PlanContext.Provider>
  );
};

export { FEATURE_MAP, PLAN_HIERARCHY, planCanAccess };
export type { Plan, PlanInfo };
