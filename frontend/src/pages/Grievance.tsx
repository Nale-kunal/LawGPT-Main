import { useLocation } from 'react-router-dom';
import { Scale, Mail, Calendar, Clock, AlertTriangle, ShieldCheck, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const Grievance = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const containerClass = isDashboard
    ? "p-4 md:p-6 max-w-4xl mx-auto space-y-6"
    : "min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-16 px-4";

  return (
    <div className={containerClass}>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Scale className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Grievance Redressal Center</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Official redressal mechanism under the India Digital Personal Data Protection (DPDP) Act 2023 and the Information Technology Rules.
          </p>
        </div>

        {/* Introduction */}
        <Card className="shadow-sm border-destructive/10 bg-destructive/5">
          <CardContent className="pt-6 space-y-2">
            <div className="flex gap-2.5 items-start text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <strong className="text-destructive-foreground font-semibold">User & Advocate Advisory:</strong>
                <p className="text-muted-foreground mt-1 leading-relaxed text-xs">
                  Juriq is a legal practice management software-as-a-service (SaaS) tool designed to assist advocates and legal professionals. It does not provide legal advice, legal services, or lawyer matching. If you have grievances concerning your legal representation, please contact your advocate directly. For grievances regarding the Juriq software platform, account security, or data processing, please follow the formal channels below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Redressal Steps Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-bold">Step 1: File Request</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Submit your query or issue to our primary support channel at <a href="mailto:support@juriq.in" className="text-primary underline font-medium">support@juriq.in</a>. Most queries are resolved here within 48 hours.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center mb-2">
                <Mail className="h-4 w-4 text-warning" />
              </div>
              <CardTitle className="text-sm font-bold">Step 2: Escalation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If not resolved within 7 business days, escalate directly to the designated Grievance Officer at <a href="mailto:grievance@juriq.in" className="text-primary underline font-medium">grievance@juriq.in</a>.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center mb-2">
                <Landmark className="h-4 w-4 text-destructive" />
              </div>
              <CardTitle className="text-sm font-bold">Step 3: Board Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you remain unsatisfied after 30 days of filing with the Grievance Officer, you may appeal to the Digital Personal Data Protection Board of India.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Grievance Officer details */}
        <Card className="shadow-md border-border/80">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Designated Grievance & Data Protection Officer
            </CardTitle>
            <CardDescription className="text-xs">
              Direct escalation contact for privacy and service disputes under Indian IT rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Officer Name</h4>
                  <p className="text-sm font-bold mt-0.5">Kunal Nale</p>
                  <p className="text-xs text-muted-foreground">Co-founder & Chief Compliance Officer, Juriq</p>
                </div>
                <div>
                  <h4 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email Address</h4>
                  <p className="text-sm font-mono mt-0.5">grievance@juriq.in</p>
                  <p className="text-[10px] text-muted-foreground">For formal escalation & legal summons under IT Act Section 43A</p>
                </div>
                <div>
                  <h4 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Office Address</h4>
                  <p className="text-xs leading-relaxed mt-0.5 font-medium">
                    Juriq Compliance Office,<br />
                    101, Legal Tech Hub, Nariman Point,<br />
                    Mumbai, Maharashtra, 400021, India
                  </p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 space-y-3.5 border">
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                  Service Level Commitments
                </h4>
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span><strong>48 Hours:</strong> Formal acknowledgment of receipt with a tracking ticket number.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span><strong>7 Business Days:</strong> Initial assessment and gathering of audit logs.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span><strong>14 Business Days:</strong> Complete resolution and formal written response.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t flex flex-wrap gap-3 items-center justify-between">
              <p className="text-[10px] text-muted-foreground max-w-md">
                Grievance logs and correspondence are kept cryptographically secure and retained for a minimum period of 3 years under the Information Technology Rules.
              </p>
              <Button size="sm" asChild>
                <a href="mailto:grievance@juriq.in" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email Grievance Officer
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Grievance;
