import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlan, type Plan } from '@/contexts/PlanContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Zap, Lock, Tag, ArrowRight, CheckCircle2, AlertCircle, Loader2, Crown } from 'lucide-react';

// ─── Plan metadata (must match planFeatures.js) ───────────────────────────────

const PLAN_LABELS: Record<Plan, string> = {
  free:    'Free',
  basic:   'Basic',
  pro:     'Pro',
  premium: 'Premium',
  elite:   'Elite',
};

const FEATURE_LABELS: Record<string, string> = {
  documents:        'Document Manager',
  'legal-research': 'Legal Research',
  hearings:         'Hearing Management',
  templates:        'Legal Templates',
  notes:            'Case Notes',
  news:             'Legal News',
};

const PLAN_INCLUDES: Record<Plan, string[]> = {
  free:    ['Dashboard', 'Calendar', 'Cases (5 max)', 'Clients', 'Settings'],
  basic:   ['Everything in Free', 'Cases (50 max)'],
  pro:     ['Everything in Basic', 'Documents', 'Legal Research', 'Hearings'],
  premium: ['Everything in Pro', 'Legal Templates', 'Case Notes'],
  elite:   ['Everything in Premium', 'Legal News', 'All Future Features'],
};

interface AccessDeniedOverlayProps {
  feature:      string;
  requiredPlan: Plan;
  /**
   * When true: overlay is absolute-positioned inside the FeatureGate wrapper,
   * so the sidebar/header remain accessible. Default: false (fixed, full-screen).
   */
  inline?:      boolean;
}

export const AccessDeniedOverlay: React.FC<AccessDeniedOverlayProps> = ({ feature, requiredPlan, inline = false }) => {
  const navigate = useNavigate();
  const { applyCoupon } = usePlan();
  const [showCoupon, setShowCoupon]       = useState(false);
  const [couponCode, setCouponCode]       = useState('');
  const [couponStatus, setCouponStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [couponMessage, setCouponMessage] = useState('');

  const featureLabel = FEATURE_LABELS[feature] || feature;
  const planLabel    = PLAN_LABELS[requiredPlan] || requiredPlan;
  const includes     = PLAN_INCLUDES[requiredPlan] || [];

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponStatus('loading');
    const result = await applyCoupon(couponCode.trim());
    if (result.success) {
      setCouponStatus('success');
      setCouponMessage(result.message || `${planLabel} plan activated!`);
    } else {
      setCouponStatus('error');
      setCouponMessage(result.error || 'Failed to apply coupon');
    }
  };

  return (
    <>
      {/*
       * BACKDROP
       * ─────────
       * absolute inset-0           → fills the FeatureGate wrapper (scoped to content pane)
       * fixed  inset-0 z-[9999]   → fills the full viewport (standalone use)
       * overflow-hidden            → prevents any inner scroll from leaking
       */}
      <div
        aria-hidden
        className={inline ? 'absolute inset-0 z-40' : 'fixed inset-0 z-[9999]'}
        style={{
          background:          'hsl(var(--background) / 0.82)',
          backdropFilter:      'blur(6px)',
          WebkitBackdropFilter:'blur(6px)',
        }}
      />

      {/*
       * CARD POSITIONER
       * ────────────────
       * For inline mode: fixed + centred — the card is anchored to the
       * viewport centre so it is ALWAYS fully visible regardless of how
       * wide or tall the underlying page content is.
       * The z-index is one above the backdrop (z-41).
       *
       * For standalone (non-inline) mode: same fixed centre, z-[10000].
       */}
      <div
        id="access-denied-overlay"
        className={[
          'fixed z-[10000]',
          'flex items-center justify-center',
          'inset-0 pointer-events-none',   // let clicks outside fall through to backdrop
        ].join(' ')}
      >
        <div
          className="w-full max-w-md mx-4 pointer-events-auto animate-in fade-in-0 zoom-in-95 duration-300"
          style={{ animationFillMode: 'both' }}
        >
          <Card className="card-gradient shadow-professional border border-border overflow-hidden">
            {/* Top accent strip */}
            <div className="h-1 w-full" style={{ background: 'var(--gradient-hero)' }} />

            <CardHeader className="pb-3 pt-5">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted border border-border text-primary">
                  <Lock className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-foreground">Plan Upgrade Required</h2>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{featureLabel}</span>
                    {' '}is available on the{' '}
                    <Badge variant="secondary" className="text-primary border-primary/30 font-semibold text-xs">
                      <Crown className="w-2.5 h-2.5 mr-1" />
                      {planLabel}
                    </Badge>
                    {' '}plan and above.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pb-5">
              {/* Plan feature list */}
              <div className="rounded-xl bg-muted/50 border border-border p-3.5 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {planLabel} plan includes
                </p>
                {includes.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              {/* Coupon hint */}
              <div className="flex items-start gap-2.5 rounded-xl bg-yellow-500/8 border border-yellow-500/20 p-3 dark:bg-yellow-500/5">
                <Tag className="w-4 h-4 text-yellow-500 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                    Free trial available
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use{' '}
                    <code className="font-mono font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 px-1 py-0.5 rounded text-[11px]">
                      WELCOMETOJURIQ
                    </code>
                    {' '}for 3 months Elite access
                  </p>
                </div>
              </div>

              {/* Coupon input (togglable) */}
              {showCoupon && (
                <div className="space-y-2">
                  {couponStatus === 'success' ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{couponMessage} — Navigate to another page or refresh.</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          id="coupon-input-overlay"
                          type="text"
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                          className="font-mono tracking-widest text-sm h-9 uppercase"
                          autoFocus
                        />
                        <Button
                          id="apply-coupon-btn-overlay"
                          size="sm"
                          onClick={handleApplyCoupon}
                          disabled={couponStatus === 'loading' || !couponCode.trim()}
                          className="h-9 px-4 shrink-0"
                        >
                          {couponStatus === 'loading'
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : 'Apply'}
                        </Button>
                      </div>
                      {couponStatus === 'error' && (
                        <div className="flex items-center gap-1.5 text-xs text-destructive">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {couponMessage}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  id="upgrade-now-btn"
                  onClick={() => navigate('/dashboard/pricing')}
                  className="w-full gap-2"
                >
                  <Zap className="w-4 h-4" />
                  View Plans & Upgrade
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>

                {!showCoupon && couponStatus !== 'success' && (
                  <Button
                    id="apply-coupon-toggle-btn"
                    variant="outline"
                    onClick={() => setShowCoupon(true)}
                    className="w-full gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    I have a coupon code
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};
