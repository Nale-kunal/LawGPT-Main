import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Ic } from '@/components/landing/LandingIcons';
import { DashMockup } from '@/components/landing/DashMockup';
import { FaqAccordion } from '@/components/landing/FaqAccordion';
import LandingLayout from '@/components/layout/LandingLayout';

const Home = () => {
    const navigate = useNavigate();
    const revealEls = useRef<(HTMLElement | null)[]>([]);
    const { isAuthenticated, isLoading } = useAuth();

    // Prevent authenticated users from visiting the marketing landing page (e.g. via back button)
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // Scroll-reveal
    useEffect(() => {
        const io = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
            { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
        );
        revealEls.current.forEach(el => el && io.observe(el));
        return () => io.disconnect();
    }, []);

    const r = (i: number) => (el: HTMLElement | null) => { revealEls.current[i] = el; };
    const go = (p: string) => navigate(p);

    if (isAuthenticated) {
        return null; // Return null to prevent mounting flickering before redirect
    }

    return (
        <LandingLayout>
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
                            <span className="lp-hero-title-line lp-anim-up-d1"><span className="lp-gold-text">Juriq</span></span>
                            <span className="lp-hero-title-line lp-anim-up-d2">— The Smarter Way</span>
                            <span className="lp-hero-title-line lp-anim-up-d2">to Run Your Law Firm</span>
                        </h1>
                        <p className="lp-hero-sub lp-anim-up-d3">
                            AI-powered case management built for modern Indian law firms. Manage cases, track hearings, collaborate with clients — all in one workspace.
                        </p>
                        <p className="lp-hero-support lp-anim-up-d4">
                            From criminal to civil, family to corporate — Juriq handles the complexity so you can focus on winning.
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

            {/* ══ FAQ ══════════════════════════════════════════════════════════════════ */}
            <section className="lp-sec" id="faq" aria-labelledby="faq-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(69)}>
                        <p className="lp-sec-label">FAQ</p>
                        <h2 id="faq-heading" className="lp-sec-title">Frequently Asked Questions</h2>
                    </div>
                    <FaqAccordion revealRef={r(70)} />
                </div>
            </section>

            {/* ══ FINAL CTA ═══════════════════════════════════════════════════════════ */}
            <div className="lp-cta-wrap">
                <div className="lp-cta-card lp-reveal" ref={r(38)}>
                    <div className="lp-cta-glow" aria-hidden="true" />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="lp-hero-badge" style={{ margin: '0 auto 22px' }}>
                            <span className="lp-badge-dot" aria-hidden="true" />
                            Free to start, no credit card required
                        </div>
                        <h2 className="lp-cta-title">Start Organizing Your<br />Legal Practice</h2>
                        <p className="lp-cta-sub">Juriq provides a structured digital system for managing cases, documents, and hearings. Join advocates who have moved from scattered folders to a professional legal workspace.</p>
                        <div className="lp-cta-actions">
                            <button id="cta-signup" className="lp-btn lp-btn-gold-lg" onClick={() => go('/signup')}>Create Account <Ic.Arrow /></button>
                            <button id="cta-login" className="lp-btn lp-btn-outline-lg" onClick={() => go('/login')}>Login</button>
                        </div>
                        <p className="lp-cta-note">Secure setup, Built for Indian advocates, No credit card required</p>
                    </div>
                </div>
            </div>
        </LandingLayout>
    );
};

export default Home;
