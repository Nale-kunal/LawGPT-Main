import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';

const GUIDELINES_VERSION = '1.0';
const EFFECTIVE_DATE = '1 June 2026';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
        <h2 className="lp-title-lg text-xl! mb-4">{title}</h2>
        <div className="lp-text-p space-y-3">{children}</div>
    </section>
);

const CommunityGuidelines = () => {
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
            <Section title="1. Purpose of the Juriq Community">
                <p>
                    The Juriq Community is a discussion forum within the Juriq platform designed exclusively for enrolled advocates, law firm staff, and legal professionals. Its purpose is to facilitate peer knowledge sharing, professional discussions, and platform support among legal practitioners.
                </p>
                <p className="font-semibold border-l-4 border-primary pl-4 py-1">
                    IMPORTANT: The Juriq Community is NOT a legal advice forum. No post, comment, or discussion in this forum constitutes legal advice. Juriq is a software platform, not a law firm. Advocates must not use this forum to provide legal advice to non-members or to solicit clients.
                </p>
            </Section>

            <Section title="2. Who May Participate">
                <p>Only registered Juriq account holders may access and post in the Community. By posting in the Community, you confirm that you:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Are a registered Juriq user;</li>
                    <li>Are an enrolled advocate, legal professional, or authorized law firm staff member;</li>
                    <li>Will comply with these Community Guidelines and the Juriq <Link to={isDashboard ? "/dashboard/terms" : "/terms"} className="text-primary hover:underline">Terms of Service</Link>;</li>
                    <li>Understand that all posts are subject to moderation.</li>
                </ul>
            </Section>

            <Section title="3. Acceptable Conduct">
                <p>We encourage the following in the Juriq Community:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Professional discussion</strong> of legal practice management, court procedures, technology tools, and professional development;</li>
                    <li><strong>Peer knowledge sharing</strong> about Indian law, procedural updates, and landmark judgments at a general educational level;</li>
                    <li><strong>Platform support</strong> — questions about using Juriq features, workflows, and settings;</li>
                    <li><strong>Constructive feedback</strong> on platform features and legal workspace tools;</li>
                    <li><strong>Respectful, professional discourse</strong> that upholds the dignity of the legal profession.</li>
                </ul>
            </Section>

            <Section title="4. Prohibited Content and Conduct">
                <p>The following are strictly prohibited and will result in post removal and possible account suspension:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Client-identifiable information:</strong> Do not post any content that identifies a specific client, their matter, or any privileged communications. Client confidentiality obligations under the Bar Council of India Rules apply at all times, including on this platform.</li>
                    <li><strong>Legal advice to non-members:</strong> Do not use this forum to provide legal advice to individuals who are not legal professionals or platform members.</li>
                    <li><strong>Case-specific confidential information:</strong> Do not post details of ongoing litigation, sealed orders, or any court-ordered confidential matter.</li>
                    <li><strong>Advertising and solicitation:</strong> Do not advertise legal services, solicit clients, promote third-party products, or post unsolicited promotional content.</li>
                    <li><strong>Harassment and discrimination:</strong> Do not post content that is harassing, threatening, abusive, defamatory, or discriminatory on any grounds.</li>
                    <li><strong>Misinformation:</strong> Do not deliberately post inaccurate legal information or misrepresent the state of the law.</li>
                    <li><strong>Copyright infringement:</strong> Do not reproduce copyrighted legal texts, judgments (where reproduction is restricted), or third-party publications without permission. See our <Link to={isDashboard ? "/dashboard/copyright-policy" : "/copyright-policy"} className="text-primary hover:underline">Copyright Policy</Link>.</li>
                    <li><strong>Spam and flooding:</strong> Do not post repetitive, low-quality, or irrelevant content.</li>
                    <li><strong>Personal attacks:</strong> Critique ideas, not individuals. Do not target or attack specific members personally.</li>
                    <li><strong>Impersonation:</strong> Do not impersonate any person, organization, or legal entity.</li>
                </ul>
            </Section>

            <Section title="5. Attorney-Client Privilege — Special Warning">
                <p>
                    The Juriq Community is a <strong>shared platform</strong>. Posts in the Community are visible to all platform members. You must never post information that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Reveals the identity or details of a client without their explicit written consent;</li>
                    <li>Describes facts of a specific matter in a way that could identify the client or the matter;</li>
                    <li>Includes any communication that is, or could be argued to be, subject to attorney-client privilege.</li>
                </ul>
                <p>
                    Posting privileged or client-identifiable information in the Community may constitute a breach of professional conduct rules under the Advocates Act, 1961 and the Bar Council of India Rules. Juriq is not responsible for any professional consequences arising from such disclosures.
                </p>
            </Section>

            <Section title="6. Moderation">
                <p>The Juriq moderation team reserves the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Remove any post or comment that violates these Guidelines, without prior notice;</li>
                    <li>Issue warnings to users who repeatedly violate Guidelines;</li>
                    <li>Suspend or permanently revoke Community access for serious or repeated violations;</li>
                    <li>Report conduct to the Bar Council of India where a violation appears to constitute professional misconduct.</li>
                </ul>
                <p>Moderation decisions are made at Juriq's sole discretion. We aim to be consistent and fair, but we do not guarantee that all content will be reviewed in real time.</p>
            </Section>

            <Section title="7. Reporting Violations">
                <p>
                    If you encounter content that violates these Guidelines, please use the <strong>Report</strong> button on the relevant post. You may also email <strong>support@juriq.in</strong> with the subject line "Community Report — [brief description]".
                </p>
                <p>Reports are reviewed within 48 hours of receipt. We will not disclose the identity of the reporter to the reported party.</p>
            </Section>

            <Section title="8. Intellectual Property in Community Posts">
                <p>
                    By posting in the Juriq Community, you grant Juriq a non-exclusive, royalty-free licence to display your post to other platform members within the Community. You retain ownership of your original content. You must not post content that infringes third-party intellectual property rights.
                </p>
            </Section>

            <Section title="9. No Legal Advice — Platform Disclaimer">
                <p>
                    Nothing posted in the Juriq Community constitutes legal advice. Any general legal information shared by community members is for educational purposes only and does not constitute a solicitor-client or advocate-client relationship. Always exercise independent professional judgment.
                </p>
            </Section>

            <Section title="10. Updates to These Guidelines">
                <p>
                    We may update these Community Guidelines from time to time. When we do, we will update the version number and effective date above and notify registered users via the platform. Continued use of the Community after the effective date constitutes acceptance of the updated Guidelines.
                </p>
            </Section>

            <Section title="11. Contact">
                <p>
                    For questions about these Guidelines or to report a violation:<br />
                    <strong>Email:</strong> support@juriq.in<br />
                    <strong>Subject:</strong> Community Guidelines — [Your Query]
                </p>
            </Section>
        </div>
    );

    if (isDashboard) {
        return (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Community Guidelines</h1>
                    <p className="text-xs text-muted-foreground">
                        Version {GUIDELINES_VERSION} &mdash; Effective {EFFECTIVE_DATE}
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
                        <p className="lp-sec-label">Community</p>
                        <h1 className="lp-sec-title">Community Guidelines</h1>
                        <p className="lp-sec-sub">
                            Version {GUIDELINES_VERSION} &mdash; Effective {EFFECTIVE_DATE}
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
                            A professional community for Indian advocates
                        </div>
                        <h2 className="lp-cta-title">Join the Juriq<br />Legal Community</h2>
                        <p className="lp-cta-sub">Connect with peers, share knowledge, and build a smarter legal practice together.</p>
                        <div className="lp-cta-actions">
                            <button className="lp-btn lp-btn-gold-lg" onClick={() => go('/signup')}>Create Account <Ic.Arrow /></button>
                            <button className="lp-btn lp-btn-outline-lg" onClick={() => go('/login')}>Login</button>
                        </div>
                        <p className="lp-cta-note">Free to join · Exclusively for legal professionals · Built for Indian advocates</p>
                    </div>
                </div>
            </div>
        </LandingLayout>
    );
};

export default CommunityGuidelines;
