import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';

const DISCLAIMER_VERSION = '1.0';
const EFFECTIVE_DATE = '1 June 2026';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
        <h2 className="lp-title-lg text-xl! mb-4">{title}</h2>
        <div className="lp-text-p space-y-3">{children}</div>
    </section>
);

const LegalDisclaimer = () => {
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

            <Section title="1. Platform Nature — Juriq is Not a Law Firm">
                <p className="font-semibold border-l-4 border-destructive pl-4 py-2">
                    IMPORTANT: Juriq is a legal practice management software-as-a-service (SaaS) platform. Juriq is NOT a law firm, NOT a legal practitioner, NOT a legal service provider, and NOT a legal advisor of any kind under the Advocates Act, 1961 or any other applicable law.
                </p>
                <p>
                    Juriq provides software tools to help enrolled advocates and legal professionals organize their practice. Use of the Juriq platform does not create any attorney-client, advocate-client, solicitor-client, or any other professional-client relationship between Juriq and any user or any third party.
                </p>
                <p>
                    Juriq is not regulated by the Bar Council of India and does not hold any license to practice law in India or any other jurisdiction.
                </p>
            </Section>

            <Section title="2. No Legal Advice">
                <p>
                    Nothing on the Juriq platform, including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>any feature, tool, or function of the platform;</li>
                    <li>any AI-generated research summary, case analysis, document draft, or recommendation;</li>
                    <li>any content in the Juriq Community forum;</li>
                    <li>any communication from Juriq's support team regarding use of the platform;</li>
                </ul>
                <p>
                    constitutes, or should be relied upon as, <strong>legal advice</strong>. The information available through the platform is provided for general informational and organizational purposes only.
                </p>
                <p>
                    Advocates using the Juriq platform are solely responsible for all legal judgments, client advice, legal strategy, court filings, and compliance with their professional obligations under the Advocates Act, 1961 and the Bar Council of India Rules of Professional Conduct.
                </p>
            </Section>

            <Section title="3. AI-Generated Content Disclaimer">
                <p>
                    Juriq provides AI-powered tools including legal research assistance and document generation. These tools are designed to assist qualified legal professionals, not to replace professional judgment.
                </p>
                <p className="font-semibold">
                    AI-generated content on Juriq:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>May contain errors, inaccuracies, or outdated information;</li>
                    <li>Does not constitute legal advice and should never be relied upon as such;</li>
                    <li>Must be independently verified by a qualified legal professional before use in any legal matter;</li>
                    <li>Should not be submitted to any court, tribunal, or authority without independent review and endorsement by the advocate;</li>
                    <li>Does not reflect the official position of any court, tribunal, or regulatory body.</li>
                </ul>
                <p>
                    Juriq does not warrant the accuracy, completeness, or fitness for purpose of any AI-generated output. You assume full professional and legal responsibility for how you use and present AI-generated content.
                </p>
            </Section>

            <Section title="4. Accuracy of Legal Information">
                <p>
                    Juriq's legal research database contains information about Indian statutes, regulations, and case law sourced from publicly available repositories. While we strive for accuracy, laws are amended frequently, and Juriq makes no warranty that the information in the legal research database is current, complete, or accurate.
                </p>
                <p>
                    Users are strongly advised to verify any statutory or case law information against official sources, including the Ministry of Law and Justice (India), the Supreme Court of India's official website, and relevant High Court websites.
                </p>
            </Section>

            <Section title="5. No Warranty">
                <p>
                    The Juriq platform is provided on an "as is" and "as available" basis without any warranty of any kind, express or implied, including without limitation any warranty of merchantability, fitness for a particular purpose, or non-infringement.
                </p>
                <p>
                    Juriq does not warrant that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>the platform will be available at all times, uninterrupted, or error-free;</li>
                    <li>any errors or defects will be corrected;</li>
                    <li>the platform or the server that makes it available are free of viruses or other harmful components;</li>
                    <li>any data stored on the platform will not be lost in the event of a technical failure.</li>
                </ul>
            </Section>

            <Section title="6. Limitation of Liability">
                <p>
                    To the fullest extent permitted by applicable Indian law, Juriq and its officers, directors, employees, and agents shall not be liable for any:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>indirect, incidental, special, consequential, or punitive damages;</li>
                    <li>loss of data, profits, goodwill, or business opportunity;</li>
                    <li>professional consequences, disciplinary action, or adverse judicial outcomes arising from your use or reliance on any content or tool provided by the Juriq platform;</li>
                    <li>unauthorized access to your account or data by third parties.</li>
                </ul>
                <p>
                    Our total aggregate liability for any claim arising from these Terms or your use of the platform shall not exceed the total subscription fees paid by you in the <strong>3 months</strong> preceding the claim.
                </p>
            </Section>

            <Section title="7. Third-Party Links and Content">
                <p>
                    The Juriq platform may contain links to third-party websites or resources. These links are provided for convenience only. Juriq has no control over third-party content and does not endorse or warrant the accuracy of any third-party materials. You access third-party links at your own risk.
                </p>
            </Section>

            <Section title="8. Advocate's Professional Responsibility">
                <p>
                    Nothing in these disclaimers limits or diminishes an advocate's professional obligations under the Advocates Act, 1961, the Bar Council of India Rules of Professional Conduct and Etiquette, or any applicable court rules. Advocates remain solely responsible for their professional conduct, the quality of their legal services, and compliance with all applicable professional regulations.
                </p>
            </Section>

            <Section title="9. Governing Law">
                <p>
                    This Legal Disclaimer is governed by the laws of the Republic of India. Any dispute arising in connection with this Disclaimer shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra, India.
                </p>
            </Section>

            <Section title="10. Contact">
                <p>
                    For questions about this Legal Disclaimer:<br />
                    <strong>Email:</strong> support@juriq.in<br />
                    <strong>Subject:</strong> Legal Disclaimer — [Your Query]
                </p>
            </Section>

        </div>
    );

    if (isDashboard) {
        return (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Legal Disclaimer</h1>
                    <p className="text-xs text-muted-foreground">
                        Version {DISCLAIMER_VERSION} &mdash; Effective {EFFECTIVE_DATE}
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
                        <h1 className="lp-sec-title">Legal Disclaimer</h1>
                        <p className="lp-sec-sub">
                            Version {DISCLAIMER_VERSION} &mdash; Effective {EFFECTIVE_DATE}
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
                            Built for legal professionals, by legal professionals
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

export default LegalDisclaimer;
