import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Scale, Lock, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getApiUrl, apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import JuriqLoader from '@/components/ui/JuriqLoader';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import TermsContent from '@/components/legal/TermsContent';
import PrivacyContent from '@/components/legal/PrivacyContent';

interface RequiredPolicy {
  policyType: string;
  title: string;
  version: string;
  fullTextUrl?: string;
  policyHash?: string;
}

/**
 * ConsentGate — mandatory post-login consent screen for users who have not yet accepted
 * the current Terms of Service (v1.0) and Privacy Policy (v1.0).
 *
 * This screen is shown ONLY to existing users who registered before the current policy versions
 * were introduced. New signups have already accepted policies at registration.
 *
 * The user MUST accept all required policies before proceeding to the dashboard.
 * They cannot close or bypass this screen.
 */
const ConsentGate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();

  const [missing, setMissing] = useState<RequiredPolicy[]>([]);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track which policy is currently opened in the modal dialog
  const [activePolicyToRead, setActivePolicyToRead] = useState<RequiredPolicy | null>(null);

  // Load which required policies are missing from the backend
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(getApiUrl('/api/v1/auth/consent-status'), {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load consent status');

        if (data.compliant) {
          // Already compliant — redirect to dashboard
          navigate('/dashboard', { replace: true });
          return;
        }

        setMissing(data.missing || []);
        const initial: Record<string, boolean> = {};
        (data.missing || []).forEach((p: RequiredPolicy) => { initial[p.policyType] = false; });
        setAccepted(initial);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load consent requirements');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [navigate]);

  const allAccepted = missing.length > 0 && missing.every((p) => accepted[p.policyType]);

  const handleSubmit = async () => {
    if (!allAccepted) return;
    setIsSubmitting(true);
    try {
      const consents = missing.map((p) => ({ policyType: p.policyType, version: p.version }));
      const res = await apiFetch(getApiUrl('/api/v1/legal/record-consent'), {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ consents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record consent');

      toast({ title: 'Consent Recorded', description: 'Welcome to Juriq! Your preferences have been saved.' });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      toast({
        title:       'Consent Failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant:     'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <JuriqLoader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button className="w-full mt-4" variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Policy Update Required</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Juriq has published updated legal policies. Please review and accept them to continue.
          </p>
        </div>

        {/* Platform Disclaimer */}
        <Alert className="border-amber-500/50 bg-amber-500/5">
          <Scale className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            <strong>Important:</strong> Juriq is a <strong>legal practice management software platform</strong> — not a law firm, legal advisor, or legal representative. Advocates remain solely responsible for all legal advice, filings, strategy, and client representation.
          </AlertDescription>
        </Alert>

        {/* Policies to Accept */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Required Agreements
            </CardTitle>
            <CardDescription className="text-xs">
              You must accept all of the following before accessing your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {missing.map((policy) => (
              <div
                key={policy.policyType}
                className={`border rounded-lg p-4 transition-all ${
                  accepted[policy.policyType]
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-muted/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`consent-${policy.policyType}`}
                    checked={accepted[policy.policyType] || false}
                    onCheckedChange={(checked) =>
                      setAccepted((prev) => ({ ...prev, [policy.policyType]: !!checked }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label
                        htmlFor={`consent-${policy.policyType}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        I have read and agree to the {policy.title}
                      </label>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        v{policy.version}
                      </Badge>
                      {accepted[policy.policyType] && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    {policy.fullTextUrl && (
                      <button
                        type="button"
                        onClick={() => setActivePolicyToRead(policy)}
                        className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer font-medium"
                      >
                        Read {policy.title} <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    )}
                    {policy.policyHash && (
                      <p className="text-[9px] font-mono text-muted-foreground/60 mt-1">
                        SHA-256: {policy.policyHash.slice(0, 16)}…
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="space-y-3">
          <Button
            className="w-full h-11 text-sm font-semibold"
            onClick={handleSubmit}
            disabled={!allAccepted || isSubmitting}
          >
            {isSubmitting ? (
              <JuriqLoader size="sm" className="mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'Recording Consent...' : 'Accept and Continue to Juriq'}
          </Button>
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-center text-muted-foreground">
              Your consent is recorded with a timestamp and cryptographic policy hash for audit purposes.
              You may review your consent history in Settings → Privacy & Legal.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2 border-t mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel and Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Policy Reader Modal */}
      <Dialog open={!!activePolicyToRead} onOpenChange={(open) => !open && setActivePolicyToRead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              {activePolicyToRead?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Version {activePolicyToRead?.version}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 my-4 pr-3 overflow-y-auto max-h-[50vh]">
            {activePolicyToRead?.policyType === 'terms' && <TermsContent />}
            {activePolicyToRead?.policyType === 'privacy' && <PrivacyContent />}
          </ScrollArea>
          <DialogFooter className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-muted-foreground text-left max-w-full sm:max-w-[70%]">
              By clicking "I Agree", you confirm that you have read and agree to the {activePolicyToRead?.title}.
            </p>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" onClick={() => setActivePolicyToRead(null)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (activePolicyToRead) {
                    setAccepted((prev) => ({ ...prev, [activePolicyToRead.policyType]: true }));
                    setActivePolicyToRead(null);
                  }
                }}
              >
                I Agree
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsentGate;
