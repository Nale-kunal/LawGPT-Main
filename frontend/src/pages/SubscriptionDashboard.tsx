import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePlan } from '@/contexts/PlanContext';
import { apiFetch, getApiUrl } from '@/lib/api';
import {
  CreditCard, Calendar, RefreshCw, XCircle, Download, Clock,
  CheckCircle2, AlertTriangle, Zap, Receipt, TrendingUp, Shield,
  ChevronRight, AlertCircle, Loader2, FileText,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── Types ──────────────────────────────────────────────────────────────────────
interface SubData {
  plan: {
    current: string;
    raw: string;
    startDate: string | null;
    endDate: string | null;
    expired: boolean;
    isCouponActive: boolean;
    couponUsed: string | null;
  };
  subscription: {
    subscriptionId: string;
    planType: string;
    billingCycle: string;
    status: string;
    periodStart: string | null;
    periodEnd: string | null;
    refunded: boolean;
    cancelRequested: boolean;
    cancelRequestedAt: string | null;
    createdAt: string;
  } | null;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  planType: string;
  billingCycle: string;
  totalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  subtotalPaise: number;
  paymentDate: string;
  status: string;
  razorpayPaymentId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  free: 'Free', basic: 'Basic', pro: 'Pro', premium: 'Premium', elite: 'Elite ✦',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  active:    { label: 'Active',         variant: 'default',     icon: <CheckCircle2 className="w-3 h-3" /> },
  created:   { label: 'Pending',        variant: 'secondary',   icon: <Clock className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled',      variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
  failed:    { label: 'Failed',         variant: 'destructive', icon: <AlertTriangle className="w-3 h-3" /> },
  halted:    { label: 'Halted',         variant: 'destructive', icon: <AlertTriangle className="w-3 h-3" /> },
  completed: { label: 'Completed',      variant: 'secondary',   icon: <CheckCircle2 className="w-3 h-3" /> },
  expired:   { label: 'Expired',        variant: 'destructive', icon: <AlertCircle className="w-3 h-3" /> },
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

// ── Skeleton Card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card>
      <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-48" />
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function SubscriptionDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshPlan } = usePlan();
  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // ── Fetch subscription details ──────────────────────────────────────────────
  const { data: subData, isLoading: subLoading, error: subError, refetch: refetchSub } = useQuery<SubData>({
    queryKey: ['my-subscription'],
    queryFn: async () => {
      const res = await apiFetch(getApiUrl('/api/v1/payment/my-subscription'));
      if (!res.ok) throw new Error('Failed to load subscription');
      return res.json();
    },
    staleTime: 30_000,
    retry: 2,
  });

  // ── Fetch invoices ──────────────────────────────────────────────────────────
  const { data: invoiceData, isLoading: invoiceLoading } = useQuery<{ invoices: Invoice[]; total: number }>({
    queryKey: ['my-invoices'],
    queryFn: async () => {
      const res = await apiFetch(getApiUrl('/api/v1/payment/invoices?page=1'));
      if (!res.ok) throw new Error('Failed to load invoices');
      return res.json().then(d => ({ invoices: d.invoices ?? [], total: d.total ?? 0 }));
    },
    staleTime: 60_000,
  });

  // ── Cancel subscription mutation ────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(getApiUrl('/api/v1/payment/cancel-subscription'), { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Cancellation failed');
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Cancellation Scheduled',
        description: data.message || 'Your subscription will end at the billing period.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      refreshPlan();
    },
    onError: (err: Error) => {
      toast({ title: 'Cancellation Failed', description: err.message, variant: 'destructive' });
    },
  });

  // ── Poll for pending subscription ───────────────────────────────────────────
  const sub = subData?.subscription;
  const plan = subData?.plan;

  useEffect(() => {
    if (sub?.status === 'created') {
      const t = setInterval(() => refetchSub(), 5000);
      return () => clearInterval(t);
    }
  }, [sub?.status, refetchSub]);

  // ── Invoice download ────────────────────────────────────────────────────────
  const handleDownloadInvoice = useCallback(async (invoiceId: string, invoiceNumber: string) => {
    try {
      const res = await apiFetch(getApiUrl(`/api/v1/payment/invoice/${invoiceId}`));
      if (!res.ok) throw new Error('Invoice not found');
      const data = await res.json();
      // Build a simple downloadable JSON receipt (PDF generation can be added later)
      const blob = new Blob([JSON.stringify(data.invoice, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Download Failed', description: 'Could not download invoice.', variant: 'destructive' });
    }
  }, [toast]);

  if (subLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  if (subError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <p className="text-lg font-semibold">Failed to load subscription data</p>
        <Button onClick={() => refetchSub()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const statusCfg = sub ? (STATUS_CONFIG[sub.status] ?? STATUS_CONFIG['active']) : null;
  const days = daysUntil(plan?.endDate ?? null);
  const isExpired = plan?.expired;
  const isFree = !plan?.current || plan.current === 'free';
  const hasCancelRequest = sub?.cancelRequested;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your plan, billing &amp; invoices</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/pricing')}
          className="gap-2 self-start sm:self-auto">
          <Zap className="w-4 h-4" /> Upgrade Plan
        </Button>
      </div>

      {/* ── Active Plan Card ────────────────────────────────────────────── */}
      <Card className={`border-2 ${isExpired ? 'border-destructive/50' : sub?.status === 'active' ? 'border-primary/50' : 'border-border'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-4 h-4 text-primary" /> Current Plan
            </CardTitle>
            {statusCfg && (
              <Badge variant={statusCfg.variant} className="gap-1 text-xs">
                {statusCfg.icon} {statusCfg.label}
              </Badge>
            )}
            {isFree && !sub && (
              <Badge variant="outline" className="text-xs">Free Tier</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <span className="text-4xl font-extrabold">{PLAN_LABELS[plan?.current ?? 'free']}</span>
            {sub && (
              <span className="text-sm text-muted-foreground mb-1 capitalize">
                {sub.billingCycle} billing
              </span>
            )}
            {plan?.isCouponActive && (
              <Badge className="mb-1 text-xs bg-green-500/15 text-green-600 dark:text-green-400 border-0">
                🎟 Coupon Active
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Start Date</p>
              <p className="font-medium">{formatDate(plan?.startDate ?? null)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">
                {isExpired ? 'Expired On' : 'Renewal Date'}
              </p>
              <p className={`font-medium ${isExpired ? 'text-destructive' : ''}`}>
                {formatDate(plan?.endDate ?? null)}
              </p>
            </div>
            {days !== null && !isExpired && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Days Remaining</p>
                <p className={`font-medium ${days <= 7 ? 'text-amber-500' : ''}`}>{days}d</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Auto-Renew</p>
              <p className="font-medium">
                {hasCancelRequest ? <span className="text-amber-500">Cancels at period end</span>
                  : sub?.status === 'active' ? <span className="text-green-500">Active</span>
                  : '—'}
              </p>
            </div>
          </div>

          {/* Expiry warning */}
          {days !== null && days <= 7 && !isExpired && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Your plan expires in {days} day{days !== 1 ? 's' : ''}. Renew to avoid interruption.
            </div>
          )}
          {isExpired && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Your plan has expired. Upgrade to restore access.
              <Button size="sm" className="ml-auto h-7 text-xs" onClick={() => navigate('/dashboard/pricing')}>
                Renew Now <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}

          {/* Actions */}
          {sub?.status === 'active' && !hasCancelRequest && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/pricing')}
                className="gap-1 text-xs h-8">
                <TrendingUp className="w-3 h-3" /> Change Plan
              </Button>
              <Button variant="outline" size="sm"
                className="gap-1 text-xs h-8 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
                onClick={() => setShowCancelDialog(true)}>
                <XCircle className="w-3 h-3" /> Cancel Subscription
              </Button>
            </div>
          )}
          {hasCancelRequest && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Cancellation requested on {formatDate(sub?.cancelRequestedAt ?? null)}.
              Access continues until {formatDate(sub?.periodEnd ?? null)}.
            </p>
          )}
          {sub?.status === 'created' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Payment processing… your plan activates automatically.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      {sub && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Plan', value: PLAN_LABELS[sub.planType] ?? sub.planType, icon: <Zap className="w-4 h-4 text-primary" /> },
            { label: 'Cycle', value: sub.billingCycle === 'yearly' ? 'Annual' : 'Monthly', icon: <Calendar className="w-4 h-4 text-primary" /> },
            { label: 'Period Start', value: formatDate(sub.periodStart), icon: <Clock className="w-4 h-4 text-primary" /> },
            { label: 'Period End', value: formatDate(sub.periodEnd), icon: <Calendar className="w-4 h-4 text-primary" /> },
          ].map(s => (
            <Card key={s.label} className="p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                {s.icon} {s.label}
              </div>
              <p className="font-semibold text-sm">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* ── Invoice / Payment History ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" /> Invoice History
            </CardTitle>
            {(invoiceData?.total ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground">{invoiceData?.total} invoice{invoiceData!.total !== 1 ? 's' : ''}</span>
            )}
          </div>
          <CardDescription className="text-xs">All GST-compliant invoices for your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          {invoiceLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !invoiceData?.invoices?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No invoices yet. Your first invoice appears after payment.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Table header */}
              <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground py-2 px-1">
                <span className="col-span-4">Invoice #</span>
                <span className="col-span-3">Date</span>
                <span className="col-span-3 text-right">Amount</span>
                <span className="col-span-2 text-right">Action</span>
              </div>
              {invoiceData.invoices.map((inv) => (
                <div key={inv._id} className="grid grid-cols-12 items-center py-3 px-1 text-sm hover:bg-muted/30 rounded transition-colors">
                  <div className="col-span-4">
                    <p className="font-mono text-xs font-medium">{inv.invoiceNumber}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {PLAN_LABELS[inv.planType] ?? inv.planType} · {inv.billingCycle}
                    </p>
                  </div>
                  <div className="col-span-3 text-xs text-muted-foreground">
                    {formatDate(inv.paymentDate)}
                  </div>
                  <div className="col-span-3 text-right">
                    <p className="font-semibold text-sm">{formatAmount(inv.totalPaise)}</p>
                    {(inv.igstPaise > 0 || inv.cgstPaise > 0) && (
                      <p className="text-[10px] text-muted-foreground">
                        incl. GST {formatAmount(inv.igstPaise || (inv.cgstPaise + inv.sgstPaise))}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button variant="ghost" size="sm" className="h-7 px-2"
                      onClick={() => handleDownloadInvoice(inv._id, inv.invoiceNumber)}
                      title="Download invoice">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Free tier CTA ────────────────────────────────────────────────── */}
      {isFree && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-5">
            <div className="flex-1">
              <p className="font-semibold text-base">Unlock the full power of Juriq</p>
              <p className="text-sm text-muted-foreground mt-1">
                Get unlimited cases, documents, legal research, and more.
              </p>
            </div>
            <Button onClick={() => navigate('/dashboard/pricing')} className="gap-2 shrink-0">
              <Zap className="w-4 h-4" /> View Plans
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Cancel Confirmation Dialog ─────────────────────────────────── */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Your subscription will be cancelled at the end of the current billing period.</p>
                <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                  <p><span className="font-medium">Plan:</span> {PLAN_LABELS[sub?.planType ?? 'free']}</p>
                  <p><span className="font-medium">Access until:</span> {formatDate(sub?.periodEnd ?? null)}</p>
                </div>
                <p className="text-xs text-muted-foreground">You can continue using your plan until then. No refund is issued for the remaining period.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => { setShowCancelDialog(false); cancelMutation.mutate(); }}
              disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Cancelling…</> : 'Yes, Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
