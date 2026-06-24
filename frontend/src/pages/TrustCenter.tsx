import { Shield, Scale, Lock, Eye, Trash2, Mail, ExternalLink, HelpCircle, HardDrive, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';

export const TrustCenter = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const policies = [
    {
      title: 'Terms of Service',
      version: 'v1.0',
      summary: 'Governs platform usage, advocate responsibilities, and Juriq software-as-a-service limitations.',
      link: '/terms',
    },
    {
      title: 'Privacy Policy',
      version: 'v1.0',
      summary: 'Data collection, storage limits, and processing consent details under DPDP Act 2023.',
      link: '/privacy',
    },
    {
      title: 'Data Processing Agreement',
      version: 'v1.0',
      summary: 'Controller/processor roles, sub-processors, and localization details in India.',
      link: '/data-processing',
    },
    {
      title: 'Cookie Policy',
      version: 'v1.0',
      summary: 'Strictly necessary and functional cookie utilization. Zero advertising trackers.',
      link: '/cookie-policy',
    },
    {
      title: 'Refund Policy',
      version: 'v1.0',
      summary: '7-day subscription refund window guidelines for first payments.',
      link: '/refund-policy',
    },
  ];

  const securityControls = [
    {
      title: 'Session & Auth Hardening',
      description: '15-minute access tokens, 7-day refresh token rotation, and invalidation versioning.',
    },
    {
      title: 'CSRF & XSS Safeguards',
      description: 'Double-submit CSRF cookie checks, Strict CSP with nonces, and input sanitization.',
    },
    {
      title: 'Data Storage & Localization',
      description: 'All user data stored in secure MongoDB Atlas servers localized entirely in India.',
    },
    {
      title: 'Strict File Validation',
      description: 'Magic-byte verification, zip-bomb checks, and Cloudinary proxy white-list filtering.',
    },
    {
      title: 'Multi-Tenant Isolation',
      description: 'Strict logical partition checks on Mongoose queries to prevent IDOR cross-tenant leakage.',
    },
    {
      title: 'Immutable Audit Trail',
      description: 'Blockchain-style SHA-256 hash chains capturing all sensitive case and document actions.',
    },
  ];

  const legalActs = [
    {
      act: 'DPDP Act 2023',
      description: 'Aligns with data principal rights (access, correction, erasure) and data fiduciary requirements.',
    },
    {
      act: 'IT Act 2000 (Section 43A)',
      description: 'Implements reasonable security practices and formal grievance mechanisms for sensitive data.',
    },
    {
      act: 'Consumer Protection 2019',
      description: 'Provides transparent refund rules, clear pricing summaries, and designated support SLAs.',
    },
    {
      act: 'Indian Contract Act 1872',
      description: 'Enforceable electronic contracts verified via explicit clickwrap consent and audit trails.',
    },
  ];

  const containerClass = isDashboard
    ? "p-4 md:p-6 max-w-5xl mx-auto space-y-6"
    : "min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-16 px-4";

  return (
    <div className={containerClass}>
      <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Title / Hero */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Trust &amp; Compliance Center</h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Review Juriq's legal framework, security posture, and compliance with Indian regulatory standards.
          </p>
        </div>

        {/* Platform Positioning Alert */}
        <Card className="shadow-sm border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex gap-3 items-start">
              <Scale className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-amber-900 dark:text-amber-400 text-sm md:text-base">Official Platform Position</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Juriq is a legal practice management software-as-a-service (SaaS) platform built for enrolled advocates, law firms, legal departments, and authorized legal assistants. <strong>Juriq is not a law firm, does not provide legal representation, legal advice, or advocate services, and is not a client acquisition or lawyer-recommendation marketplace.</strong> Advocates using Juriq remain entirely responsible for all legal opinions, filings, client representation, and ethical duties.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Policies Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Legal Agreements &amp; Policies
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policies.map((p) => (
              <Card key={p.title} className="shadow-sm flex flex-col justify-between hover:border-primary/30 transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">{p.title}</CardTitle>
                    <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {p.version}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {p.summary}
                  </p>
                  <Button variant="outline" size="sm" className="w-full text-xs h-8" asChild>
                    <Link to={isDashboard ? `/dashboard${p.link}` : p.link} className="inline-flex items-center justify-center gap-1">
                      Read Policy <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Security Overview */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Technical &amp; Security Controls
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {securityControls.map((c) => (
              <Card key={c.title} className="shadow-sm border-muted">
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                    {c.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    {c.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* India Legal Alignment */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            India Legal &amp; Regulatory Alignment
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {legalActs.map((l) => (
              <Card key={l.act} className="shadow-sm">
                <CardHeader className="pb-2 bg-muted/10">
                  <CardTitle className="text-sm font-bold text-foreground">{l.act}</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {l.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Data Rights & Privacy Center */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Privacy Rights Card */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Data Principal Rights
              </CardTitle>
              <CardDescription className="text-xs">
                Learn how you can manage or delete your data under Juriq guidelines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                As a Data Principal, you have complete control over your practice data. In accordance with the DPDP Act 2023:
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Data Portability:</strong> Export all cases, clients, hearings, and files into a standard JSON backup file via Settings.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Trash2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Right to Erasure:</strong> Delete your account permanently. All DB records, cache entries, and Cloudinary files are hard-deleted.</span>
                </li>
              </ul>
              <Button size="sm" className="w-full text-xs font-semibold" asChild>
                <Link to={isDashboard ? "/dashboard/settings" : "/login"} className="inline-flex items-center justify-center gap-1.5">
                  Go to Settings Privacy Center <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Grievance redressal */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Grievance Escalation Path
              </CardTitle>
              <CardDescription className="text-xs">
                Dedicated channels for compliance disputes and data concerns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col justify-between h-[calc(100%-72px)]">
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you have privacy concerns or believe your data has been handled inconsistently with our policies, you can trigger our formal grievance process.
              </p>
              <div className="bg-muted/30 rounded-xl p-3 border space-y-1">
                <p className="text-xs font-semibold">Grievance Officer: Kunal Nale</p>
                <p className="text-xs font-mono text-muted-foreground">Email: grievance@juriq.in</p>
                <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                  Commitment: 48h acknowledgment, 14-day total resolution target.
                </p>
              </div>
              <Button size="sm" variant="outline" className="w-full text-xs font-semibold" asChild>
                <Link to={isDashboard ? "/dashboard/grievance" : "/grievance"} className="inline-flex items-center justify-center gap-1.5">
                  View Redressal Framework <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default TrustCenter;
