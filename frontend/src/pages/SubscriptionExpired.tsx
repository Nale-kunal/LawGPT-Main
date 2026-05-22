import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, Zap, ArrowRight, RefreshCw } from 'lucide-react';
import { usePlan } from '@/contexts/PlanContext';

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', basic: 'Basic', pro: 'Pro', premium: 'Premium', elite: 'Elite ✦',
};

// Features that remain accessible on free plan
const FREE_FEATURES = ['Dashboard', 'Calendar', 'Up to 5 Cases', 'Clients', 'Settings'];

export default function SubscriptionExpired() {
  const navigate = useNavigate();
  const { plan, planInfo } = usePlan();

  const expiredPlan = planInfo?.rawPlan ?? 'pro';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center">
            <Clock className="w-12 h-12 text-amber-500" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Your Plan Has Expired</h1>
          <p className="text-muted-foreground mt-2">
            Your <span className="font-semibold text-foreground">{PLAN_LABELS[expiredPlan]}</span> plan
            has expired. You've been moved to the Free plan.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Still Available</p>
            <ul className="space-y-1">
              {FREE_FEATURES.map(f => (
                <li key={f} className="text-sm flex items-center gap-1.5">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Locked Features</p>
            <ul className="space-y-1">
              {['Billing & Invoicing', 'Documents', 'Legal Research', 'Templates', 'Notes', 'Legal News'].map(f => (
                <li key={f} className="text-sm flex items-center gap-1.5 text-muted-foreground">
                  <span className="text-destructive">✗</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
          <p className="font-medium">Resubscribe and pick up where you left off</p>
          <p className="text-xs text-muted-foreground mt-1">
            All your data (cases, clients, documents) is safely preserved.
            Reactivate your plan anytime to regain full access.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => navigate('/dashboard/pricing')} className="gap-2">
            <Zap className="w-4 h-4" /> Reactivate Plan
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
            Continue on Free <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground"
          onClick={() => { window.location.reload(); }}>
          <RefreshCw className="w-3 h-3" /> Check plan status
        </Button>
      </div>
    </div>
  );
}
