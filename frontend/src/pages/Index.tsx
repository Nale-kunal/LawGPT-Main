import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Scale } from 'lucide-react';
import '../landing.css';

// ─── SVG Icons (inline, zero-dep) ────────────────────────────────────────────
const Ic = {
  Scale: () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 9l9-6 9 6M5 21h14" /><path d="M3 9h5l4 8M21 9h-5l-4 8" />
    </svg>
  ),
  Shield: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Calendar: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Briefcase: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Users: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Book: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Lock: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  FileText: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Layers: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Zap: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Star: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Arrow: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Note: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Billing: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  Robot: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="15" x2="8" y2="17" /><line x1="16" y1="15" x2="16" y2="17" />
    </svg>
  ),
  Export: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
};

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────
const DashMockup = () => (
  <div className="lp-mock lp-anim-float">
    <div className="lp-mock-bar">
      <span className="lp-mock-dot lp-mock-dot-r" />
      <span className="lp-mock-dot lp-mock-dot-y" />
      <span className="lp-mock-dot lp-mock-dot-g" />
      <div className="lp-mock-url">app.legalpro.in / dashboard</div>
    </div>
    <div className="lp-mock-body">
      <div className="lp-mock-sidebar">
        {[
          { icon: <Ic.FileText />, label: 'Dashboard', act: true },
          { icon: <Ic.Briefcase />, label: 'Cases', act: false },
          { icon: <Ic.Users />, label: 'Clients', act: false },
          { icon: <Ic.Calendar />, label: 'Calendar', act: false },
          { icon: <Ic.Book />, label: 'Research', act: false },
          { icon: <Ic.Note />, label: 'Notes', act: false },
          { icon: <Ic.Billing />, label: 'Billing', act: false },
        ].map(item => (
          <div key={item.label} className={`lp-mock-sb-item ${item.act ? 'act' : ''}`}>
            {item.icon}<span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="lp-mock-main">
        <div className="lp-mock-title">
          <span>Case Dashboard</span>
          <span className="lp-mock-btn">+ New Case</span>
        </div>
        <div className="lp-mock-kpis">
          {[
            { lbl: 'Active Cases', val: '24', sub: '+3 this month' },
            { lbl: 'Hearings Soon', val: '7', sub: '2 tomorrow' },
            { lbl: 'Clients', val: '38', sub: '+5 this month' },
          ].map(k => (
            <div key={k.lbl} className="lp-mock-kpi">
              <div className="lp-mock-kpi-lbl">{k.lbl}</div>
              <div className="lp-mock-kpi-val">{k.val}</div>
              <div className="lp-mock-kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>
        <div className="lp-mock-rows">
          {[
            { name: 'Sharma vs. State of Maharashtra', type: 'Criminal', status: 'Active', color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
            { name: 'Kapoor Divorce Proceedings', type: 'Family', status: 'Hearing', color: '#facc15', bg: 'rgba(234,179,8,0.12)' },
            { name: 'Tata Industries vs. Gupta Ltd.', type: 'Civil', status: 'Review', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
          ].map(c => (
            <div key={c.name} className="lp-mock-row">
              <span className="lp-mock-row-dot" style={{ background: c.color }} />
              <span className="lp-mock-row-name">{c.name}</span>
              <span className="lp-mock-row-type">{c.type}</span>
              <span className="lp-mock-badge" style={{ background: c.bg, color: c.color }}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const revealEls = useRef<(HTMLElement | null)[]>([]);
  const navRef = useRef<HTMLElement | null>(null);

  // Redirect if authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  // Scroll-reveal
  useEffect(() => {
    if (isLoading) return;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );
    revealEls.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [isLoading]);

  // Sticky nav
  useEffect(() => {
    if (isLoading) return;
    const nav = navRef.current;
    if (!nav) return;
    const fn = () => nav.classList.toggle('scrolled', window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    fn(); // Initial check
    return () => window.removeEventListener('scroll', fn);
  }, [isLoading]);

  const r = (i: number) => (el: HTMLElement | null) => { revealEls.current[i] = el; };
  const go = (p: string) => navigate(p);
  const scrollId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0F19' }}>
      <div style={{ width: 28, height: 28, border: '2px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', animation: 'lp-spin 0.7s linear infinite' }} />
    </div>
  );

  return (
    <div className="lp-root">

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════════ */}
      <nav className="lp-nav lp-anim-fade" ref={el => { navRef.current = el; }}>
        <a className="lp-nav-logo" href="/" aria-label="LegalPro">
          <div className="lp-nav-logo-icon">
            <Scale className="lp-logo-icon" />
          </div>
          <div>
            <span className="lp-nav-logo-text">LegalPro</span>
            <span className="lp-nav-logo-sub">Indian Law Management</span>
          </div>
        </a>
        <ul className="lp-nav-links">
          {[
            { l: 'Features', id: 'features' },
            { l: 'How it Works', id: 'workflow' },
            { l: 'Security', id: 'security' },
            { l: 'Reviews', id: 'reviews' },
          ].map(x => (
            <li key={x.l}>
              <button className="lp-nav-link-btn" onClick={() => scrollId(x.id)}>{x.l}</button>
            </li>
          ))}
        </ul>
        <div className="lp-nav-right">
          <ThemeToggle />
          <button id="nav-login" className="lp-btn lp-btn-ghost" onClick={() => go('/login')}>Login</button>
          <button id="nav-signup" className="lp-btn lp-btn-gold" onClick={() => go('/signup')}>
            <span>Get Started</span><Ic.Arrow />
          </button>
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════════════════════ */}
      <section className="lp-hero" aria-labelledby="hero-title">
        <div className="lp-orbs" aria-hidden="true">
          <div className="lp-orb lp-orb-1" /><div className="lp-orb lp-orb-2" /><div className="lp-orb lp-orb-3" />
        </div>
        <div className="lp-hero-inner">
          {/* Left: copy */}
          <div>
            <div className="lp-hero-badge lp-anim-up">
              <span className="lp-badge-dot" aria-hidden="true" />
              Built for Indian Legal Professionals
            </div>
            <h1 id="hero-title" className="lp-hero-title">
              <span className="lp-hero-title-line lp-anim-up-d1"><span className="lp-gold-text">LegalPro</span></span>
              <span className="lp-hero-title-line lp-anim-up-d2">— The Smarter Way</span>
              <span className="lp-hero-title-line lp-anim-up-d2">to Run Your Law Firm</span>
            </h1>
            <p className="lp-hero-sub lp-anim-up-d3">
              AI-powered case management built for modern Indian law firms. Manage cases, track hearings, collaborate with clients — all in one workspace.
            </p>
            <p className="lp-hero-support lp-anim-up-d4">
              From criminal to civil, family to corporate — LegalPro handles the complexity so you can focus on winning.
            </p>
            <div className="lp-hero-actions lp-anim-up-d5">
              <button id="hero-signup" className="lp-btn lp-btn-gold-lg" onClick={() => go('/signup')}>
                Create Free Account <Ic.Arrow />
              </button>
              <button id="hero-login" className="lp-btn lp-btn-outline-lg" onClick={() => go('/login')}>
                Login to Dashboard
              </button>
            </div>
            <div className="lp-hero-proof lp-anim-up-d6">
              <div className="lp-hero-proof-item">
                <span className="lp-hero-proof-dot" aria-hidden="true" />
                No credit card required
              </div>
              <div className="lp-hero-proof-item">
                <span className="lp-hero-proof-dot" aria-hidden="true" />
                DPDP compliant
              </div>
              <div className="lp-hero-proof-item">
                <span className="lp-hero-proof-dot" aria-hidden="true" />
                Used by Indian law firms
              </div>
            </div>
          </div>
          {/* Right: Dashboard mockup */}
          <div className="lp-anim-up-d4">
            <DashMockup />
          </div>
        </div>
      </section>

      {/* ══ STATS BAR ═══════════════════════════════════════════════════════════ */}
      <div className="lp-stats-bar">
        <div className="lp-stats-bar-inner">
          {[
            { num: '500+', lbl: 'Cases Managed' },
            { num: '98%', lbl: 'Hearing Accuracy' },
            { num: '60%', lbl: 'Time Saved / Week' },
            { num: '4.9★', lbl: 'Average Rating' },
          ].map((s, i) => (
            <div key={s.lbl} className={`lp-stat-item lp-reveal lp-r-d${Math.min(i + 1, 4)}`} ref={r(i)}>
              <div className="lp-stat-num">{s.num}</div>
              <div className="lp-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ TRUST BAR ═══════════════════════════════════════════════════════════ */}
      <div className="lp-trust">
        <div className="lp-trust-inner lp-reveal" ref={r(10)}>
          <span className="lp-trust-label">Trusted by Indian law professionals</span>
          <div className="lp-trust-items">
            {[
              { Icon: Ic.Shield, l: 'Bank-Grade Encryption' },
              { Icon: Ic.Calendar, l: 'Court Calendar Sync' },
              { Icon: Ic.Briefcase, l: 'Full Case Lifecycle' },
              { Icon: Ic.Lock, l: 'Role-Based Access' },
            ].map(({ Icon, l }) => (
              <div key={l} className="lp-trust-item">
                <div className="lp-trust-icon"><Icon /></div>
                <span className="lp-trust-txt">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ FEATURES ════════════════════════════════════════════════════════════ */}
      <section className="lp-sec" id="features" aria-labelledby="feat-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(11)}>
            <p className="lp-sec-label">Core Platform</p>
            <h2 id="feat-heading" className="lp-sec-title">
              Every tool a law firm needs,<br />designed to work together
            </h2>
            <p className="lp-sec-sub">
              Purpose-built modules that mirror how legal professionals actually work — not generic project management tools forced into legal shape.
            </p>
          </div>

          <div className="lp-feat-grid lp-reveal" ref={r(12)}>
            {[
              {
                Icon: Ic.Briefcase,
                title: 'Case Management',
                desc: 'Create, track and manage every case with structured workflows. Attach documents, add notes, log hearings, and track case status from filing to verdict.',
                tag: 'Core Module',
              },
              {
                Icon: Ic.Users,
                title: 'Client Portal',
                desc: 'Maintain a complete client registry with contact details, linked cases, billing history and communication logs. Know every client at a glance.',
                tag: 'Relationships',
              },
              {
                Icon: Ic.Calendar,
                title: 'Court Calendar',
                desc: 'Visual calendar with court date tracking, hearing reminders, and conflict detection. Never miss a hearing or filing deadline again.',
                tag: 'Scheduling',
              },
              {
                Icon: Ic.Book,
                title: 'Legal Research',
                desc: 'Access Indian legal knowledge base, case precedents, and statute references directly inside LegalPro. Supports your argument building instantly.',
                tag: 'AI-Assisted',
              },
              {
                Icon: Ic.Note,
                title: 'Legal Notes',
                desc: 'Rich-text legal notepad with case linking, PDF/Word export, and structured formatting for briefs, affidavits, and internal memos.',
                tag: 'Documents',
              },
              {
                Icon: Ic.Billing,
                title: 'Billing & Invoicing',
                desc: 'Generate professional invoices, track payments, manage retainers and log billable hours — all tied directly to your client and case records.',
                tag: 'Finance',
              },
              {
                Icon: Ic.Export,
                title: 'Document Export',
                desc: 'Export legal documents as polished PDFs or Word files with professional formatting. Ready for court, client, or co-counsel.',
                tag: 'Exports',
              },
              {
                Icon: Ic.Robot,
                title: 'AI Legal Assistant',
                desc: 'AI-powered research, case summarization, and legal writing assistance built directly into your workspace — no context switching needed.',
                tag: 'AI Layer',
              },
            ].map(({ Icon, title, desc, tag }) => (
              <div key={title} className="lp-feat-card">
                <div className="lp-feat-icon"><Icon /></div>
                <h3 className="lp-feat-title">{title}</h3>
                <p className="lp-feat-desc">{desc}</p>
                <div className="lp-feat-tag">● {tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════════════════════ */}
      <section className="lp-sec lp-sec-alt" id="workflow">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(20)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">How It Works</p>
            <h2 className="lp-sec-title" style={{ textAlign: 'center' }}>
              Productive from day one
            </h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>
              No lengthy onboarding. No training needed. LegalPro is intuitive by design.
            </p>
          </div>
          <div className="lp-workflow lp-reveal" ref={r(21)}>
            {[
              { n: '1', t: 'Create Account', d: 'Sign up in under 60 seconds. No credit card, no setup fees.' },
              { n: '2', t: 'Add Your Cases', d: 'Import or create cases. Attach clients, documents, and key dates instantly.' },
              { n: '3', t: 'Manage & Track', d: 'Use the calendar, notes, and AI tools to manage every case lifecycle.' },
              { n: '4', t: 'Export & Win', d: 'Generate professional legal documents and present with confidence.' },
            ].map(s => (
              <div key={s.t} className="lp-wf-step">
                <div className="lp-wf-num">{s.n}</div>
                <div className="lp-wf-title">{s.t}</div>
                <div className="lp-wf-desc">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY LEGALPRO ════════════════════════════════════════════════════════ */}
      <section className="lp-sec">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(22)}>
            <p className="lp-sec-label">Why LegalPro</p>
            <h2 className="lp-sec-title">
              Designed the way lawyers<br />actually think
            </h2>
          </div>
          <div className="lp-why-grid lp-reveal" ref={r(23)}>
            {[
              {
                Icon: Ic.Layers,
                title: 'Organize Complex Legal Work',
                desc: 'Cases have moving parts — hearings, deadlines, clients, documents, notes. LegalPro gives every piece a structured home so nothing falls through the cracks.',
                bullets: ['Linked documents & evidence', 'Hearing timeline tracking', 'Multi-party case support'],
              },
              {
                Icon: Ic.Zap,
                title: 'AI Assisted Legal Thinking',
                desc: 'From Indian statute lookup to note structuring and case summarization, LegalPro\'s AI layer reduces research time and helps you build stronger arguments, faster.',
                bullets: ['Indian case law references', 'Instant legal summaries', 'AI-powered note drafting'],
              },
              {
                Icon: Ic.Star,
                title: 'Built for Professional Law Firms',
                desc: 'Every pixel and every feature is designed for the real demands of Indian legal practice — not adapted from generic project management software.',
                bullets: ['Multi-user firm accounts', 'Conflict detection', 'Professional PDF exports'],
              },
            ].map(({ Icon, title, desc, bullets }) => (
              <div key={title} className="lp-why-card">
                <div className="lp-why-icon"><Icon size={20} /></div>
                <h3 className="lp-why-title">{title}</h3>
                <p className="lp-why-desc">{desc}</p>
                <div className="lp-why-bullets">
                  {bullets.map(b => (
                    <div key={b} className="lp-why-bullet">
                      <span className="lp-why-bullet-check"><Ic.Check /></span>
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECURITY ════════════════════════════════════════════════════════════ */}
      <section className="lp-sec lp-sec-deep" id="security">
        <div className="lp-sec-inner">
          <div className="lp-sec-split lp-reveal" ref={r(24)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <p className="lp-sec-label">Enterprise Security</p>
              <h2 className="lp-sec-title">
                Your clients trust you.<br />We protect that trust.
              </h2>
              <p className="lp-sec-sub" style={{ marginBottom: 28 }}>
                Lawyers handle the most sensitive personal and business information. LegalPro is built with security-first architecture — not bolted on later.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['DPDP Ready', 'AES-256 Encrypted', 'Audit Logged'].map(tag => (
                  <span key={tag} className="lp-badge-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="lp-sec-grid">
              {[
                { title: 'Encrypted Data Storage', desc: 'All case data encrypted at rest and in transit using AES-256.' },
                { title: 'Role-Based Access Control', desc: 'Granular permissions for each team member — control who sees what.' },
                { title: 'Secure Document Handling', desc: 'Documents uploaded, stored, and shared through secured channels only.' },
                { title: 'Private Legal Notes', desc: 'Attorney work-product notes are private by default, never shared automatically.' },
              ].map(item => (
                <div key={item.title} className="lp-sec-card">
                  <div className="lp-sec-card-icon"><Ic.Check /></div>
                  <div className="lp-sec-card-title">{item.title}</div>
                  <div className="lp-sec-card-desc">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ════════════════════════════════════════════════════════ */}
      <section className="lp-sec lp-proof-bg" id="reviews">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(30)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Legal Professionals Love It</p>
            <h2 className="lp-sec-title" style={{ textAlign: 'center' }}>
              Trusted by law firms across India
            </h2>
          </div>
          <div className="lp-proof-grid lp-reveal" ref={r(31)}>
            {[
              {
                quote: "LegalPro completely transformed how we manage cases. The calendar and conflict detection alone save us hours every week. Can't imagine going back to spreadsheets.",
                name: 'Adv. Priya Sharma',
                role: 'Senior Partner, Sharma & Associates, Mumbai',
                init: 'PS',
              },
              {
                quote: "The AI research feature is incredibly useful. Finding relevant IPC sections and precedents used to take half a day — now it takes minutes. Very impressive product.",
                name: 'Adv. Rajan Mehta',
                role: 'Criminal Defense Lawyer, Delhi High Court',
                init: 'RM',
              },
              {
                quote: "Finally a case management tool designed for Indian law firms. The billing module and PDF export are exactly what we needed. The team loved it from day one.",
                name: 'Adv. Sunita Kapoor',
                role: 'Managing Partner, Kapoor Law Office, Bangalore',
                init: 'SK',
              },
            ].map(t => (
              <div key={t.name} className="lp-proof-card">
                <div className="lp-proof-stars">
                  {Array.from({ length: 5 }).map((_, i) => <span key={i} className="lp-proof-star">★</span>)}
                </div>
                <p className="lp-proof-quote">"{t.quote}"</p>
                <div className="lp-proof-author">
                  <div className="lp-proof-avatar">{t.init}</div>
                  <div>
                    <div className="lp-proof-name">{t.name}</div>
                    <div className="lp-proof-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════════════════════════════════════ */}
      <div className="lp-cta-wrap">
        <div className="lp-cta-card lp-reveal" ref={r(38)}>
          <div className="lp-cta-glow" aria-hidden="true" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="lp-hero-badge" style={{ margin: '0 auto 22px', width: 'fit-content' }}>
              <span className="lp-badge-dot" aria-hidden="true" />
              Free to start — no credit card
            </div>
            <h2 className="lp-cta-title">
              Start Managing Your Legal<br />Practice Smarter Today
            </h2>
            <p className="lp-cta-sub">
              Join legal professionals who chose a better way to run their practice.<br />
              LegalPro is free to get started — upgrade when you're ready.
            </p>
            <div className="lp-cta-actions">
              <button id="cta-signup" className="lp-btn lp-btn-gold-lg" onClick={() => go('/signup')}>
                Create Your LegalPro Account <Ic.Arrow />
              </button>
              <button id="cta-login" className="lp-btn lp-btn-outline-lg" onClick={() => go('/login')}>
                Already have an account?
              </button>
            </div>
            <p className="lp-cta-note">
              Secure setup · Indian law firm ready · DPDP compliant
            </p>
          </div>
        </div>
      </div>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════════ */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-footer-top">
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div className="lp-nav-logo-icon" style={{ width: 28, height: 28 }}>
                <Scale className="lp-logo-icon" />
              </div>
              <div>
                <span className="lp-footer-brand-name">LegalPro</span>
                <span className="lp-footer-sub">Indian Law Management</span>
              </div>
            </div>
            <p className="lp-footer-brand-tag">
              Professional case management for modern Indian law firms. Your entire practice in one intelligent workspace.
            </p>
          </div>

          {/* Platform */}
          <div>
            <div className="lp-footer-col-title">Platform</div>
            <div className="lp-footer-links-list">
              {['Case Management', 'Client Portal', 'Court Calendar', 'Legal Research', 'Legal Notes', 'Billing'].map(lbl => (
                <button key={lbl} className="lp-footer-link-btn" onClick={() => scrollId('features')}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <div className="lp-footer-col-title">Legal</div>
            <div className="lp-footer-links-list">
              {['Privacy Policy', 'Terms of Service', 'Data Processing', 'Cookie Policy', 'Security'].map(lbl => (
                <button key={lbl} className="lp-footer-link-btn">{lbl}</button>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <div className="lp-footer-col-title">Account</div>
            <div className="lp-footer-links-list">
              <button className="lp-footer-link-btn" onClick={() => go('/login')}>Login</button>
              <button className="lp-footer-link-btn" onClick={() => go('/signup')}>Sign Up Free</button>
              <button className="lp-footer-link-btn" onClick={() => go('/forgot-password')}>Forgot Password</button>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <span className="lp-footer-copy">© 2026 LegalPro. All Rights Reserved.</span>
          <span className="lp-footer-badge">
            <span style={{ color: '#22c55e' }}>●</span>
            Systems Operational
          </span>
        </div>
      </footer>

    </div>
  );
};

export default Index;
