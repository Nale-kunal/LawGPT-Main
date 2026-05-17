import React, { useState } from 'react';
import { usePlan, type Plan } from '@/contexts/PlanContext';
import { getApiUrl, apiFetch } from '@/lib/api';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Check, Zap, Crown, Tag, Star, AlertCircle, CheckCircle2, Loader2,
  LayoutDashboard, Receipt, BookOpen, LayoutGrid, MessageSquare,
} from 'lucide-react';

// ─── Plan definitions ─────────────────────────────────────────────────────────

interface PlanDef {
  id:       Plan;
  name:     string;
  price:    { monthly: number; yearly: number };
  badge?:   string;
  accent:   string;   // Tailwind text color approximated via CSS var
  features: string[];
  icon:     React.ReactNode;
}

const PLANS: PlanDef[] = [
  {
    id:    'free',
    name:  'Free',
    price: { monthly: 0, yearly: 0 },
    accent: 'text-muted-foreground',
    icon: <LayoutDashboard className="w-4 h-4" />,
    features: ['Dashboard', 'Calendar', 'Cases (max 5)', 'Clients', 'Settings'],
  },
  {
    id:    'basic',
    name:  'Basic',
    price: { monthly: 199, yearly: 1999 },
    accent: 'text-blue-600 dark:text-blue-400',
    icon: <Receipt className="w-4 h-4" />,
    features: ['Everything in Free', 'Billing & Invoicing', 'Unlimited Cases'],
  },
  {
    id:      'pro',
    name:    'Pro',
    price:   { monthly: 499, yearly: 4999 },
    badge:   'Most Popular',
    accent: 'text-primary',
    icon: <BookOpen className="w-4 h-4" />,
    features: [
      'Everything in Basic',
      'Document Manager',
      'Legal Research',
      'Hearing Management',
    ],
  },
  {
    id:    'premium',
    name:  'Premium',
    price: { monthly: 999, yearly: 9999 },
    accent: 'text-yellow-600 dark:text-yellow-400',
    icon: <LayoutGrid className="w-4 h-4" />,
    features: [
      'Everything in Pro',
      'Legal Templates',
      'Case Notes',
    ],
  },
  {
    id:    'elite',
    name:  'Elite ✦',
    price: { monthly: 1999, yearly: 19999 },
    accent: 'text-orange-600 dark:text-orange-400',
    icon: <Crown className="w-4 h-4" />,
    features: [
      'Everything in Premium',
      'Legal News',
      'Priority Support',
      'All Future Features',
    ],
  },
];

