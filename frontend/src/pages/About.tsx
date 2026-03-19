import { useEffect, useRef } from 'react';
import { Ic } from '@/components/landing/LandingIcons';
import LandingLayout from '@/components/layout/LandingLayout';

const About = () => {
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

    return (
        <LandingLayout>
            {/* ══ THE CHALLENGE ═══════════════════════════════════════════════════════ */}
            <section className="lp-sec" id="problem" aria-labelledby="prob-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(40)}>
                        <p className="lp-sec-label">The Challenge</p>
                        <h2 id="prob-heading" className="lp-sec-title">Legal Practice Should Not Be Chaotic</h2>
                        <p className="lp-sec-sub">Many advocates manage legal work using a mix of spreadsheets, paper files, and scattered folders. As caseloads grow, this becomes increasingly difficult to maintain.</p>
                    </div>
                    <div className="lp-problem-grid lp-reveal" ref={r(41)}>
                        {[
                            { label: 'Scattered Documents', sub: 'Case files spread across folders, drives, and email attachments with no central system.' },
                            { label: 'Missed Hearings', sub: 'No unified calendar means hearing dates are tracked manually, risking costly oversights.' },
                            { label: 'Multiple Case Chaos', sub: 'Managing 20+ active cases simultaneously without structured tracking is error-prone.' },
                            { label: 'Unstructured Research', sub: 'Legal notes and research saved in notebooks or random documents that are hard to retrieve.' },
                            { label: 'Disorganized Clients', sub: 'Client contact details and matter history stored inconsistently across different tools.' },
                        ].map(p => (
                            <div key={p.label} className="lp-problem-card">
                                <div className="lp-problem-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </div>
                                <div className="lp-title-md">{p.label}</div>
                                <div className="lp-text-sm" style={{ color: 'var(--lp-subtle)' }}>{p.sub}</div>
                            </div>
                        ))}
                    </div>
                    <div className="lp-problem-solution lp-reveal" ref={r(42)}>
                        <div className="lp-problem-solution-icon"><Ic.Scale /></div>
                        <div className="lp-text-p"><strong>LegalPro</strong> introduces a structured digital system built specifically for legal practice, replacing scattered tools with one organized workspace.</div>
                    </div>
                </div>
            </section>

            {/* ══ WHY LEGALPRO ═══════════════════════════════════════════════════════ */}
            <section className="lp-sec lp-sec-alt" id="why" aria-labelledby="why-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(22)}>
                        <p className="lp-sec-label">Why LegalPro</p>
                        <h2 id="why-heading" className="lp-sec-title">
                            Designed the way lawyers<br />actually think
                        </h2>
                    </div>
                    <div className="lp-why-grid lp-reveal" ref={r(23)}>
                        {[
                            {
                                Icon: Ic.Layers,
                                title: 'Organize Complex Legal Work',
                                desc: 'Cases have moving parts — hearings, deadlines, clients, documents, notes. LegalPro gives every piece a structured home so nothing falls through the cracks.',
                                bullets: ['Linked documents & evidence', 'Hearing timeline tracking', 'Multi-party case support'],
                            },
                            {
                                Icon: Ic.Zap,
                                title: 'AI Assisted Legal Thinking',
                                desc: 'From Indian statute lookup to note structuring and case summarization, LegalPro\'s AI layer reduces research time and helps you build stronger arguments, faster.',
                                bullets: ['Indian case law references', 'Instant legal summaries', 'AI-powered note drafting'],
                            },
                            {
                                Icon: Ic.Star,
                                title: 'Built for Professional Law Firms',
                                desc: 'Every pixel and every feature is designed for the real demands of Indian legal practice — not adapted from generic project management software.',
                                bullets: ['Multi-user firm accounts', 'Conflict detection', 'Professional PDF exports'],
                            },
                        ].map(({ Icon, title, desc, bullets }) => (
                            <div key={title} className="lp-why-card">
                                <div className="lp-why-icon"><Icon size={20} /></div>
                                <div className="lp-title-md" style={{ marginBottom: 12 }}>{title}</div>
                                <div className="lp-text-p" style={{ marginBottom: 20 }}>{desc}</div>
                                <div className="lp-why-bullets">
                                    {bullets.map(b => (
                                        <div key={b} className="lp-why-bullet">
                                            <span className="lp-why-bullet-check"><Ic.Check /></span>
                                            {b}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ AUDIENCE ═══════════════════════════════════════════════════════════ */}
            <section className="lp-sec" id="audience" aria-labelledby="aud-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(58)}>
                        <p className="lp-sec-label">Who It Is For</p>
                        <h2 id="aud-heading" className="lp-sec-title">Designed for Legal Professionals</h2>
                        <p className="lp-sec-sub">Built specifically for the needs of individual advocates and independent legal consultants.</p>
                    </div>
                    <div className="lp-audience-grid lp-reveal" ref={r(59)}>
                        <div className="lp-audience-card">
                            <div className="lp-audience-icon"><Ic.UserCheck /></div>
                            <div className="lp-audience-role">Primary Audience</div>
                            <div className="lp-title-md" style={{ marginBottom: 8 }}>Solo Advocates</div>
                            <div className="lp-text-sm">Individual advocates managing multiple cases across different courts. LegalPro gives you a single organized system for your entire practice.</div>
                        </div>
                        <div className="lp-audience-card">
                            <div className="lp-audience-icon"><Ic.Briefcase /></div>
                            <div className="lp-audience-role">Consultants</div>
                            <div className="lp-title-md" style={{ marginBottom: 8 }}>Independent Legal Consultants</div>
                            <div className="lp-text-sm">Legal consultants handling multiple client matters simultaneously. Track each matter independently within one organized workspace.</div>
                        </div>
                        <div className="lp-audience-card">
                            <div className="lp-audience-icon"><Ic.Star /></div>
                            <div className="lp-audience-role">New Practitioners</div>
                            <div className="lp-title-md" style={{ marginBottom: 8 }}>Young Lawyers Starting Practice</div>
                            <div className="lp-text-sm">Build professional legal workflows from day one. LegalPro gives you the structure to run a disciplined practice from the start.</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ DESIGN PHILOSOPHY ═══════════════════════════════════════════════════ */}
            <section className="lp-sec lp-sec-alt" id="philosophy" aria-labelledby="phil-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(60)}>
                        <p className="lp-sec-label">Design Philosophy</p>
                        <h2 id="phil-heading" className="lp-sec-title">Designed for Legal Precision</h2>
                        <p className="lp-sec-sub">LegalPro is not a generic productivity tool repurposed for law. It is built specifically for legal workflows, with every feature designed around how advocates actually work.</p>
                    </div>
                    <div className="lp-philosophy-list lp-reveal" ref={r(61)}>
                        {[
                            { t: 'Case-Based Organization', s: 'Every piece of information, documents, notes, hearings, clients, is organized within the case it belongs to.' },
                            { t: 'Hearing-Driven Workflow', s: 'Hearings are the heartbeat of legal practice. The entire system is designed to help you never miss one.' },
                            { t: 'Structured Legal Documentation', s: 'Notes, research, and strategy documents follow a structured format designed for legal professionals.' },
                            { t: 'Secure Case Records', s: 'Case data is treated as confidential by design. Access is controlled, logged, and protected at every layer.' },
                        ].map(({ t, s }) => (
                            <div key={t} className="lp-philosophy-item">
                                <div className="lp-philosophy-check"><Ic.Check /></div>
                                <div><div className="lp-title-md" style={{ marginBottom: 2 }}>{t}</div><div className="lp-text-sm">{s}</div></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ REVIEWS / TESTIMONIALS ══════════════════════════════════════════════ */}
            <section className="lp-sec lp-proof-bg" id="reviews">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(30)}>
                        <p className="lp-sec-label">From the Community</p>
                        <h2 className="lp-sec-title">Built for Legal Professionals</h2>
                    </div>
                    <div className="lp-reveal" ref={r(31)} style={{ display: 'flex', justifyContent: 'center' }}>
                        <div className="lp-proof-card" style={{ maxWidth: 680, width: '100%', textAlign: 'center', borderRadius: 'var(--lp-r)' }}>
                            <div className="lp-text-p" style={{ lineHeight: 1.8, marginBottom: 0 }}>
                                LegalPro is currently evolving with feedback from legal professionals to build a modern case management system tailored for Indian advocates.
                                <br /><br />
                                Real user testimonials will appear here as the platform grows.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ TRANSPARENCY ════════════════════════════════════════════════════════ */}
            <section className="lp-sec lp-sec-alt" id="transparency" aria-labelledby="trans-heading">
                <div className="lp-sec-inner">
                    <div className="lp-transparency-box lp-reveal" ref={r(66)}>
                        <div>
                            <h2 id="trans-heading" className="lp-sec-title" style={{ color: 'var(--lp-primary)' }}>Transparent Product Development</h2>
                            <p className="lp-text-p">LegalPro focuses on building practical tools that help advocates manage legal work reliably. Artificial intelligence capabilities are currently under development and will be released in future updates. All AI features require your professional review before use.</p>
                        </div>
                        <div className="lp-transparency-tags">
                            {['Production-grade authentication', 'No fabricated statistics', 'AI features clearly labeled', 'Honest capability descriptions'].map(tag => (
                                <div key={tag} className="lp-transparency-tag"><span className="lp-transparency-tag-dot" />{tag}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ ROADMAP ═════════════════════════════════════════════════════════════ */}
            <section className="lp-sec" id="roadmap" aria-labelledby="road-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(64)}>
                        <p className="lp-sec-label">Roadmap</p>
                        <h2 id="road-heading" className="lp-sec-title">What is Coming Next</h2>
                        <p className="lp-sec-sub">LegalPro will continue expanding with new capabilities. The following features are currently in development and will be released in future updates.</p>
                    </div>
                    <div className="lp-roadmap-items lp-reveal" ref={r(65)}>
                        {[
                            { t: 'AI-Powered Case Summaries', d: 'Automatically generate structured summaries of case history, hearings, and notes.' },
                            { t: 'AI-Assisted Legal Research', d: 'Intelligent search and analysis across legal references and case materials.' },
                            { t: 'AI Drafting Assistance', d: 'Draft legal correspondence and internal notes with AI-assisted writing tools.' },
                            { t: 'Multi-User Law Firm Collaboration', d: 'Shared workspaces for small law firms with role-based access per user.' },
                            { t: 'Advanced Practice Analytics', d: 'Insights into case outcomes, hearing frequency, and practice performance over time.' },
                        ].map(({ t, d }) => (
                            <div key={t} className="lp-roadmap-item">
                                <div className="lp-roadmap-dot" />
                                <div className="lp-roadmap-content">
                                    <div><div className="lp-title-md" style={{ marginBottom: 4 }}>{t}</div><div className="lp-text-sm">{d}</div></div>
                                    <span className="lp-coming-soon"><span className="lp-cs-dot" />Coming Soon</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </LandingLayout>
    );
};

export default About;
