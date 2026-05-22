import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlan } from '@/contexts/PlanContext';
import { apiFetch, getApiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, ArrowRight, Zap } from 'lucide-react';

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', basic: 'Basic', pro: 'Pro', premium: 'Premium', elite: 'Elite ✦',
};

type Stage = 'verifying' | 'polling' | 'activated' | 'timeout';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refreshPlan, plan } = usePlan();
  const [stage, setStage] = useState<Stage>('verifying');
  const [activatedPlan, setActivatedPlan] = useState<string | null>(null);
  const didRun = useRef(false); // prevent StrictMode double-fire

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const paymentId    = params.get('razorpay_payment_id');
    const subId        = params.get('razorpay_subscription_id');
    const signature    = params.get('razorpay_signature');

    // If coming from Razorpay callback with params, verify signature first
    const verify = async () => {
      if (paymentId && subId && signature) {
        try {
          await apiFetch(getApiUrl('/api/v1/payment/verify-payment'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: paymentId,
              razorpay_subscription_id: subId,
              razorpay_signature: signature,
            }),
          });
        } catch {
          // Non-critical — webhook will activate the plan regardless
        }
      }

      // Poll for plan activation (webhook is the real activator)
      setStage('polling');
      const deadline = Date.now() + 30_000;
      const prevPlan = plan;

      const poll = setInterval(async () => {
        await refreshPlan();
        // Check if plan changed from what it was
        if (Date.now() > deadline) {
          clearInterval(poll);
          setStage('timeout');
          return;
        }
      }, 3000);

      // Also check every refresh
      const checkActivation = () => {
        if (plan !== 'free' && plan !== prevPlan) {
          clearInterval(poll);
          setActivatedPlan(plan);
          setStage('activated');
        }
      };

      const t = setInterval(checkActivation, 1000);
      setTimeout(() => { clearInterval(t); clearInterval(poll); if (stage !== 'activated') setStage('timeout'); }, 35_000);

      return () => { clearInterval(poll); clearInterval(t); };
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When plan refreshes in context, check if we're done
  useEffect(() => {
    if (stage === 'polling' && plan && plan !== 'free') {
      setActivatedPlan(plan);
      setStage('activated');
    }
  }, [plan, stage]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Verifying / Polling */}
        {(stage === 'verifying' || stage === 'polling') && (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Activating Your Plan…</h1>
              <p className="text-muted-foreground mt-2">
                {stage === 'verifying' ? 'Verifying your payment…' : 'Confirming with our payment gateway. This usually takes a few seconds.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Waiting for confirmation
            </div>
          </>
        )}

        {/* Activated */}
        {stage === 'activated' && (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center animate-bounce-once">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">Payment Successful!</h1>
              <p className="text-muted-foreground mt-2">
                Your <span className="font-semibold text-foreground">{PLAN_LABELS[activatedPlan ?? plan] ?? plan}</span> plan is now active.
              </p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-700 dark:text-green-300 space-y-1">
              <p className="font-medium">✓ Plan activated successfully</p>
              <p className="text-xs text-muted-foreground">A GST invoice has been generated and will appear in your subscription dashboard.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate('/dashboard/subscription')} className="gap-2">
                <Zap className="w-4 h-4" /> View Subscription
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* Timeout — webhook may be delayed */}
        {stage === 'timeout' && (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Almost There…</h1>
              <p className="text-muted-foreground mt-2">
                Your payment was received but plan activation is taking longer than usual.
                This is normal — please check back in a minute.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-medium">Your payment is safe</p>
              <p className="text-xs">If your plan isn't updated within 5 minutes, please contact support.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => { refreshPlan(); navigate('/dashboard/subscription'); }} className="gap-2">
                Check Subscription <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
