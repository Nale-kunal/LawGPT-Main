/**
 * onboardingUtils.ts
 *
 * Single source of truth for all client-side onboarding logic.
 * Imported by OnboardingBanner and Settings — ensures consistent progress
 * calculation and reminder suppression across both surfaces.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SECURITY CONTRACT
 * ──────────────────────────────────────────────────────────────────────────
 * - This module is PURELY client-side and UX-only.
 * - It NEVER modifies auth state, JWTs, cookies, or server-owned data.
 * - Reminder suppression lives in localStorage (UI preference, not business state).
 * - Onboarding COMPLETION remains exclusively server-owned (user.onboardingCompleted).
 * - Progress is DERIVED from user profile fields already in the /me payload.
 *   Zero additional API calls are made.
 * - localStorage keys are clearly prefixed (juriq_ob_*) and store no sensitive data.
 * - All functions fail-safe (try/catch) for private browsing / storage policy blocks.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * MULTI-TENANT SAFETY
 * ──────────────────────────────────────────────────────────────────────────
 * - First-visit keys are scoped per userId: `juriq_ob_first_visit_<userId>`
 *   so multi-account environments on the same device are fully isolated.
 * - Dismiss keys are also scoped per userId: `juriq_ob_reminder_hidden_until_<userId>`
 *   so User A dismissing a reminder does NOT affect User B on the same browser.
 * - All key construction goes through getReminderStorageKey(userId) — the single
 *   source of truth for the key format. Never build keys inline in components.
 * - Completion state from the server always takes precedence over any local state.
 */

// ── Internal type (mirrors AuthContext User profile — avoids circular import) ──
interface UserProfile {
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
}

export interface UserForProgress {
  profile?: UserProfile;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STEP DEFINITIONS & PROGRESS CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

export interface OnboardingStep {
  id: string;
  label: string;
  /** required = must be filled; optional = adds to profile richness */
  required: boolean;
  isCompleted: (user: UserForProgress) => boolean;
}

/**
 * Canonical list of onboarding steps — matches the 5 fillable steps of
 * the OnboardingWizard (step 6 is a confirmation screen, not a data step).
 *
 * Steps are checked against profile data already present in the /me payload,
 * so progress is always accurate with zero extra network requests.
 */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'identity',
    label: 'Identity Verification',
    required: true,
    isCompleted: (u) => !!(u.profile?.fullName?.trim() && u.profile?.barCouncilNumber?.trim()),
  },
  {
    id: 'currency',
    label: 'Currency Selection',
    required: true,
    isCompleted: (u) => !!u.profile?.currency?.trim(),
  },
  {
    id: 'professional',
    label: 'Professional Details',
    required: false,
    isCompleted: (u) =>
      !!(
        u.profile?.lawFirmName?.trim() ||
        (u.profile?.practiceAreas?.length ?? 0) > 0 ||
        (u.profile?.courtLevels?.length ?? 0) > 0
      ),
  },
  {
    id: 'contact',
    label: 'Contact Information',
    required: false,
    isCompleted: (u) => !!(u.profile?.phoneNumber?.trim() || u.profile?.address?.trim()),
  },
  {
    id: 'preferences',
    label: 'Preferences',
    required: false,
    isCompleted: (u) => !!u.profile?.timezone?.trim(),
  },
] as const;

export interface OnboardingProgress {
  /** Number of steps currently completed */
  completedCount: number;
  /** Total steps in the wizard */
  totalCount: number;
  /** Integer percentage 0–100 */
  percentage: number;
  /** Labels of completed steps */
  completedSteps: string[];
  /** Labels of remaining steps */
  remainingSteps: string[];
}

/**
 * Calculates how many of the 5 setup steps a user has populated.
 * Derived from existing profile fields — no network request required.
 */
export function calculateOnboardingProgress(user: UserForProgress): OnboardingProgress {
  const completedSteps: string[] = [];
  const remainingSteps: string[] = [];

  for (const step of ONBOARDING_STEPS) {
    if (step.isCompleted(user)) {
      completedSteps.push(step.label);
    } else {
      remainingSteps.push(step.label);
    }
  }

  const completedCount = completedSteps.length;
  const totalCount = ONBOARDING_STEPS.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return { completedCount, totalCount, percentage, completedSteps, remainingSteps };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 24-HOUR REMINDER SUPPRESSION (per-user scoped)
// ─────────────────────────────────────────────────────────────────────────────

const DISMISS_KEY_PREFIX = 'juriq_ob_reminder_hidden_until_';

/**
 * Returns the localStorage key for a given user's reminder suppression.
 *
 * This is the SINGLE source of truth for key construction.
 * All reads and writes MUST go through this function — never build keys inline.
 *
 * Format: `juriq_ob_reminder_hidden_until_<userId>`
 * Example: `juriq_ob_reminder_hidden_until_66531ab91f8f6e0e4d8f9a12`
 *
 * Scoped per userId so that:
 * - User A dismissing reminder does NOT affect User B on the same browser.
 * - User A logging back in within 24h still sees their own suppression.
 * - A missing/empty userId returns a safe fallback key (no-op behaviour).
 */
export function getReminderStorageKey(userId: string): string {
  if (!userId?.trim()) {
    // Safe fallback: an isolated key that won't collide with any real user.
    // isReminderDismissed will find nothing and return false (show banner).
    return `${DISMISS_KEY_PREFIX}__anonymous__`;
  }
  return `${DISMISS_KEY_PREFIX}${userId}`;
}

/**
 * Returns true if the reminder is within its 24-hour suppression window
 * for the given authenticated user.
 *
 * Returns false if: userId missing, key absent, value corrupt, or window expired.
 * Falls back to false (show reminder) if localStorage is unavailable.
 */
export function isReminderDismissed(userId: string): boolean {
  try {
    const key = getReminderStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const expiresAt = new Date(raw);
    if (isNaN(expiresAt.getTime())) {
      // Corrupt value — clear it and show banner
      localStorage.removeItem(key);
      return false;
    }
    return new Date() < expiresAt;
  } catch {
    // localStorage unavailable (private mode, CSP) — show banner
    return false;
  }
}

/**
 * Suppresses the reminder for exactly 24 hours from now, scoped to the
 * given authenticated user. Silently fails if localStorage is unavailable.
 */
export function dismissReminderFor24h(userId: string): void {
  try {
    const key = getReminderStorageKey(userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    localStorage.setItem(key, expiresAt.toISOString());
  } catch {
    // localStorage unavailable — banner will reappear on next render
  }
}

/**
 * Returns the UTC Date when the suppression window expires for the given user,
 * or null if no active suppression is in effect. Useful for display / debugging.
 */
export function getReminderResumeTime(userId: string): Date | null {
  try {
    const key = getReminderStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FIRST-VISIT DETECTION (per user, UX-only)
// ─────────────────────────────────────────────────────────────────────────────

const FIRST_VISIT_PREFIX = 'juriq_ob_first_visit_';

/**
 * Returns true on the FIRST time the given user visits the dashboard.
 * Marks the visit in localStorage immediately so subsequent calls return false.
 *
 * Key is scoped per userId so multi-account environments remain isolated.
 * Pure UX — no security or access-control implications.
 */
export function checkAndMarkFirstDashboardVisit(userId: string): boolean {
  if (!userId) return false;
  try {
    const key = `${FIRST_VISIT_PREFIX}${userId}`;
    const alreadyVisited = localStorage.getItem(key);
    if (!alreadyVisited) {
      localStorage.setItem(key, new Date().toISOString());
      return true; // This is the first visit
    }
    return false;
  } catch {
    // localStorage unavailable — treat as returning user
    return false;
  }
}
