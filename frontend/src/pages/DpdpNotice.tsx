import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';

const NOTICE_VERSION = '1.0';
const EFFECTIVE_DATE = '1 June 2026';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
        <h2 className="lp-title-lg text-xl! mb-4">{title}</h2>
        <div className="lp-text-p space-y-3">{children}</div>
    </section>
);

const DpdpNotice = () => {
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

            <Section title="1. Purpose of This Notice">
                <p>
                    This DPDP Privacy Notice is provided in compliance with the Digital Personal Data Protection Act, 2023 (<strong>"DPDP Act"</strong>) of India. It supplements our full <Link to={isDashboard ? "/dashboard/privacy" : "/privacy"} className="text-primary hover:underline">Privacy Policy</Link> and is directed specifically at your rights as a <strong>Data Principal</strong> (the individual whose personal data is processed) under the DPDP Act.
                </p>
            </Section>

            <Section title="2. Data Fiduciary Identity">
                <p>
                    The <strong>Data Fiduciary</strong> (the entity responsible for determining the purpose and means of processing your personal data) for this platform is:
                </p>
                <ul className="list-none pl-0 space-y-1">
                    <li><strong>Entity Name:</strong> Juriq</li>
                    <li><strong>Platform:</strong> juriq.app</li>
                    <li><strong>Contact:</strong> support@juriq.in</li>
                    <li><strong>Grievance Officer:</strong> grievance@juriq.in</li>
                </ul>
            </Section>

            <Section title="3. Categories of Personal Data Processed">
                <p>We process the following categories of personal data under the DPDP Act:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Identity Data:</strong> Full name, professional email address, role (advocate/assistant), Bar Council enrolment number.</li>
                    <li><strong>Contact Data:</strong> Email address, phone number, law firm name, city, state.</li>
                    <li><strong>Credential Data:</strong> Authentication credentials stored as bcrypt hashes (irreversible — Juriq cannot read your password).</li>
                    <li><strong>Professional Data:</strong> Practice areas, court levels, address, and professional profile data entered during onboarding.</li>
                    <li><strong>Transaction Data:</strong> Subscription plan type, Razorpay Customer ID, billing cycle. Raw payment card or UPI details are never stored by Juriq.</li>
                    <li><strong>Usage Data:</strong> Login timestamps, IP addresses, browser user-agent, platform activity logs.</li>
                    <li><strong>Consent Records:</strong> Records of your legal consents including policy version, date, time, IP address, and cryptographic policy hash.</li>
                    <li><strong>User-Entered Content:</strong> Case records, client data, documents, notes, and hearing records entered by you into the platform. You are the Data Fiduciary (Controller) for this content — Juriq processes it only as your Data Processor.</li>
                </ul>
            </Section>

            <Section title="4. Purposes of Processing">
                <p>Juriq processes personal data for the following purposes, each of which has a clear lawful basis:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Account provision and contract performance:</strong> Providing the platform services you subscribed to, including case management, document storage, calendar, and legal research features.</li>
                    <li><strong>Payment processing:</strong> Managing your subscription via Razorpay, billing, and invoice generation.</li>
                    <li><strong>Transactional communications:</strong> Sending account verification emails, password reset emails, payment confirmations, and hearing reminders. These are strictly service-related and cannot be disabled.</li>
                    <li><strong>Security and fraud prevention:</strong> Detecting unauthorized access, account abuse, and platform integrity threats.</li>
                    <li><strong>Legal compliance:</strong> Retaining payment and audit records as required by applicable Indian law.</li>
                    <li><strong>Marketing communications (consent-based only):</strong> Sending product updates, newsletters, or feature announcements — only if you have explicitly opted in. You may opt out at any time in Settings → Privacy &amp; Legal.</li>
                </ul>
            </Section>

            <Section title="5. Lawful Basis for Processing">
                <p>Under the DPDP Act, processing is lawful where it is based on:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Consent (Section 6):</strong> You have provided free, specific, informed, and unambiguous consent at account registration by checking the Terms and Privacy Policy checkboxes. Consent is recorded with a timestamp, IP address, policy version, and cryptographic hash.</li>
                    <li><strong>Legitimate Use (Section 7):</strong> Processing necessary for the performance of a contract to which you are a party (providing the platform service), and processing required by applicable law (retention of financial records).</li>
                </ul>
            </Section>

            <Section title="6. Your Rights as a Data Principal">
                <p>Under the DPDP Act, 2023, you have the following rights:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>
                        <strong>Right to Access Information (Section 11):</strong> You may request a summary of the personal data we hold about you and the processing activities we carry out. Contact: <strong>support@juriq.in</strong> with subject "DPDP Access Request". Alternatively, use Settings → Privacy &amp; Legal → Request Data Export for a machine-readable copy.
                    </li>
                    <li>
                        <strong>Right to Correction and Erasure (Section 12):</strong> You may correct inaccurate personal data directly in your Settings. You may request erasure of your personal data by deleting your account (Settings → Account → Delete Account). All personal data is permanently purged within 30 days of account deletion.
                    </li>
                    <li>
                        <strong>Right to Grievance Redressal (Section 13):</strong> You may file a grievance with our Grievance Officer at <strong>grievance@juriq.in</strong>. We will acknowledge your grievance within 48 hours and resolve it within 14 business days. See our <Link to={isDashboard ? "/dashboard/grievance" : "/grievance"} className="text-primary hover:underline">Grievance Redressal Center</Link> for details.
                    </li>
                    <li>
                        <strong>Right to Nominate (Section 14):</strong> You may nominate another individual to exercise your data rights in the event of your death or incapacity. Contact support@juriq.in to register a nominee.
                    </li>
                    <li>
                        <strong>Right to Withdraw Consent (Section 6(4)):</strong> You may withdraw your consent to processing at any time by deleting your account. Withdrawal of consent does not affect the lawfulness of processing carried out before withdrawal.
                    </li>
                </ul>
                <p>
                    All rights requests are responded to within <strong>30 days</strong> of receipt.
                </p>
            </Section>

            <Section title="7. Consent Records and Audit Trail">
                <p>
                    Juriq maintains a complete, cryptographically-secured record of your consent including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>The exact policy version accepted (e.g., Terms of Service v1.0, Privacy Policy v1.0);</li>
                    <li>The date and time of acceptance (UTC timestamp);</li>
                    <li>The IP address from which consent was given;</li>
                    <li>The browser user-agent at time of consent;</li>
                    <li>A SHA-256 cryptographic hash of the policy text accepted.</li>
                </ul>
                <p>
                    You can view your consent history in Settings → Privacy &amp; Legal → My Consent Records.
                </p>
            </Section>

            <Section title="8. Data Localisation">
                <p>
                    All primary personal data is stored and processed on India-based infrastructure (MongoDB Atlas, India region). We do not transfer personal data outside India for primary storage. Transactional email delivery may involve temporary processing outside India by our email service provider, governed by appropriate contractual safeguards.
                </p>
            </Section>

            <Section title="9. Data Retention">
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Active account data:</strong> Retained for the duration of your account.</li>
                    <li><strong>Deleted account data:</strong> Purged within <strong>30 days</strong> of account deletion.</li>
                    <li><strong>Payment and invoice records:</strong> Retained in anonymised form for <strong>7 years</strong> as required by Indian taxation and accounting law.</li>
                    <li><strong>Audit and security logs:</strong> Retained for <strong>2 years</strong>.</li>
                    <li><strong>Consent records:</strong> Retained for a minimum of <strong>3 years</strong> after account deletion for regulatory compliance purposes.</li>
                </ul>
            </Section>

            <Section title="10. Data Breach Notification">
                <p>
                    In the event of a personal data breach that is likely to result in harm to you, Juriq will notify you and, where required, the Data Protection Board of India within <strong>72 hours</strong> of becoming aware of the breach. Notifications will include the nature of the breach, categories of data affected, likely consequences, and remedial measures taken.
                </p>
            </Section>

            <Section title="11. Appeal to the Data Protection Board">
                <p>
                    If you are not satisfied with the resolution of your grievance by our Grievance Officer after 30 days of filing, you may appeal to the <strong>Data Protection Board of India</strong> established under Section 18 of the DPDP Act, 2023.
                </p>
            </Section>

            <Section title="12. Contact">
                <p>
                    For all DPDP Act-related queries, rights requests, or grievances:<br />
                    <strong>Email (General):</strong> support@juriq.in<br />
                    <strong>Email (Grievance Officer):</strong> grievance@juriq.in<br />
                    <strong>Subject:</strong> DPDP Rights Request — [Your Query]<br />
                    <strong>Response time:</strong> Acknowledgment within 48 hours · Resolution within 30 days
                </p>
            </Section>

        </div>
    );

    if (isDashboard) {
        return (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">DPDP Privacy Notice</h1>
                    <p className="text-xs text-muted-foreground">
                        Digital Personal Data Protection Act, 2023 (India)<br />
                        Version {NOTICE_VERSION} &mdash; Effective {EFFECTIVE_DATE}
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
                        <p className="lp-sec-label">Compliance Center</p>
                        <h1 className="lp-sec-title">DPDP Privacy Notice</h1>
                        <p className="lp-sec-sub">
                            Digital Personal Data Protection Act, 2023 (India)<br />
                            Version {NOTICE_VERSION} &mdash; Effective {EFFECTIVE_DATE}
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
                            DPDP Act 2023-aligned · Privacy-first
                        </div>
                        <h2 className="lp-cta-title">Start Organizing Your<br />Legal Practice</h2>
                        <p className="lp-cta-sub">Juriq provides a structured digital system for managing cases, documents, and hearings. Built with DPDP-compliant privacy architecture for Indian legal professionals.</p>
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

export default DpdpNotice;
