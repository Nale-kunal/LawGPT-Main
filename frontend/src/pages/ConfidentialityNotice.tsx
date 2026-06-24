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

const ConfidentialityNotice = () => {
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

            <Section title="1. Juriq Does Not Create Attorney-Client Relationships">
                <p className="font-semibold border-l-4 border-destructive pl-4 py-2">
                    IMPORTANT: Use of the Juriq platform does not create an attorney-client relationship, advocate-client relationship, or any other professional-client relationship between Juriq and any user, or between Juriq and any client of an advocate using the platform. Juriq is a software tool. Only a qualified, enrolled advocate can enter into a professional relationship with a client.
                </p>
                <p>
                    All advocate-client relationships remain exclusively between the advocate and their client, governed by applicable professional conduct rules and the Advocates Act, 1961.
                </p>
            </Section>

            <Section title="2. Advocates Are the Data Controllers for Client Data">
                <p>
                    When you (an advocate or law firm staff member) enter client information, case records, documents, and legal matter details into Juriq, you are the <strong>Data Fiduciary (Controller)</strong> for that data under the Digital Personal Data Protection Act, 2023 (India).
                </p>
                <p>
                    Juriq acts as a <strong>Data Processor</strong> — processing client data only as instructed by you, and solely for the purpose of providing the platform's features. Juriq does not access, review, or process your client data for any purpose other than delivering the platform service.
                </p>
                <p>
                    You are solely responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Obtaining your client's informed consent to store their data on a cloud-based platform;</li>
                    <li>Ensuring that your use of Juriq complies with your professional confidentiality obligations under the Bar Council of India Rules and the Advocates Act, 1961;</li>
                    <li>Informing your clients about the use of cloud-based practice management software, where required by applicable professional conduct rules;</li>
                    <li>Ensuring that client data entered into Juriq is accurate and up to date.</li>
                </ul>
            </Section>

            <Section title="3. Privilege and Confidentiality Obligations">
                <p>
                    Attorney-client privilege, the duty of confidentiality, and all professional conduct obligations under Indian law remain the sole responsibility of the advocate. Juriq does not claim privilege over any communications or documents stored on the platform; privilege exists (or does not exist) as a matter of the underlying legal relationship between advocate and client.
                </p>
                <p>
                    Juriq implements security measures designed to protect data stored on the platform (see our <Link to={isDashboard ? "/dashboard/data-processing" : "/data-processing"} className="text-primary hover:underline">Data Processing Agreement</Link> and <Link to={isDashboard ? "/dashboard/privacy" : "/privacy"} className="text-primary hover:underline">Privacy Policy</Link>). However, no software system can guarantee absolute security. Advocates who have confidentiality concerns about specific highly sensitive matters should consult their Bar Council guidance on cloud storage.
                </p>
            </Section>

            <Section title="4. Community Forum — No Privilege">
                <p className="font-semibold">
                    Content posted in the Juriq Community forum is NOT privileged.
                </p>
                <p>
                    The Juriq Community is a shared discussion forum accessible to all registered platform members. Communications in the Community do not attract attorney-client privilege. You must never post:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Client names, identifiers, or identifying details;</li>
                    <li>Specific facts of an ongoing or concluded matter in a way that identifies the client or matter;</li>
                    <li>Any communication that is, or may be argued to be, privileged.</li>
                </ul>
                <p>
                    See our <Link to={isDashboard ? "/dashboard/community-guidelines" : "/community-guidelines"} className="text-primary hover:underline">Community Guidelines</Link> for full details on prohibited content.
                </p>
            </Section>

            <Section title="5. Juriq Support Interactions">
                <p>
                    When you contact Juriq's support team for technical assistance, any information you share is handled under our <Link to={isDashboard ? "/dashboard/privacy" : "/privacy"} className="text-primary hover:underline">Privacy Policy</Link>. Support interactions do not create privileged communications between you and Juriq.
                </p>
                <p>
                    When requesting technical support, please avoid sharing client-identifiable information or privileged communications. Juriq support staff are not legal professionals and are not bound by advocate-client privilege.
                </p>
            </Section>

            <Section title="6. Data Export and Transfer">
                <p>
                    Advocates may export their data from the Juriq platform at any time via Settings → Privacy &amp; Legal → Request Data Export. When sharing exported data with clients or third parties, you remain responsible for complying with your confidentiality obligations.
                </p>
            </Section>

            <Section title="7. Account Deletion and Data Retention">
                <p>
                    When you delete your Juriq account, all case records, client data, and documents are permanently purged within <strong>30 days</strong>. After this period, Juriq will no longer hold any client data attributable to your account. See our <Link to={isDashboard ? "/dashboard/privacy" : "/privacy"} className="text-primary hover:underline">Privacy Policy</Link> for the full data retention schedule.
                </p>
                <p>
                    Before deleting your account, you are responsible for exporting and retaining any client records required by applicable law or Bar Council rules.
                </p>
            </Section>

            <Section title="8. Contact">
                <p>
                    For questions about data processing, client data handling, or confidentiality-related concerns:<br />
                    <strong>Email:</strong> support@juriq.in<br />
                    <strong>Subject:</strong> Confidentiality Notice — [Your Query]
                </p>
            </Section>

        </div>
    );

    if (isDashboard) {
        return (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Attorney-Client Confidentiality Notice</h1>
                    <p className="text-xs text-muted-foreground">
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
                        <p className="lp-sec-label">Legal Center</p>
                        <h1 className="lp-sec-title">Attorney-Client Confidentiality Notice</h1>
                        <p className="lp-sec-sub">
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
                            Client confidentiality is your responsibility — we protect the platform
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

export default ConfidentialityNotice;
