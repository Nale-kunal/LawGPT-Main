import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';
import { BookOpen, Target, Shield, Layout } from 'lucide-react';

const LegalNotesLanding = () => {
    const navigate = useNavigate();
    const revealEls = useRef<(HTMLElement | null)[]>([]);

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

    return (
        <LandingLayout>
            {/* ══ CONTENT ═════════════════════════════════════════════════════════════ */}
            <section className="lp-sec">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd lp-reveal" ref={r(0)}>
                        <p className="lp-sec-label">Feature Showcase</p>
                        <h1 className="lp-sec-title">Legal Notes</h1>
                        <p className="lp-sec-sub">
                            Maintain structured, case-linked documentation for strategy, research, and internal use. Professional drafting starts with organized insights.
                        </p>
                    </div>

                    <div className="lp-feat-grid lp-reveal" ref={r(1)}>
                        <div className="lp-feat-card">
                            <div className="lp-feat-icon">
                                <Target className="h-6 w-6" />
                            </div>
                            <h3 className="lp-title-lg">Comprehensive Note Types</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-bold text-[var(--lp-gold)] uppercase tracking-wide">Strategy Notes</h4>
                                    <p className="lp-text-p text-sm">Dedicated space for planning arguments, anticipating counter-moves, and defining your overall legal approach.</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-[var(--lp-gold)] uppercase tracking-wide">Internal Notes</h4>
                                    <p className="lp-text-p text-sm">Capture observations from hearings and case tracking details that stay within your firm's workspace.</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-[var(--lp-gold)] uppercase tracking-wide">Evidence Notes</h4>
                                    <p className="lp-text-p text-sm">Document evidence references, witness statements, and related insights directly in context.</p>
                                </div>
                            </div>
                            <div className="lp-feat-tag">● Documentation</div>
                        </div>

                        <div className="lp-feat-card">
                            <div className="lp-feat-icon">
                                <Layout className="h-6 w-6" />
                            </div>
                            <h3 className="lp-title-lg">Contextual Case Linking</h3>
                            <p className="lp-text-p">
                                Every note is linked directly to a specific case profile. When you open a case, all associated strategy and evidence notes are immediately available.
                            </p>
                            <div className="lp-feat-tag">● Organization</div>
                        </div>

                        <div className="lp-feat-card">
                            <div className="lp-feat-icon">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <h3 className="lp-title-lg">Search & Organization</h3>
                            <p className="lp-text-p">
                                Juriq automates the organization of your notes. Categorize your insights for easy retrieval and use the global search to find specific references.
                            </p>
                            <div className="lp-feat-tag">● Automation</div>
                        </div>

                        <div className="lp-feat-card">
                            <div className="lp-feat-icon">
                                <Shield className="h-6 w-6" />
                            </div>
                            <h3 className="lp-title-lg">Guaranteed Privacy</h3>
                            <p className="lp-text-p">
                                Strategy and Evidence notes are encrypted and private. They are never shared externally by default, ensuring your professional strategy remains confidential.
                            </p>
                            <div className="lp-feat-tag">● Security</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FINAL CTA ═══════════════════════════════════════════════════════════ */}
            <div className="lp-cta-wrap">
                <div className="lp-cta-card lp-reveal" ref={r(2)}>
                    <div className="lp-cta-glow" aria-hidden="true" />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="lp-hero-badge" style={{ margin: '0 auto 22px' }}>
                            <span className="lp-badge-dot" aria-hidden="true" />
                            Free to start, no credit card required
                        </div>
                        <h2 className="lp-cta-title">Start Organizing Your<br />Legal Practice</h2>
                        <p className="lp-cta-sub">Juriq provides a structured digital system for managing cases, documents, and hearings. Join advocates who have moved from scattered folders to a professional legal workspace.</p>
                        <div className="lp-cta-actions">
                            <button className="lp-btn lp-btn-gold-lg" onClick={() => go('/signup')}>Create Account <Ic.Arrow /></button>
                            <button className="lp-btn lp-btn-outline-lg" onClick={() => go('/login')}>Login</button>
                        </div>
                        <p className="lp-cta-note">Secure setup, Built for Indian advocates, No credit card required</p>
                    </div>
                </div>
            </div>
        </LandingLayout>
    );
};

export default LegalNotesLanding;
