import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';

const POLICY_VERSION = '1.0';
const EFFECTIVE_DATE = '1 June 2026';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
        <h2 className="lp-title-lg text-xl! mb-4">{title}</h2>
        <div className="lp-text-p space-y-3">{children}</div>
    </section>
);

const CopyrightPolicy = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isDashboard = location.pathname.startsWith('/dashboard');
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

    const content = (
        <div className="space-y-12">

            <Section title="1. Juriq's Intellectual Property">
                <p>
                    The Juriq platform — including all software, design, UI components, brand assets, logos, documentation, and proprietary algorithms — is owned by Juriq and protected under applicable Indian intellectual property laws, including the Copyright Act, 1957 and the Trade Marks Act, 1999.
                </p>
                <p>
                    Nothing in these terms grants you any rights in or to the Juriq platform beyond the limited licence to use the platform as a subscriber under the <Link to={isDashboard ? "/dashboard/terms" : "/terms"} className="text-primary hover:underline">Terms of Service</Link>.
                </p>
            </Section>

            <Section title="2. User-Uploaded Content">
                <p>
                    You retain full ownership of all content you upload to Juriq — including case files, documents, legal notes, and templates. By uploading content, you represent and warrant that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>You own the content or have lawful rights to upload and process it on the Juriq platform;</li>
                    <li>Your content does not infringe the intellectual property rights, privacy rights, or any other rights of any third party;</li>
                    <li>You have obtained all necessary consents from your clients to process their information on the Juriq platform.</li>
                </ul>
            </Section>

            <Section title="3. Legal Content and Third-Party Materials">
                <p>
                    Juriq's legal research database contains publicly available Indian statutes, case summaries, and legal acts sourced from official and publicly accessible repositories. Juriq does not claim copyright over statutory texts, which are in the public domain under Indian law.
                </p>
                <p>
                    Where third-party legal materials are used in the platform under licence or fair use, Juriq ensures appropriate attribution. If you believe any content on the platform infringes your intellectual property rights, please follow the takedown procedure in Section 5 below.
                </p>
            </Section>

            <Section title="4. Prohibited Uses of Juriq IP">
                <p>Without Juriq's express written permission, you may not:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Copy, reproduce, distribute, or create derivative works of the Juriq platform, UI, or software;</li>
                    <li>Use the Juriq brand name, logo, or trademarks in any manner that implies association with or endorsement by Juriq;</li>
                    <li>Scrape, extract, or systematically download any data, content, or intellectual property from the Juriq platform;</li>
                    <li>Reverse engineer, decompile, or disassemble any part of the Juriq software.</li>
                </ul>
            </Section>

            <Section title="5. Takedown Procedure — How to Report Infringement">
                <p>
                    If you believe that content available on or through the Juriq platform infringes your copyright or other intellectual property rights, please submit a written takedown notice to us at:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Email:</strong> support@juriq.in</li>
                    <li><strong>Subject:</strong> Copyright Takedown Notice</li>
                </ul>
                <p>Your notice must include all of the following:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Your full name and contact information (email address and postal address);</li>
                    <li>A description of the copyrighted work you claim has been infringed;</li>
                    <li>A description of where on the Juriq platform the infringing content is located (with URL or sufficient detail to locate it);</li>
                    <li>A statement that you have a good faith belief that the use is not authorised by the copyright owner, its agent, or the law;</li>
                    <li>A statement that the information in your notice is accurate, and under penalty of perjury, that you are the copyright owner or authorised to act on the copyright owner's behalf;</li>
                    <li>Your signature (physical or electronic).</li>
                </ul>
                <p>
                    Incomplete notices may not be actioned. We will acknowledge receipt within <strong>48 hours</strong> and aim to resolve valid notices within <strong>14 business days</strong>.
                </p>
            </Section>

            <Section title="6. Counter-Notice Procedure">
                <p>
                    If you believe content was removed in error — for example, because it was your own original content, or because it falls within fair use or a statutory exception — you may submit a counter-notice to support@juriq.in with the following:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Your full name and contact information;</li>
                    <li>Identification of the content that was removed and its location before removal;</li>
                    <li>A statement under penalty of perjury that you have a good faith belief that the content was removed as a result of mistake or misidentification;</li>
                    <li>Your consent to the jurisdiction of the courts in Mumbai, Maharashtra, India.</li>
                </ul>
                <p>
                    Following a valid counter-notice, Juriq may restore the content unless the original complainant files a court action within a reasonable period.
                </p>
            </Section>

            <Section title="7. Repeat Infringers">
                <p>
                    Juriq has a policy of terminating the accounts of users who are repeat infringers of intellectual property rights. We reserve the right to deactivate or terminate the account of any user who has repeatedly posted infringing content.
                </p>
            </Section>

            <Section title="8. Governing Law">
                <p>
                    This Copyright and Takedown Policy is governed by the laws of India, including the Copyright Act, 1957 and the Information Technology Act, 2000. Disputes shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra, India.
                </p>
            </Section>

            <Section title="9. Contact">
                <p>
                    For intellectual property matters, takedown notices, or questions about this policy:<br />
                    <strong>Email:</strong> support@juriq.in<br />
                    <strong>Subject:</strong> Copyright — [Your Query]<br />
                    <strong>Response time:</strong> Within 48 hours for acknowledgment
                </p>
            </Section>

        </div>
    );

    if (isDashboard) {
        return (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Copyright &amp; Takedown Policy</h1>
                    <p className="text-xs text-muted-foreground">
                        Version {POLICY_VERSION} &mdash; Effective {EFFECTIVE_DATE}
                    </p>
                </div>
                <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm max-h-[calc(100vh-10rem)] overflow-y-auto">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <LandingLayout>
            <section className="lp-sec">
                <div className="lp-sec-inner !max-w-4xl">
                    <div className="lp-sec-hd lp-reveal" ref={r(0)}>
                        <p className="lp-sec-label">Legal Center</p>
                        <h1 className="lp-sec-title">Copyright &amp; Takedown Policy</h1>
                        <p className="lp-sec-sub">
                            Version {POLICY_VERSION} &mdash; Effective {EFFECTIVE_DATE}
                        </p>
                    </div>

                    <div className="lp-reveal" ref={r(1)}>
                        {content}
                    </div>
                </div>
            </section>

            <div className="lp-cta-wrap">
                <div className="lp-cta-card lp-reveal" ref={r(2)}>
                    <div className="lp-cta-glow" aria-hidden="true" />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="lp-hero-badge" style={{ margin: '0 auto 22px' }}>
                            <span className="lp-badge-dot" aria-hidden="true" />
                            Your content. Your rights.
                        </div>
                        <h2 className="lp-cta-title">Start Organizing Your<br />Legal Practice</h2>
                        <p className="lp-cta-sub">Juriq provides a structured digital system for managing cases, documents, and hearings. Built for Indian advocates.</p>
                        <div className="lp-cta-actions">
                            <button className="lp-btn lp-btn-gold-lg" onClick={() => go('/signup')}>Create Account <Ic.Arrow /></button>
                            <button className="lp-btn lp-btn-outline-lg" onClick={() => go('/login')}>Login</button>
                        </div>
                        <p className="lp-cta-note">Secure setup · Built for Indian advocates · DPDP-aligned</p>
                    </div>
                </div>
            </div>
        </LandingLayout>
    );
};

export default CopyrightPolicy;
