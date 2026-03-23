import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';


const Privacy = () => {
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
                        <h1 className="lp-sec-title">Privacy Policy</h1>
                        <p className="lp-sec-sub">Effective March 2026</p>
                    </div>

                    <div className="space-y-12 lp-reveal" ref={r(1)}>
                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Introduction</h2>
                            <p className="lp-text-p">
                                This Privacy Policy explains how Juriq collects, uses, and protects user data. We are committed to maintaining the highest standards of data privacy and security for legal professionals and their clients.
                            </p>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Information Collected</h2>
                            <p className="lp-text-p mb-4">To provide a comprehensive legal management experience, we collect the following types of information:</p>
                            <ul className="list-disc pl-6 space-y-3 lp-text-p">
                                <li><strong>Account Information:</strong> Name, professional email address, and authentication credentials.</li>
                                <li><strong>Client Data:</strong> Names, contact details, and identification information entered by users.</li>
                                <li><strong>Case-Related Data:</strong> Matter descriptions, hearing schedules, and related meta-information.</li>
                                <li><strong>Uploaded Documents:</strong> Legal filings, evidence, and internal drafts uploaded to the platform.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Use of Information</h2>
                            <p className="lp-text-p mb-4">Collected data is used strictly for the following purposes:</p>
                            <ul className="list-decimal pl-6 space-y-3 lp-text-p">
                                <li>Providing core platform functionality including search and dashboard management.</li>
                                <li>Facilitating secure communication and case tracking.</li>
                                <li>System updates, security monitoring, and account verification.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Data Storage & Security</h2>
                            <p className="lp-text-p mb-4">
                                Data is stored using secure, enterprise-grade cloud infrastructure. We implement industry-standard measures to protect your information:
                            </p>
                            <ul className="list-disc pl-6 space-y-3 lp-text-p">
                                <li>Encryption of data at rest and during transit.</li>
                                <li>Regular security audits and infrastructure monitoring.</li>
                                <li>Restricted access controls to prevent unauthorized data access.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Data Sharing</h2>
                            <p className="lp-text-p">
                                <strong>Juriq does not sell user data.</strong> We do not share your sensitive legal data or client information with third parties for marketing purposes. Data is only processed as required by our infrastructure providers (cloud hosting, storage) to deliver the platform's functionality.
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

export default Privacy;
