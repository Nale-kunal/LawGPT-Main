import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlan, type Plan } from '@/contexts/PlanContext';
import { Zap, Crown } from 'lucide-react';

const PAID_PLANS: Plan[] = ['basic', 'pro', 'premium', 'elite'];

const PLAN_DISPLAY: Record<Plan, string> = {
  free:    'Free',
  basic:   'Basic',
  pro:     'Pro',
  premium: 'Premium',
  elite:   'Elite ✦',
};

export const UpgradePlanButton: React.FC = () => {
  const { plan } = usePlan();
  const navigate  = useNavigate();
  const isPaid    = PAID_PLANS.includes(plan);

  if (isPaid) {
    // Subtle badge for paid users — matches the app's muted-foreground text style
    return (
      <button
        id="manage-plan-btn"
        onClick={() => navigate('/dashboard/pricing')}
        title={`Active plan: ${PLAN_DISPLAY[plan]}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
          border border-border bg-muted text-muted-foreground
          hover:bg-accent hover:text-accent-foreground hover:border-primary/30
          transition-all duration-200 cursor-pointer select-none whitespace-nowrap"
      >
        <Crown className="w-3 h-3" />
        {PLAN_DISPLAY[plan]}
      </button>
    );
  }

  // For free users — animated gradient border + moving internal shine
  return (
    <>
      <button
        id="upgrade-plan-btn"
        onClick={() => navigate('/dashboard/pricing')}
        title="Upgrade your plan"
        className="
          upgrade-plan-btn
          inline-flex items-center gap-1.5 whitespace-nowrap
          text-xs font-bold
          cursor-pointer select-none
          relative overflow-hidden
          rounded-full px-3 py-1
          text-white
          transition-transform duration-200
          hover:scale-105
          active:scale-95
        "
      >
        {/* Animated rotating conic gradient background */}
        <span
          aria-hidden
          className="upgrade-btn-bg absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from var(--angle, 0deg), #f97316, #f59e0b, #facc15, #4ade80, #22d3ee, #818cf8, #c084fc, #f472b6, #f97316)',
            animation: 'upgradeRotate 3s linear infinite',
          }}
        />
        {/* Inset mask so only a thin border shows */}
        <span
          aria-hidden
          className="absolute inset-[2px] rounded-full bg-card"
          style={{ transition: 'background 0.2s' }}
        />
        {/* Content on top */}
        <span className="relative flex items-center gap-1 text-foreground font-semibold">
          <Zap className="w-3 h-3 text-primary" />
          <span
            style={{
              background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)))',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'upgradeTextShine 2.5s linear infinite',
            }}
          >
            Upgrade Plan
          </span>
        </span>
      </button>

      <style>{`
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes upgradeRotate {
          to { --angle: 360deg; }
        }
        @keyframes upgradeTextShine {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </>
  );
};
