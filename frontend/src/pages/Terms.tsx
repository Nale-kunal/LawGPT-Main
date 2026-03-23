import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';

const Terms = () => {
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
                        <p className="lp-sec-label">Legal Center</p>
                        <h1 className="lp-sec-title">Terms of Service</h1>
                        <p className="lp-sec-sub">Last updated: March 2026</p>
                    </div>

                    <div className="space-y-12 lp-reveal" ref={r(1)}>
                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Acceptance of Terms</h2>
                            <p className="lp-text-p">
                                By accessing or using Juriq, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                            </p>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Use of Service</h2>
                            <p className="lp-text-p">
                                Users agree to use the Juriq platform only for lawful legal practice activities. You may use our tools for case management, research, and documentation in accordance with professional legal standards and ethics. Unauthorized use of the system or its data is strictly prohibited.
                            </p>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Account Responsibility</h2>
                            <p className="lp-text-p">
                                Access to Juriq requires account registration. Users are responsible for maintaining the security of their credentials and for all activities that occur under their account. You must notify us immediately of any unauthorized use of your account.
                            </p>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Data Responsibility</h2>
                            <p className="lp-text-p">
                                Users maintain full ownership of the data they enter. However, you are solely responsible for the accuracy, legality, and professional appropriateness of all data (including client details and documents) entered into the system. Juriq is a processing tool and does not verify the content of user-provided data.
                            </p>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Service Availability & Modifications</h2>
                            <p className="lp-text-p">
                                Juriq is provided on an ongoing basis to support your practice. However, we reserve the right to update, modify, or temporarily suspend parts of the service for maintenance or system improvements. We strive to minimize disruptions to your workflow.
                            </p>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Limitation of Liability</h2>
                            <p className="lp-text-p">
                                Juriq provides management and research tools for legal professionals. <strong>Juriq does not provide legal advice.</strong> Use of our tools (including AI-generated summaries or research insights) does not constitute a lawyer-client relationship between Juriq and the user. Professional judgment must always be applied to internal system data.
                            </p>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Governing Law</h2>
                            <p className="lp-text-p">
                                These terms are governed by and construed in accordance with the laws of India, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
                            </p>
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

export default Terms;
