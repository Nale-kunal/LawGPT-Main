import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

const DataProcessing = () => {
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
            <Section title="1. Data Controller vs. Data Processor">
                <p>Under India's Digital Personal Data Protection Act, 2023 (DPDP Act) and international data protection standards:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>
                        <strong>You (the advocate / law firm) are the Data Fiduciary (Controller)</strong> for all case records, client data, documents, and legal matter information you enter into Juriq. You determine the purpose and means of processing this data.
                    </li>
                    <li>
                        <strong>Juriq is the Data Processor</strong> for this content. We process your data solely to provide the platform services you contracted for, strictly following your instructions and these terms.
                    </li>
                    <li>
                        <strong>Juriq is the independent Data Fiduciary (Controller)</strong> for your account data, authentication information, subscription records, and platform usage analytics.
                    </li>
                </ul>
            </Section>

            <Section title="2. Processing Purposes">
                <p>Juriq processes user-entered data exclusively for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Case Management:</strong> Storing, organizing, and enabling retrieval of legal matter records.</li>
                    <li><strong>Document Storage:</strong> Encrypting and storing uploaded legal documents within case-linked vaults.</li>
                    <li><strong>Hearing Scheduling:</strong> Powering the court calendar and hearing reminder system.</li>
                    <li><strong>Client Records:</strong> Maintaining your client registry within your private workspace.</li>
                    <li><strong>Legal Research:</strong> Enabling semantic search across Indian legal knowledge bases.</li>
                    <li><strong>Document Export:</strong> Generating structured PDF/Word exports of legal notes and templates.</li>
                    <li><strong>Security & Audit:</strong> Maintaining audit logs, detecting unauthorized access, and enforcing platform integrity.</li>
                </ul>
                <p className="font-semibold">We do not process your data for advertising, profiling, or sale to third parties.</p>
            </Section>

            <Section title="3. Sub-Processors">
                <p>We engage the following sub-processors to deliver the platform. All sub-processors are bound by contractual data protection obligations:</p>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse mt-2">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 pr-4 font-semibold">Sub-Processor</th>
                                <th className="text-left py-2 pr-4 font-semibold">Purpose</th>
                                <th className="text-left py-2 pr-4 font-semibold">Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border/50">
                                <td className="py-2 pr-4">MongoDB Atlas (MongoDB, Inc.)</td>
                                <td className="py-2 pr-4">Primary database (India region)</td>
                                <td className="py-2">India</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 pr-4">Razorpay Financial Solutions Pvt. Ltd.</td>
                                <td className="py-2 pr-4">Payment processing & subscriptions</td>
                                <td className="py-2">India</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 pr-4">Cloud Object Storage (India region)</td>
                                <td className="py-2 pr-4">Encrypted document vault storage</td>
                                <td className="py-2">India</td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4">Transactional Email Provider</td>
                                <td className="py-2 pr-4">Email delivery (verification, invoices)</td>
                                <td className="py-2">India / EU</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="4. Data Localisation">
                <p>
                    All primary data storage and processing for Juriq is performed on India-based infrastructure in compliance with applicable data localisation requirements under Indian law. We do not transfer personal data relating to Indian users to jurisdictions outside India for storage or primary processing, except where required by a specific sub-processor (transactional email delivery), which is governed by appropriate contractual safeguards.
                </p>
            </Section>

            <Section title="5. Technical Security Controls">
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Encryption in Transit:</strong> All data is transmitted over TLS 1.2+ encrypted connections. Plain HTTP is not accepted.</li>
                    <li><strong>Encryption at Rest:</strong> All database records and document vault files are encrypted at rest using AES-256.</li>
                    <li><strong>Access Control:</strong> Role-based access control (RBAC) restricts internal staff access to user data to strictly necessary operations.</li>
                    <li><strong>Authentication:</strong> JWT-based authentication with session versioning, bcrypt password hashing (cost factor 12), CSRF protection, and rate-limiting.</li>
                    <li><strong>Audit Logging:</strong> All significant platform events are logged with timestamps and user identifiers. Audit logs are retained for 2 years.</li>
                    <li><strong>Abuse Detection:</strong> Automated signals monitor for unusual login patterns, account takeover attempts, and API abuse.</li>
                    <li><strong>Vulnerability Management:</strong> Dependencies are audited for known vulnerabilities. Critical patches are applied without delay.</li>
                </ul>
            </Section>

            <Section title="6. Data Subject Rights">
                <p>You have the following rights regarding your personal data and the data you process through Juriq:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Access:</strong> Request a copy of data we hold about you via Settings → Privacy & Legal → Request Data Export.</li>
                    <li><strong>Correction:</strong> Update your profile and account data directly within the platform Settings.</li>
                    <li><strong>Erasure:</strong> Delete your account permanently via Settings → Account → Delete Account (30-day purge cycle).</li>
                    <li><strong>Portability:</strong> Request a machine-readable export of your data (JSON format) via Settings → Privacy & Legal.</li>
                    <li><strong>Restriction:</strong> Contact support@juriq.in to request processing restriction in specific circumstances.</li>
                    <li><strong>Objection:</strong> Contact support@juriq.in to object to processing based on legitimate interests.</li>
                </ul>
                <p>Rights requests are responded to within <strong>30 days</strong> of receipt.</p>
            </Section>

            <Section title="7. Data Breach Notification">
                <p>
                    In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, Juriq will notify you and, where required, the competent regulatory authority within <strong>72 hours</strong> of becoming aware of the breach. Notifications will describe the nature of the breach, categories of data affected, likely consequences, and measures taken or proposed.
                </p>
            </Section>

            <Section title="8. Retention and Deletion">
                <ul className="list-disc pl-6 space-y-2">
                    <li>User-entered content (cases, clients, documents) is deleted within <strong>30 days</strong> of account deletion.</li>
                    <li>Payment and invoice records are retained in anonymised form for <strong>7 years</strong> as required by Indian tax law.</li>
                    <li>Security audit logs are retained for <strong>2 years</strong>.</li>
                    <li>Backups are purged on a rolling cycle aligned with the above retention schedules.</li>
                </ul>
            </Section>

            <Section title="9. Contact">
                <p>
                    For data processing inquiries, rights requests, or to report a concern:<br />
                    <strong>Email:</strong> support@juriq.in<br />
                    <strong>Subject:</strong> Data Processing — [Your Query]
                </p>
            </Section>
        </div>
    );

    if (isDashboard) {
        return (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Data Processing Agreement</h1>
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
                        <p className="lp-sec-label">Compliance Center</p>
                        <h1 className="lp-sec-title">Data Processing Agreement</h1>
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
                            Transparent data handling, always
                        </div>
                        <h2 className="lp-cta-title">Start Organizing Your<br />Legal Practice</h2>
                        <p className="lp-cta-sub">Juriq provides a structured digital system for managing cases, documents, and hearings. Built with privacy-first architecture for Indian legal professionals.</p>
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

export default DataProcessing;
