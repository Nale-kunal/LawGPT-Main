import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Clock, ChevronRight, Sparkles, X } from 'lucide-react';
import OnboardingOverlay from './OnboardingOverlay';
import {
  isReminderDismissed,
  dismissReminderFor24h,
  checkAndMarkFirstDashboardVisit,
  calculateOnboardingProgress,
} from '@/lib/onboardingUtils';

/**
 * OnboardingBanner
 *
 * Non-blocking, 24h-dismissible reminder shown on the Dashboard when
 * onboarding is incomplete. Follows enterprise SaaS UX standards:
 *
 * Reminder lifecycle:
 * ─ User clicks "Remind me in 24h" → banner hidden for exactly 24 hours,
 *   stored in localStorage under a per-user key:
 *   `juriq_ob_reminder_hidden_until_<userId>` — no network call.
 * ─ After 24 hours → banner reappears automatically on next render.
 * ─ User A dismissing does NOT affect User B on the same browser.
 * ─ Once user.onboardingCompleted === true (DB state) → never renders again.
 *
 * First-visit awareness:
 * ─ First visit → "Welcome to Juriq!" title.
 * ─ Subsequent visits → "Complete Your Workspace Setup" title.
 * ─ State stored in localStorage scoped per userId (multi-account safe).
 *
 * Progress:
 * ─ Calculates completed steps from existing user.profile fields.
 * ─ Zero additional API calls — derived from data already in AuthContext.
 *
 * Security: This component is UI-only. Completion state is server-owned.
 * See onboardingUtils.ts for full security contract documentation.
 */
const OnboardingBanner = () => {
  const { user } = useAuth();

  // Initialise dismiss state. We cannot read localStorage in the lazy initializer
  // because user.id is not available yet during the very first synchronous render.
  // We default to false (show banner) and correct it in the useEffect below once
  // user has hydrated. This avoids a layout flash in the common case where the
  // user is NOT dismissed, and produces at most one re-render for the dismissed case.
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showWizard, setShowWizard] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  // Runs once after user hydrates: check the user-scoped dismiss key and
  // mark first-visit. Both are localStorage reads — O(1), no network call.
  useEffect(() => {
    if (user?.id) {
      setIsDismissed(isReminderDismissed(user.id));
      setIsFirstVisit(checkAndMarkFirstDashboardVisit(user.id));
    }
  }, [user?.id]);

  // Guard 1: Only show when onboarding is genuinely incomplete (DB state).
  // This is the authoritative check — all client-side suppression is secondary.
  if (user?.onboardingCompleted !== false) return null;

  // Guard 2: Within 24-hour suppression window.
  if (isDismissed) return null;

  const progress = calculateOnboardingProgress(user);

  const handleDismiss = () => {
    if (user?.id) {
      dismissReminderFor24h(user.id);
    }
    setIsDismissed(true);
  };

  // Contextual messaging: first visit vs returning user
  const title = isFirstVisit ? 'Welcome to Juriq!' : 'Complete Your Workspace Setup';
  const description = isFirstVisit
    ? 'Complete your workspace setup to start managing cases, hearings, clients, and legal workflows.'
    : 'Continue your remaining setup steps to unlock the full Juriq experience.';

  return (
    <>
      {/* ─── Non-blocking reminder banner ──────────────────────────────────── */}
      <div
        role="status"
        aria-label="Workspace setup reminder"
        aria-live="polite"
        className={[
          'relative rounded-xl border overflow-hidden',
          'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent',
          'border-primary/20 shadow-sm',
          'animate-in fade-in slide-in-from-top-2 duration-300',
        ].join(' ')}
      >
        {/* Progress bar — thin strip at the very top of the card */}
        <div
          className="h-[3px] bg-primary/10 w-full"
          role="progressbar"
          aria-valuenow={progress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Workspace setup ${progress.completedCount} of ${progress.totalCount} steps completed`}
        >
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Banner body */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Icon */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15"
            aria-hidden="true"
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
              {/* Progress badge */}
              <span
                className={[
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0',
                  progress.completedCount > 0
                    ? 'bg-primary/15 text-primary'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                ].join(' ')}
                aria-hidden="true"
              >
                {progress.completedCount}/{progress.totalCount} steps
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              id="onboarding-banner-complete"
              size="sm"
              onClick={() => setShowWizard(true)}
              className="h-8 gap-1.5 text-xs font-semibold"
              aria-label="Open workspace setup wizard"
            >
              {progress.completedCount === 0 ? 'Start Setup' : 'Continue Setup'}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              id="onboarding-banner-dismiss"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss reminder for 24 hours"
              title="Remind me in 24 hours"
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Dismiss for 24 hours</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── User-initiated wizard overlay (never auto-opens) ──────────────── */}
      {showWizard && (
        <div role="dialog" aria-modal="true" aria-label="Workspace setup wizard">
          {/* Blur backdrop */}
          <div
            className="fixed inset-0 z-[9997] bg-background/50 backdrop-blur-[6px]"
            aria-hidden="true"
            onClick={() => setShowWizard(false)}
          />
          {/* Wizard container */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            <div
              className="relative z-10 max-w-3xl w-full mx-4 max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close control */}
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWizard(false)}
                  className="h-8 gap-1.5 text-xs bg-background/80 backdrop-blur-sm"
                  aria-label="Close setup wizard and return to dashboard"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Return to Dashboard
                </Button>
              </div>
              {/* Wizard content */}
              <div className="max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
                <OnboardingOverlay />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OnboardingBanner;