const PLAN_HIERARCHY: Plan[] = ['free', 'basic', 'pro', 'premium', 'elite'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Pricing() {
  const { plan: currentPlan, applyCoupon, createOrder, refreshPlan } = usePlan();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [couponCode, setCouponCode]     = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [couponMessage, setCouponMessage] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<Record<Plan, 'idle' | 'loading'>>({
    free: 'idle', basic: 'idle', pro: 'idle', premium: 'idle', elite: 'idle',
  });

  const currentIdx = PLAN_HIERARCHY.indexOf(currentPlan);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponStatus('loading');
    const result = await applyCoupon(couponCode.trim());
    if (result.success) {
      setCouponStatus('success');
      setCouponMessage(result.message || 'Plan activated!');
    } else {
      setCouponStatus('error');
      setCouponMessage(result.error || 'Failed to apply coupon');
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (plan === 'free' || plan === currentPlan) return;
    setPaymentStatus(prev => ({ ...prev, [plan]: 'loading' }));
    try {
      const result = await createOrder(plan, billingCycle);
      if (!result.success || !result.data) {
        alert(result.error || 'Failed to create payment order. Please configure Razorpay keys.');
        setPaymentStatus(prev => ({ ...prev, [plan]: 'idle' }));
        return;
      }

      const orderData = result.data as {
        orderId: string; amount: number; currency: string; keyId: string; plan: Plan; billingCycle: string;
      };

      // Dynamically load Razorpay SDK
      if (!document.querySelector('script[src*="checkout.razorpay"]')) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.head.appendChild(script);
        await new Promise<void>((res, rej) => {
          script.onload  = () => res();
          script.onerror = () => rej(new Error('Razorpay SDK failed to load'));
        });
      }

      const options = {
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    orderData.currency,
        order_id:    orderData.orderId,
        name:        'JuriQ',
        description: `${orderData.plan} Plan — ${orderData.billingCycle}`,
        theme:       { color: 'hsl(220 70% 15%)' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await apiFetch(getApiUrl('/api/v1/payment/verify'), {
              method:      'POST',
              credentials: 'include',
              headers:     { 'Content-Type': 'application/json' },
              body:        JSON.stringify(response),
            });
          } catch { /* non-critical */ }

          // Poll for plan update (webhook sets the real plan)
          const end = Date.now() + 30_000;
          const poll = setInterval(async () => { await refreshPlan(); if (Date.now() > end) clearInterval(poll); }, 3000);
          setPaymentStatus(prev => ({ ...prev, [plan]: 'idle' }));
        },
        modal: { ondismiss: () => setPaymentStatus(prev => ({ ...prev, [plan]: 'idle' })) },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).Razorpay(options).open();
    } catch (err) {
      console.error(err);
      alert('Payment initialization failed.');
      setPaymentStatus(prev => ({ ...prev, [plan]: 'idle' }));
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Subscription Plans
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Secure checkout via Razorpay · Cancel anytime
          </p>
        </div>

        {/* Billing cycle toggle — mirrors other toggle patterns in the app */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border self-start sm:self-auto">
          {(['monthly', 'yearly'] as const).map(cycle => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
                ${billingCycle === cycle
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
              {cycle === 'yearly' && (
                <Badge className="ml-1.5 text-[10px] h-4 px-1 bg-green-500/15 text-green-600 dark:text-green-400 border-0">
                  Save 17%
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Plan cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {PLANS.map(planDef => {
          const planIdx   = PLAN_HIERARCHY.indexOf(planDef.id);
          const isCurrent = planDef.id === currentPlan;
          const isLower   = planIdx < currentIdx;
          const isLoading = paymentStatus[planDef.id] === 'loading';
          const price     = billingCycle === 'monthly' ? planDef.price.monthly : planDef.price.yearly;
          const isPro     = planDef.id === 'pro';

          return (
            <Card
              key={planDef.id}
              id={`plan-card-${planDef.id}`}
              className={`
                relative card-gradient shadow-elevated flex flex-col
                transition-all duration-200 hover:-translate-y-0.5 hover:shadow-professional
                ${isCurrent ? 'border-primary ring-1 ring-primary' : 'border-border'}
                ${isPro     ? 'border-primary/50' : ''}
              `}
            >
              {/* Most Popular badge */}
              {planDef.badge && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <Badge className="text-[10px] px-2 h-5 bg-primary text-primary-foreground border-0 shadow-sm gap-1">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    {planDef.badge}
                  </Badge>
                </div>
              )}

              {/* Active badge */}
              {isCurrent && (
                <Badge
                  variant="secondary"
                  className="absolute top-3 right-3 text-[10px] h-5 px-1.5 text-primary border-primary/30"
                >
                  ✓ Active
                </Badge>
              )}

              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-muted border border-border ${planDef.accent}`}>
                    {planDef.icon}
                  </div>
                  <CardTitle className="text-sm font-bold">{planDef.name}</CardTitle>
                </div>

                {price === 0 ? (
                  <div className="text-2xl font-extrabold text-foreground">Free</div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-muted-foreground">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="px-4 pb-4 flex flex-col flex-1 gap-4">
                {/* Feature list */}
                <ul className="space-y-1.5 flex-1">
                  {planDef.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${planDef.accent}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <Button
                  id={`upgrade-${planDef.id}-btn`}
                  size="sm"
                  onClick={() => handleUpgrade(planDef.id)}
                  disabled={isCurrent || isLower || planDef.id === 'free' || isLoading}
                  variant={isCurrent ? 'outline' : isPro ? 'default' : 'outline'}
                  className={`
                    w-full h-8 text-xs font-semibold gap-1.5 mt-auto
                    ${!isCurrent && !isLower && planDef.id !== 'free'
                      ? isPro
                        ? ''
                        : 'border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground'
                      : ''}
                  `}
                >
                  {isLoading ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Processing…</>
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : isLower || planDef.id === 'free' ? (
                    'Not Available'
                  ) : (
                    <><Zap className="w-3 h-3" /> Upgrade</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Coupon section ───────────────────────────────────────────── */}
      <Card className="card-gradient shadow-elevated border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Tag className="w-4 h-4 text-primary" />
            Coupon Code
          </CardTitle>
          <CardDescription className="text-xs">
            Use{' '}
            <code className="font-mono font-bold text-foreground bg-muted px-1 py-0.5 rounded text-xs">
              WELCOMETOJURIQ
            </code>
            {' '}for <span className="font-semibold text-foreground">3 months Elite access free</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {couponStatus === 'success' ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {couponMessage}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 max-w-sm">
                <Input
                  id="pricing-coupon-input"
                  type="text"
                  placeholder="e.g. WELCOMETOJURIQ"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                  className="font-mono tracking-widest text-sm h-9 uppercase"
                />
                <Button
                  id="pricing-apply-coupon-btn"
                  size="sm"
                  onClick={handleApplyCoupon}
                  disabled={couponStatus === 'loading' || !couponCode.trim()}
                  className="h-9 px-5 shrink-0"
                >
                  {couponStatus === 'loading'
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Applying</>
                    : 'Apply'}
                </Button>
              </div>

              {couponStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {couponMessage}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Info note ───────────────────────────────────────────────── */}
      <p className="text-xs text-center text-muted-foreground pb-2">
        All plans include a 7-day refund policy · Plans are billed in INR · Taxes may apply
      </p>
    </div>
  );
}
