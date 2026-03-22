import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';
import { Database } from 'lucide-react';

const DataProcessing = () => {
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
                <div className="lp-sec-inner !max-w-4xl">
                    <div className="lp-sec-hd lp-reveal" ref={r(0)}>
                        <p className="lp-sec-label">Compliance Center</p>
                        <h1 className="lp-sec-title">Data Processing</h1>
                        <p className="lp-sec-sub">Transparency in Legal Data Handling</p>
                    </div>

                    <div className="space-y-12 lp-reveal" ref={r(1)}>
                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Data Roles</h2>
                            <p className="lp-text-p mb-4">
                                Under modern data protection standards (including India's DPDP Act):
                            </p>
                            <ul className="list-disc pl-6 space-y-3 lp-text-p">
                                <li><strong>User as Data Controller:</strong> You maintain full control over the legal and client data you enter and decide the purposes for its processing.</li>
                                <li><strong>Juriq as Data Processor:</strong> We process data strictly on your behalf and according to your instructions to provide platform functionality.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Data Handling & Purpose</h2>
                            <p className="lp-text-p mb-4">Information entered into the Juriq system is processed exclusively for the following purposes:</p>
                            <ul className="list-disc pl-6 space-y-3 lp-text-p">
                                <li><strong>Case Management:</strong> Enabling the organization, grouping, and retrieval of legal matters.</li>
                                <li><strong>Legal Research:</strong> Powering semantic search and case law correlations.</li>
                                <li><strong>Export & Archival:</strong> Generating structured documents for court and client use.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Infrastructure & Storage</h2>
                            <p className="lp-text-p">
                                All data is processed and stored using cloud-based infrastructure with high-availability and redundancy measures. We utilize secure data centers that implement both physical and digital access controls.
                            </p>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Data Retention</h2>
                            <p className="lp-text-p">
                                We retain user-processed data only for as long as the user maintains an active account with Juriq. Upon account termination or an explicit deletion request, data is purged from our active systems in accordance with standard data disposal procedures.
                            </p>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Security Measures</h2>
                            <p className="lp-text-p mb-4">Our data processing includes the following technical safeguards:</p>
                            <ul className="list-disc pl-6 space-y-3 lp-text-p">
                                <li><strong>Authentication Controls:</strong> Industry-standard login protocols and session management.</li>
                                <li><strong>Encrypted Transfer:</strong> All data is transmitted over secure SSL/TLS channels.</li>
                                <li><strong>Restricted Access:</strong> Role-based access controls for internal troubleshooting (if authorized).</li>
                            </ul>
                        </section>
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

export default DataProcessing;
