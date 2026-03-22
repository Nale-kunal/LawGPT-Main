import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';
import { Users, Layout, MessageSquare, Search } from 'lucide-react';

const ClientPortalLanding = () => {
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
                        <h1 className="lp-sec-title">Client Portal</h1>
                        <p className="lp-sec-sub">
                            The Client Portal provides a structured interface for managing client-related information linked to your legal cases, ensuring professional and organized advocacy.
                        </p>
                    </div>

                    <div className="lp-feat-grid lp-reveal" ref={r(1)}>
                        <div className="lp-feat-card">
                            <div className="lp-feat-icon">
                                <Users className="h-6 w-6" />
                            </div>
                            <h3 className="lp-title-lg">Client Information Management</h3>
                            <p className="lp-text-p">
                                Store essential client details in a secure, structured format. Maintain high-fidelity records including contact information, addresses, and identification details like PAN or Aadhar.
                            </p>
                            <div className="lp-feat-tag">● Registry</div>
                        </div>

                        <div className="lp-feat-card">
                            <div className="lp-feat-icon">
                                <Layout className="h-6 w-6" />
                            </div>
                            <h3 className="lp-title-lg">Case Linking</h3>
                            <p className="lp-text-p">
                                Each client record can be linked to multiple active or historical cases. Track all legal matters associated with a client in one unified view, simplifying conflict checks.
                            </p>
                            <div className="lp-feat-tag">● Relationships</div>
                        </div>

                        <div className="lp-feat-card">
                            <div className="lp-feat-icon">
                                <MessageSquare className="h-6 w-6" />
                            </div>
                            <h3 className="lp-title-lg">Communication Records</h3>
                            <p className="lp-text-p">
                                Maintain precise notes related to client discussions, strategy briefings, and internal observations. Keep an audit trail of case updates provided to the client.
                            </p>
                            <div className="lp-feat-tag">● Auditing</div>
                        </div>

                        <div className="lp-feat-card">
                            <div className="lp-feat-icon">
                                <Search className="h-6 w-6" />
                            </div>
                            <h3 className="lp-title-lg">Data Organization</h3>
                            <p className="lp-text-p">
                                All client data is structured and fully searchable. Quickly locate client records by name, matter, or identification detail, saving hours of administrative overhead.
                            </p>
                            <div className="lp-feat-tag">● Efficiency</div>
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

export default ClientPortalLanding;
