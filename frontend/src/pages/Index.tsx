import { useEffect, useRef, useState } from 'react';
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
  Target: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Server: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  Database: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Cloud: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
  Code: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Globe: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Folder: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Map: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  UserCheck: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" />
    </svg>
  ),
};

// ─── FAQ Accordion Sub-Component ────────────────────────────────────────────
const FaqAccordion = ({ revealRef }: { revealRef: (el: HTMLElement | null) => void }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const faqs = [
    { q: 'What is LegalPro?', a: 'LegalPro is a professional case management platform built specifically for Indian advocates and solo legal practitioners. It provides structured tools for managing cases, clients, hearings, documents, notes, and billing in one organized workspace.' },
    { q: 'Who is LegalPro designed for?', a: 'LegalPro is designed primarily for solo advocates, independent legal consultants, and young lawyers starting their practice in India. It is optimized for individual practitioners managing multiple active cases.' },
    { q: 'Does LegalPro support law firms?', a: 'LegalPro currently supports individual advocate workspaces. Multi-user law firm collaboration with shared access and role management is on the product roadmap and will be available in a future update.' },
    { q: 'Are AI features available?', a: 'AI-powered features including case summaries, AI-assisted legal research, and drafting assistance are currently under active development. They are not yet available in the production platform. All upcoming AI features are clearly labeled "Coming Soon".' },
    { q: 'Is my case data secure?', a: 'Yes. LegalPro uses JWT-based authentication, encrypted password storage, role-based access control, CSRF protection middleware, and encrypted cloud document storage to protect your case data at every layer.' },
    { q: 'Can I store documents in LegalPro?', a: 'Yes. LegalPro includes a case-linked Document Vault where you can upload and store documents directly within each case. Documents are stored using secure, encrypted cloud storage and are accessible only to authorized users.' },
  ];
  return (
    <div className="lp-faq-list lp-reveal" ref={revealRef}>
      {faqs.map((f, i) => (
        <div key={i} className={`lp-faq-item${openIdx === i ? ' open' : ''}`}>
          <button className="lp-faq-q" onClick={() => setOpenIdx(openIdx === i ? null : i)} aria-expanded={openIdx === i}>
            <span className="lp-faq-q-text">{f.q}</span>
            <span className="lp-faq-chevron"><Ic.ChevronDown /></span>
          </button>
          <div className="lp-faq-a">{f.a}</div>
        </div>
      ))}
    </div>
  );
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
            { l: 'Workflow', id: 'legal-workflow' },
            { l: 'Security', id: 'security' },
            { l: 'Screenshots', id: 'screenshots' },
            { l: 'FAQ', id: 'faq' },
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

      {/* Problem Framing */}
      <section className="lp-sec" id="problem" aria-labelledby="prob-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(40)}>
            <p className="lp-sec-label">The Challenge</p>
            <h2 id="prob-heading" className="lp-sec-title">Legal Practice Should Not Be Chaotic</h2>
            <p className="lp-problem-intro">Many advocates manage legal work using a mix of spreadsheets, paper files, and scattered folders. As caseloads grow, this becomes increasingly difficult to maintain.</p>
          </div>
          <div className="lp-problem-grid lp-reveal" ref={r(41)}>
            {[
              { label: 'Scattered Documents', sub: 'Case files spread across folders, drives, and email attachments with no central system.' },
              { label: 'Missed Hearings', sub: 'No unified calendar means hearing dates are tracked manually, risking costly oversights.' },
              { label: 'Multiple Case Chaos', sub: 'Managing 20+ active cases simultaneously without structured tracking is error-prone.' },
              { label: 'Unstructured Research', sub: 'Legal notes and research saved in notebooks or random documents that are hard to retrieve.' },
              { label: 'Disorganized Clients', sub: 'Client contact details and matter history stored inconsistently across different tools.' },
            ].map(p => (
              <div key={p.label} className="lp-problem-card">
                <div className="lp-problem-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </div>
                <div className="lp-problem-label">{p.label}</div>
                <div className="lp-problem-sub">{p.sub}</div>
              </div>
            ))}
          </div>
          <div className="lp-problem-solution lp-reveal" ref={r(42)}>
            <div className="lp-problem-solution-icon"><Ic.Scale /></div>
            <div className="lp-problem-solution-text"><strong>LegalPro</strong> introduces a structured digital system built specifically for legal practice, replacing scattered tools with one organized workspace.</div>
          </div>
        </div>
      </section>

      {/* Real Legal Workflow Timeline */}
      <section className="lp-sec lp-sec-alt" id="legal-workflow" aria-labelledby="lwf-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(43)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Real Legal Workflow</p>
            <h2 id="lwf-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Built Around Real Legal Workflow</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>LegalPro mirrors how advocates actually manage legal work from client onboarding to final judgment.</p>
          </div>
          <div className="lp-wf-timeline lp-reveal" ref={r(44)}>
            {[
              { n: '1', t: 'Client Registration', d: 'Register client details and identification records.' },
              { n: '2', t: 'Case Creation', d: 'Structured case files with court details and parties.' },
              { n: '3', t: 'Hearing Scheduling', d: 'Track hearings and record proceedings.' },
              { n: '4', t: 'Strategy Notes', d: 'Internal case strategy and evidence references.' },
              { n: '5', t: 'Document Management', d: 'Case-linked document vault and storage.' },
              { n: '6', t: 'Billing & Invoicing', d: 'Generate invoices and track payments.' },
              { n: '7', t: 'Export & Reporting', d: 'Professional legal summaries and exports.' },
            ].map(s => (
              <div key={s.t} className="lp-wf-tl-item">
                <div className="lp-wf-tl-num">{s.n}</div>
                <div className="lp-wf-tl-title">{s.t}</div>
                <div className="lp-wf-tl-desc">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      {/* ══ CASE PIPELINE ═════════════════════════════════════════════════════════ */}
      <section className="lp-sec" id="pipeline" aria-labelledby="pipe-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(45)}>
            <p className="lp-sec-label">Case Pipeline</p>
            <h2 id="pipe-heading" className="lp-sec-title">Track Case Progress Clearly</h2>
            <p className="lp-pipeline-desc">Every legal matter progresses through multiple stages. LegalPro lets you track these stages through a structured case pipeline so nothing falls through the cracks.</p>
          </div>
          <div className="lp-pipeline-row lp-reveal" ref={r(46)}>
            {[
              { n: '01', t: 'Client Registered', s: 'Identity & contact captured' },
              { n: '02', t: 'Case Filed', s: 'Court & parties documented' },
              { n: '03', t: 'Hearing Scheduled', s: 'Dates on calendar' },
              { n: '04', t: 'Under Review', s: 'Strategy & notes active' },
              { n: '05', t: 'Judgment Pending', s: 'Final arguments filed' },
              { n: '06', t: 'Closed', s: 'Order received & archived' },
            ].map(st => (
              <div key={st.n} className="lp-pipeline-stage">
                <div className="lp-pipeline-badge">{st.n}</div>
                <div className="lp-pipeline-stage-title">{st.t}</div>
                <div className="lp-pipeline-stage-sub">{st.s}</div>
              </div>
            ))}
          </div>
          <div className="lp-pipeline-features lp-reveal" ref={r(47)}>
            {['Custom case milestones', 'Structured case lifecycle', 'Clear visual progress tracking'].map(f => (
              <div key={f} className="lp-pipeline-feat"><span className="lp-pipeline-feat-dot" />{f}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HEARING MANAGEMENT ═════════════════════════════════════════════════════ */}
      <section className="lp-sec lp-sec-alt" id="hearings" aria-labelledby="hear-heading">
        <div className="lp-sec-inner">
          <div className="lp-hearing-split lp-reveal" ref={r(48)}>
            <div>
              <p className="lp-sec-label">Hearing Management</p>
              <h2 id="hear-heading" className="lp-sec-title">Never Miss a Hearing</h2>
              <p className="lp-hearing-desc">LegalPro provides a calendar-based system to track every hearing and identify scheduling overlaps across multiple courts.</p>
              <div className="lp-hearing-features">
                {[
                  { Icon: Ic.Calendar, t: 'Hearing Timeline Tracking', d: 'Every hearing date logged against its case with full context.' },
                  { Icon: Ic.Shield, t: 'Conflict Detection Alerts', d: 'Overlapping hearing dates are flagged so you can reschedule in time.' },
                  { Icon: Ic.Map, t: 'Calendar Overview', d: 'Monthly and weekly views across all active cases and courts.' },
                ].map(({ Icon, t, d }) => (
                  <div key={t} className="lp-hearing-feat">
                    <div className="lp-hearing-feat-icon"><Icon /></div>
                    <div><div className="lp-hearing-feat-title">{t}</div><div className="lp-hearing-feat-desc">{d}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lp-cal-mock">
              <div className="lp-cal-mock-header"><span>March 2026</span><span style={{ fontSize: 11, color: 'var(--lp-subtle)' }}>3 hearings this week</span></div>
              <div className="lp-cal-mock-grid">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="lp-cal-mock-cell" style={{ minHeight: 28, background: 'var(--lp-bg3)' }}>
                    <div className="lp-cal-mock-day">{d}</div>
                  </div>
                ))}
                {[{ d: '10', ev: 'Sharma HC', conflict: false }, { d: '11', ev: '', conflict: false }, { d: '12', ev: 'Kapoor FC', conflict: false }, { d: '13', ev: 'Tata Civil', conflict: true }, { d: '14', ev: 'Gupta Dist', conflict: true }, { d: '15', ev: '', conflict: false }, { d: '16', ev: '', conflict: false }].map((c, i) => (
                  <div key={i} className={`lp-cal-mock-cell${c.ev ? ' has-event' : ''}`}>
                    <div className="lp-cal-mock-day">{c.d}</div>
                    {c.ev && !c.conflict && <div className="lp-cal-mock-event">{c.ev}</div>}
                    {c.ev && c.conflict && <div className="lp-cal-mock-conflict">! {c.ev}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ DOCUMENT VAULT ═════════════════════════════════════════════════════ */}
      <section className="lp-sec" id="vault" aria-labelledby="vault-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(49)}>
            <p className="lp-sec-label">Document Management</p>
            <h2 id="vault-heading" className="lp-sec-title">Secure Case Document Vault</h2>
            <p className="lp-sec-sub">LegalPro organizes every document directly within the case where it belongs.</p>
          </div>
          <div className="lp-vault-grid lp-reveal" ref={r(50)}>
            {[
              { Icon: Ic.Folder, title: 'Case-Linked Storage', desc: 'Every document is attached to its specific case file, no more hunting through generic folders.' },
              { Icon: Ic.Lock, title: 'Secure Access Control', desc: 'Documents accessible only to the authorized advocate. Role-based access protects sensitive files.' },
              { Icon: Ic.Cloud, title: 'Cloud Document Access', desc: 'Access your case documents securely from anywhere with encrypted cloud-based storage.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="lp-vault-card">
                <div className="lp-vault-icon"><Icon /></div>
                <div className="lp-vault-title">{title}</div>
                <div className="lp-vault-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ LEGAL REFERENCE LIBRARY ═════════════════════════════════════════════════ */}
      <section className="lp-sec lp-sec-alt" id="reference" aria-labelledby="ref-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(51)}>
            <p className="lp-sec-label">Legal Reference</p>
            <h2 id="ref-heading" className="lp-sec-title">Quick Legal Reference</h2>
            <p className="lp-ref-desc">LegalPro includes an integrated reference system containing commonly used Indian laws, keeping key statutes accessible while you work on cases.</p>
          </div>
          <div className="lp-ref-chips lp-reveal" ref={r(52)}>
            {['Indian Penal Code (IPC)', 'Criminal Procedure Code (CrPC)', 'Indian Contract Act', 'Code of Civil Procedure (CPC)', 'Indian Evidence Act', 'Negotiable Instruments Act', 'Transfer of Property Act', 'Specific Relief Act', 'Arbitration & Conciliation Act', 'Consumer Protection Act', 'Information Technology Act'].map(law => (
              <div key={law} className="lp-ref-chip"><span className="lp-ref-chip-dot" />{law}</div>
            ))}
          </div>
          <p className="lp-ref-note lp-reveal" ref={r(53)}>Future updates will expand the legal reference database with more acts and case law summaries.</p>
        </div>
      </section>

      {/* ══ PRACTICE MANAGEMENT HUB ═════════════════════════════════════════════════ */}
      <section className="lp-sec" id="hub" aria-labelledby="hub-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(54)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">All-in-One</p>
            <h2 id="hub-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Your Entire Legal Practice in One Workspace</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>LegalPro centralizes every essential component of legal practice management.</p>
          </div>
          <div className="lp-hub-grid lp-reveal" ref={r(55)}>
            {[
              { Icon: Ic.Briefcase, label: 'Cases', sub: 'Full case lifecycle tracking' },
              { Icon: Ic.Users, label: 'Clients', sub: 'Organized client registry' },
              { Icon: Ic.Calendar, label: 'Hearings', sub: 'Court calendar management' },
              { Icon: Ic.Folder, label: 'Documents', sub: 'Secure case documents' },
              { Icon: Ic.Note, label: 'Legal Notes', sub: 'Strategy & research notes' },
              { Icon: Ic.Billing, label: 'Billing', sub: 'Invoicing & payment tracking' },
            ].map(({ Icon, label, sub }) => (
              <div key={label} className="lp-hub-item">
                <div className="lp-hub-icon"><Icon /></div>
                <div className="lp-hub-label">{label}</div>
                <div className="lp-hub-sub">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRODUCT WALKTHROUGH ════════════════════════════════════════════════════ */}
      <section className="lp-sec lp-sec-alt" id="legal-workflow" aria-labelledby="walk-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(20)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Product Walkthrough</p>
            <h2 id="walk-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>How LegalPro Works</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>Get organized in minutes. No training required.</p>
          </div>
          <div className="lp-steps-grid lp-reveal" ref={r(21)}>
            {[
              { n: '1', t: 'Create Your Account', d: 'Sign up and set up your LegalPro advocate profile in minutes.' },
              { n: '2', t: 'Register Your Clients', d: 'Add client details, contact information, and identification records.' },
              { n: '3', t: 'Create & Organize Cases', d: 'Build structured case files with court details, parties, and case type.' },
              { n: '4', t: 'Schedule & Track Hearings', d: 'Add hearing dates, record outcomes, and get a full calendar view.' },
              { n: '5', t: 'Upload Documents & Notes', d: 'Attach case documents and maintain internal strategy notes per case.' },
              { n: '6', t: 'Export & Invoice', d: 'Generate professional case summaries and billing invoices.' },
            ].map(s => (
              <div key={s.t} className="lp-step-card">
                <div className="lp-step-num-row">
                  <div className="lp-step-circle">{s.n}</div>
                  <div className="lp-step-title">{s.t}</div>
                </div>
                <div className="lp-step-desc">{s.d}</div>
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

      {/* Technology Architecture */}
      <section className="lp-sec" id="technology" aria-labelledby="tech-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(56)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Technology</p>
            <h2 id="tech-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Built on Modern Technology</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>LegalPro uses a modern web stack designed for reliability, security, and performance.</p>
          </div>
          <div className="lp-tech-grid lp-reveal" ref={r(57)}>
            {[
              { Icon: Ic.Code, layer: 'Frontend', name: 'React + TypeScript', desc: 'Type-safe component architecture for a reliable, consistent UI.' },
              { Icon: Ic.Server, layer: 'Backend', name: 'Node.js + Express', desc: 'Scalable REST API layer with JWT authentication and CSRF protection.' },
              { Icon: Ic.Database, layer: 'Database', name: 'MongoDB', desc: 'Flexible document database for structured legal data storage.' },
              { Icon: Ic.Cloud, layer: 'Storage', name: 'Cloud Storage', desc: 'Encrypted cloud-based document storage for secure case file access.' },
            ].map(({ Icon, layer, name, desc }) => (
              <div key={name} className="lp-tech-card">
                <div className="lp-tech-icon"><Icon /></div>
                <div className="lp-tech-layer">{layer}</div>
                <div className="lp-tech-name">{name}</div>
                <div className="lp-tech-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It Is For */}
      <section className="lp-sec lp-sec-alt" id="audience" aria-labelledby="aud-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(58)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Who It Is For</p>
            <h2 id="aud-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Designed for Legal Professionals</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>Built specifically for the needs of individual advocates and independent legal consultants.</p>
          </div>
          <div className="lp-audience-grid lp-reveal" ref={r(59)}>
            <div className="lp-audience-card">
              <div className="lp-audience-icon"><Ic.UserCheck /></div>
              <div className="lp-audience-role">Primary Audience</div>
              <div className="lp-audience-title">Solo Advocates</div>
              <div className="lp-audience-desc">Individual advocates managing multiple cases across different courts. LegalPro gives you a single organized system for your entire practice.</div>
            </div>
            <div className="lp-audience-card">
              <div className="lp-audience-icon"><Ic.Briefcase /></div>
              <div className="lp-audience-role">Consultants</div>
              <div className="lp-audience-title">Independent Legal Consultants</div>
              <div className="lp-audience-desc">Legal consultants handling multiple client matters simultaneously. Track each matter independently within one organized workspace.</div>
            </div>
            <div className="lp-audience-card">
              <div className="lp-audience-icon"><Ic.Star /></div>
              <div className="lp-audience-role">New Practitioners</div>
              <div className="lp-audience-title">Young Lawyers Starting Practice</div>
              <div className="lp-audience-desc">Build professional legal workflows from day one. LegalPro gives you the structure to run a disciplined practice from the start.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Philosophy */}
      <section className="lp-sec" id="philosophy" aria-labelledby="phil-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(60)}>
            <p className="lp-sec-label">Design Philosophy</p>
            <h2 id="phil-heading" className="lp-sec-title">Designed for Legal Precision</h2>
            <p className="lp-philosophy-intro">LegalPro is not a generic productivity tool repurposed for law. It is built specifically for legal workflows, with every feature designed around how advocates actually work.</p>
          </div>
          <div className="lp-philosophy-list lp-reveal" ref={r(61)}>
            {[
              { t: 'Case-Based Organization', s: 'Every piece of information, documents, notes, hearings, clients, is organized within the case it belongs to.' },
              { t: 'Hearing-Driven Workflow', s: 'Hearings are the heartbeat of legal practice. The entire system is designed to help you never miss one.' },
              { t: 'Structured Legal Documentation', s: 'Notes, research, and strategy documents follow a structured format designed for legal professionals.' },
              { t: 'Secure Case Records', s: 'Case data is treated as confidential by design. Access is controlled, logged, and protected at every layer.' },
            ].map(({ t, s }) => (
              <div key={t} className="lp-philosophy-item">
                <div className="lp-philosophy-check"><Ic.Check /></div>
                <div><div className="lp-philosophy-text">{t}</div><div className="lp-philosophy-sub">{s}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Reliability */}
      <section className="lp-sec lp-sec-alt" id="reliability" aria-labelledby="rel-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(62)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Reliability</p>
            <h2 id="rel-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Built for Professional Legal Practice</h2>
          </div>
          <div className="lp-reliability-grid lp-reveal" ref={r(63)}>
            {[
              { t: 'Structured Case Lifecycle', d: 'Every case follows a defined lifecycle from registration to closure without information getting lost.' },
              { t: 'Audit Logging', d: 'System activity is logged so you always know what changed and when in your practice.' },
              { t: 'Secure Authentication', d: 'JWT-based authentication with encrypted password storage and session management.' },
              { t: 'Encrypted Document Storage', d: 'Case documents stored using encrypted cloud infrastructure, accessible only to authorized users.' },
            ].map(({ t, d }) => (
              <div key={t} className="lp-reliability-card">
                <div className="lp-reliability-icon"><Ic.Check /></div>
                <div className="lp-reliability-title">{t}</div>
                <div className="lp-reliability-desc">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ════════════════════════════════════════════════════════ */}
      <section className="lp-sec lp-proof-bg" id="reviews">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(30)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">From the Community</p>
            <h2 className="lp-sec-title" style={{ textAlign: 'center' }}>Built for Legal Professionals</h2>
          </div>
          <div className="lp-reveal" ref={r(31)} style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="lp-proof-card" style={{ maxWidth: 680, width: '100%', textAlign: 'center', borderRadius: 'var(--lp-r)' }}>
              <p className="lp-proof-quote" style={{ fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 0 }}>
                LegalPro is currently evolving with feedback from legal professionals to build a modern case management system tailored for Indian advocates.
                <br /><br />
                Real user testimonials will appear here as the platform grows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRODUCT ROADMAP ════════════════════════════════════════════════════════ */}
      <section className="lp-sec" id="roadmap" aria-labelledby="road-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(64)}>
            <p className="lp-sec-label">Roadmap</p>
            <h2 id="road-heading" className="lp-sec-title">What is Coming Next</h2>
            <p className="lp-roadmap-intro">LegalPro will continue expanding with new capabilities. The following features are currently in development and will be released in future updates.</p>
          </div>
          <div className="lp-roadmap-items lp-reveal" ref={r(65)}>
            {[
              { t: 'AI-Powered Case Summaries', d: 'Automatically generate structured summaries of case history, hearings, and notes.' },
              { t: 'AI-Assisted Legal Research', d: 'Intelligent search and analysis across legal references and case materials.' },
              { t: 'AI Drafting Assistance', d: 'Draft legal correspondence and internal notes with AI-assisted writing tools.' },
              { t: 'Multi-User Law Firm Collaboration', d: 'Shared workspaces for small law firms with role-based access per user.' },
              { t: 'Advanced Practice Analytics', d: 'Insights into case outcomes, hearing frequency, and practice performance over time.' },
            ].map(({ t, d }) => (
              <div key={t} className="lp-roadmap-item">
                <div className="lp-roadmap-dot" />
                <div className="lp-roadmap-content">
                  <div><div className="lp-roadmap-title">{t}</div><div className="lp-roadmap-desc">{d}</div></div>
                  <span className="lp-coming-soon"><span className="lp-cs-dot" />Coming Soon</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TRANSPARENCY ═══════════════════════════════════════════════════════════ */}
      <section className="lp-sec lp-sec-alt" id="transparency" aria-labelledby="trans-heading">
        <div className="lp-sec-inner">
          <div className="lp-transparency-box lp-reveal" ref={r(66)}>
            <div>
              <h2 id="trans-heading" className="lp-transparency-title">Transparent Product Development</h2>
              <p className="lp-transparency-text">LegalPro focuses on building practical tools that help advocates manage legal work reliably. Artificial intelligence capabilities are currently under development and will be released in future updates. All AI features require your professional review before use.</p>
            </div>
            <div className="lp-transparency-tags">
              {['Production-grade authentication', 'No fabricated statistics', 'AI features clearly labeled', 'Honest capability descriptions'].map(tag => (
                <div key={tag} className="lp-transparency-tag"><span className="lp-transparency-tag-dot" />{tag}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ SCREENSHOTS PREVIEW ════════════════════════════════════════════════════ */}
      <section className="lp-sec" id="screenshots" aria-labelledby="ss-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(67)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Interface Preview</p>
            <h2 id="ss-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>See LegalPro in Action</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>A preview of the organized, professional interface your practice will run on.</p>
          </div>
          <div className="lp-screens-grid lp-reveal" ref={r(68)}>

            {/* Case Dashboard */}
            <div className="lp-screen-card">
              <div className="lp-app-mock">
                <div className="lp-app-sidebar">
                  <div className="lp-app-logo-row"><div className="lp-app-logo-icon" /><div className="lp-app-logo-text">LegalPro</div></div>
                  <div className="lp-app-nav-label">Navigation</div>
                  {['Dashboard', 'Cases', 'Calendar', 'Clients', 'Legal Research', 'Billing', 'Documents', 'Notes'].map((item, i) => (
                    <div key={item} className={`lp-app-nav-item${i === 0 ? ' active' : ''}`}><div className="lp-app-nav-dot" />{item}</div>
                  ))}
                </div>
                <div className="lp-app-main">
                  <div className="lp-app-topbar">
                    <div><div className="lp-app-page-title">Welcome back, Advocate</div></div>
                    <div className="lp-app-topbar-icons"><div className="lp-app-icon-circle" /><div className="lp-app-icon-circle gold" /></div>
                  </div>
                  <div className="lp-app-content">
                    <div className="lp-app-kpi-row">
                      <div className="lp-app-kpi"><div className="lp-app-kpi-val">12</div><div className="lp-app-kpi-key">Active Cases</div></div>
                      <div className="lp-app-kpi"><div className="lp-app-kpi-val gold">4</div><div className="lp-app-kpi-key">Hearings Due</div></div>
                      <div className="lp-app-kpi"><div className="lp-app-kpi-val">19</div><div className="lp-app-kpi-key">Clients</div></div>
                    </div>
                    <div className="lp-app-table-hd">Recent Cases</div>
                    {[{ n: 'Sharma v State', s: 'Active', c: 'HC Delhi' }, { n: 'Kapoor Civil 04', s: 'Hearing', c: 'Dist Court' }, { n: 'IT v Tata Ltd', s: 'Pending', c: 'HC Mumbai' }].map(r => (
                      <div key={r.n} className="lp-app-table-row">
                        <div className="lp-app-tr-name">{r.n}</div>
                        <div className="lp-app-tr-court">{r.c}</div>
                        <div className={`lp-app-tr-badge${r.s === 'Hearing' ? ' gold' : ''}`}>{r.s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lp-screen-bottom">
                <div className="lp-screen-label">Case Dashboard</div>
                <div className="lp-screen-desc">Unified overview of all active cases, hearings, and client count.</div>
              </div>
            </div>

            {/* Legal Calendar */}
            <div className="lp-screen-card">
              <div className="lp-app-mock">
                <div className="lp-app-sidebar">
                  <div className="lp-app-logo-row"><div className="lp-app-logo-icon" /><div className="lp-app-logo-text">LegalPro</div></div>
                  <div className="lp-app-nav-label">Navigation</div>
                  {['Dashboard', 'Cases', 'Calendar', 'Clients', 'Legal Research', 'Billing', 'Documents', 'Notes'].map((item, i) => (
                    <div key={item} className={`lp-app-nav-item${i === 2 ? ' active' : ''}`}><div className="lp-app-nav-dot" />{item}</div>
                  ))}
                </div>
                <div className="lp-app-main">
                  <div className="lp-app-topbar">
                    <div><div className="lp-app-page-title">Legal Calendar</div><div className="lp-app-page-sub">Court hearings and important dates</div></div>
                    <div className="lp-app-btn-gold">+ Schedule Hearing</div>
                  </div>
                  <div className="lp-app-content">
                    <div className="lp-app-cal-header"><span className="lp-app-cal-month">March 2026</span><div style={{ display: 'flex', gap: 4 }}><div className="lp-app-cal-arrow" /><div className="lp-app-cal-arrow" /></div></div>
                    <div className="lp-app-cal-days">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="lp-app-cal-day-hd">{d}</div>)}</div>
                    <div className="lp-app-cal-grid">
                      {Array.from({ length: 35 }).map((_, i) => {
                        const evts = [{ i: 6, col: '#D4AF37' }, { i: 14, col: '#D4AF37', col2: '#3b82f6', warn: true }, { i: 15, col: '#ef4444', warn: true }, { i: 16, today: true }, { i: 20, col: '#D4AF37' }];
                        const ev = evts.find(e => e.i === i);
                        return (
                          <div key={i} className={`lp-app-cal-cell${ev && ev.today ? ' today' : ''}`}>
                            <span className="lp-app-cal-num">{i < 31 ? i + 1 : ''}</span>
                            {ev && ev.col && <div className="lp-app-cal-dot" style={{ background: ev.col }} />}
                            {ev && ev.col2 && <div className="lp-app-cal-dot" style={{ background: ev.col2 }} />}
                            {ev && ev.warn && <div className="lp-app-cal-warn">!</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="lp-screen-bottom">
                <div className="lp-screen-label">Legal Calendar</div>
                <div className="lp-screen-desc">Monthly calendar with colour-coded hearings, conflict flags, and scheduling.</div>
              </div>
            </div>

            {/* Document Management */}
            <div className="lp-screen-card">
              <div className="lp-app-mock">
                <div className="lp-app-sidebar">
                  <div className="lp-app-logo-row"><div className="lp-app-logo-icon" /><div className="lp-app-logo-text">LegalPro</div></div>
                  <div className="lp-app-nav-label">Navigation</div>
                  {['Dashboard', 'Cases', 'Calendar', 'Clients', 'Legal Research', 'Billing', 'Documents', 'Notes'].map((item, i) => (
                    <div key={item} className={`lp-app-nav-item${i === 6 ? ' active' : ''}`}><div className="lp-app-nav-dot" />{item}</div>
                  ))}
                </div>
                <div className="lp-app-main">
                  <div className="lp-app-topbar">
                    <div><div className="lp-app-page-title">Document Management</div><div className="lp-app-page-sub">Secure storage for all legal documents</div></div>
                    <div style={{ display: 'flex', gap: 5 }}><div className="lp-app-btn-ghost">New Folder</div><div className="lp-app-btn-gold">Upload</div></div>
                  </div>
                  <div className="lp-app-content">
                    <div className="lp-app-doc-cats">
                      {[{ l: 'All Files' }, { l: 'Images' }, { l: 'PDF & DOC' }, { l: 'Videos' }].map(c => (
                        <div key={c.l} className="lp-app-doc-cat"><div className="lp-app-doc-cat-val">0</div><div className="lp-app-doc-cat-lbl">{c.l}</div></div>
                      ))}
                    </div>
                    <div className="lp-app-table-hd" style={{ marginTop: 8 }}>Folders</div>
                    <div className="lp-app-folder-row"><div className="lp-app-folder-icon" /><div className="lp-app-folder-info"><div className="lp-app-folder-name">CC-2024-002 - Megatron</div><div className="lp-app-folder-date">2025-02-21 10:43 PM</div></div></div>
                    <div className="lp-app-folder-row"><div className="lp-app-folder-icon" /><div className="lp-app-folder-info"><div className="lp-app-folder-name">TF-2026-001 - Optimus</div><div className="lp-app-folder-date">2026-02-21 2:58 AM</div></div></div>
                  </div>
                </div>
              </div>
              <div className="lp-screen-bottom">
                <div className="lp-screen-label">Document Management</div>
                <div className="lp-screen-desc">Case-linked document folders with upload, search, and secure access control.</div>
              </div>
            </div>

            {/* Client Registry */}
            <div className="lp-screen-card">
              <div className="lp-app-mock">
                <div className="lp-app-sidebar">
                  <div className="lp-app-logo-row"><div className="lp-app-logo-icon" /><div className="lp-app-logo-text">LegalPro</div></div>
                  <div className="lp-app-nav-label">Navigation</div>
                  {['Dashboard', 'Cases', 'Calendar', 'Clients', 'Legal Research', 'Billing', 'Documents', 'Notes'].map((item, i) => (
                    <div key={item} className={`lp-app-nav-item${i === 3 ? ' active' : ''}`}><div className="lp-app-nav-dot" />{item}</div>
                  ))}
                </div>
                <div className="lp-app-main">
                  <div className="lp-app-topbar">
                    <div><div className="lp-app-page-title">Clients</div><div className="lp-app-page-sub">All registered clients</div></div>
                    <div className="lp-app-btn-gold">+ Add Client</div>
                  </div>
                  <div className="lp-app-content">
                    <div className="lp-app-search-bar"><span style={{ opacity: .4, fontSize: 10 }}>Search clients...</span></div>
                    {[{ n: 'Rajesh Sharma', m: 'CC-2024-002', s: 'Active' }, { n: 'Priya Kapoor', m: 'FC-2025-007', s: 'Active' }, { n: 'Arvind Tata', m: 'CV-2026-001', s: 'Pending' }, { n: 'Meera Gupta', m: 'CR-2025-014', s: 'Active' }].map(c => (
                      <div key={c.n} className="lp-app-client-row">
                        <div className="lp-app-avatar-sm">{c.n[0]}</div>
                        <div className="lp-app-client-info"><div className="lp-app-client-name">{c.n}</div><div className="lp-app-client-matter">{c.m}</div></div>
                        <div className={`lp-app-tr-badge${c.s === 'Active' ? ' gold' : ''}`}>{c.s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lp-screen-bottom">
                <div className="lp-screen-label">Client Registry</div>
                <div className="lp-screen-desc">Organized client profiles linked to case matters, with status and quick search.</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════════════════════════ */}
      <section className="lp-sec lp-sec-alt" id="faq" aria-labelledby="faq-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(69)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">FAQ</p>
            <h2 id="faq-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Frequently Asked Questions</h2>
          </div>
          <FaqAccordion revealRef={r(70)} />
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════════════════════════════════════ */}
      <div className="lp-cta-wrap">
        <div className="lp-cta-card lp-reveal" ref={r(38)}>
          <div className="lp-cta-glow" aria-hidden="true" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="lp-hero-badge" style={{ margin: '0 auto 22px', width: 'fit-content' }}>
              <span className="lp-badge-dot" aria-hidden="true" />
              Free to start, no credit card required
            </div>
            <h2 className="lp-cta-title">Start Organizing Your<br />Legal Practice</h2>
            <p className="lp-cta-sub">LegalPro provides a structured digital system for managing cases, documents, and hearings. Join advocates who have moved from scattered folders to a professional legal workspace.</p>
            <div className="lp-cta-actions">
              <button id="cta-signup" className="lp-btn lp-btn-gold-lg" onClick={() => go('/signup')}>Create Account <Ic.Arrow /></button>
              <button id="cta-login" className="lp-btn lp-btn-outline-lg" onClick={() => go('/login')}>Login</button>
            </div>
            <p className="lp-cta-note">Secure setup, Built for Indian advocates, No credit card required</p>
          </div>
        </div>
      </div>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════════ */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-footer-top">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div className="lp-nav-logo-icon" style={{ width: 28, height: 28 }}><Scale className="lp-logo-icon" /></div>
              <div><span className="lp-footer-brand-name">LegalPro</span><span className="lp-footer-sub">Indian Law Management</span></div>
            </div>
            <p className="lp-footer-brand-tag">Professional case management for Indian advocates and legal professionals.</p>
          </div>
          <div>
            <div className="lp-footer-col-title">Platform</div>
            <div className="lp-footer-links-list">
              {['Case Management', 'Client Portal', 'Court Calendar', 'Legal Research', 'Legal Notes', 'Billing'].map(lbl => (
                <button key={lbl} className="lp-footer-link-btn" onClick={() => scrollId('features')}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="lp-footer-col-title">Legal</div>
            <div className="lp-footer-links-list">
              {['Privacy Policy', 'Terms of Service', 'Data Processing', 'Cookie Policy', 'Security'].map(lbl => (
                <button key={lbl} className="lp-footer-link-btn">{lbl}</button>
              ))}
            </div>
          </div>
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
          <span className="lp-footer-copy">2026 LegalPro. All Rights Reserved.</span>
          <span className="lp-footer-badge"><span style={{ color: '#22c55e' }}>*</span> Systems Operational</span>
        </div>
      </footer>

    </div>
  );
};

export default Index;
