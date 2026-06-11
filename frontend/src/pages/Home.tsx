import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Ic } from '@/components/landing/LandingIcons';
import { DashMockup } from '@/components/landing/DashMockup';
import { FaqAccordion } from '@/components/landing/FaqAccordion';
import LandingLayout from '@/components/layout/LandingLayout';

const Home = () => {
    const navigate = useNavigate();
    const revealEls = useRef<(HTMLElement | null)[]>([]);
    const { isAuthenticated, isLoading } = useAuth();

    // Prevent authenticated users from visiting the marketing landing page
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // Scroll-reveal handler
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

    if (isAuthenticated) {
        return null;
    }

    return (
        <LandingLayout>
            {/* ══ HERO SECTION ════════════════════════════════════════════════════════ */}
            <section className="lp-hero lp-hero-premium" aria-labelledby="hero-title">
                {/* Clean background orbs, no oversaturated gradients */}
                <div className="lp-orbs" aria-hidden="true">
                    <div className="lp-orb lp-orb-premium-1" />
                    <div className="lp-orb lp-orb-premium-2" />
                </div>
                
                <div className="lp-hero-inner lp-hero-inner-premium">
                    {/* Left Hand: High-end copy positioning */}
                    <div className="lp-hero-content-premium">
                        <div className="lp-hero-badge lp-hero-badge-premium lp-anim-up">
                            <span className="lp-badge-dot" aria-hidden="true" />
                            Designed for Solo Practitioners in India
                        </div>
                        <h1 id="hero-title" className="lp-hero-title lp-hero-title-premium">
                            <span className="lp-hero-title-line lp-anim-up-d1">Your Entire Legal Practice.</span>
                            <span className="lp-hero-title-line lp-anim-up-d2">
                                <span className="lp-gold-text lp-gold-gradient-refined">Organized.</span>
                            </span>
                        </h1>
                        <p className="lp-hero-sub lp-hero-sub-premium lp-anim-up-d3">
                            A focused, secure digital workspace built specifically for individual advocates in India. Centralize your case vaults, track upcoming hearings, and manage client files without the paper chaos.
                        </p>
                        
                        {/* Realistic AI Statement */}
                        <p className="lp-hero-support lp-hero-support-premium lp-anim-up-d4">
                            🔒 Built for high confidentiality. Note: Advanced AI-assisted research and drafting modules are rolling out progressively.
                        </p>

                        {/* Workflow Chips */}
                        <div className="lp-hero-chips-premium lp-anim-up-d4">
                            {['Case Vault', 'Hearing Calendar', 'Advocate Notes', 'Client Records', 'Document Vault', 'Billing Tracking'].map(chip => (
                                <span key={chip} className="lp-workflow-chip">{chip}</span>
                            ))}
                        </div>

                        {/* Premium CTA Block */}
                        <div className="lp-hero-actions lp-hero-actions-premium lp-anim-up-d5">
                            <button id="hero-signup" className="lp-btn lp-btn-gold-lg lp-btn-gold-premium-lg" onClick={() => go('/signup')}>
                                Create Free Workspace <Ic.Arrow />
                            </button>
                            <button id="hero-login" className="lp-btn lp-btn-outline-lg lp-btn-outline-premium-lg" onClick={() => go('/login')}>
                                Explore Dashboard
                            </button>
                        </div>

                        <div className="lp-hero-proof lp-hero-proof-premium lp-anim-up-d6">
                            <div className="lp-hero-proof-item">
                                <span className="lp-hero-proof-dot" aria-hidden="true" />
                                No setup complexity
                            </div>
                            <div className="lp-hero-proof-item">
                                <span className="lp-hero-proof-dot" aria-hidden="true" />
                                Secure cloud workspace
                            </div>
                            <div className="lp-hero-proof-item">
                                <span className="lp-hero-proof-dot" aria-hidden="true" />
                                DPDP compliant architecture
                            </div>
                        </div>
                    </div>

                    {/* Right Hand: Polish dashboard preview */}
                    <div className="lp-hero-visual-premium lp-anim-up-d4">
                        <DashMockup />
                    </div>
                </div>
            </section>

            {/* ══ TRUSTED TECHNICAL STACK (STAT BAR REPLACEMENT) ══════════════════════ */}
            <div className="lp-stats-bar lp-stats-bar-premium">
                <div className="lp-stats-bar-inner lp-stats-bar-grid-premium">
                    {[
                        { title: 'Structured Case Management', desc: 'Step-by-step litigation tracking' },
                        { title: 'Secure Document Storage', desc: 'Encrypted case-linked vault' },
                        { title: 'Hearing Tracking System', desc: 'Never miss an scheduled court date' },
                        { title: 'Built for Indian Workflows', desc: 'Aligned with high court protocols' },
                    ].map((s, i) => (
                        <div key={s.title} className={`lp-stat-item lp-stat-item-premium lp-reveal lp-r-d${Math.min(i + 1, 4)}`} ref={r(i)}>
                            <div className="lp-stat-num lp-stat-title-premium">{s.title}</div>
                            <div className="lp-stat-lbl lp-stat-desc-premium">{s.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══ NEW "WHY JURIQ" GRID SECTION ══════════════════════════════════════ */}
            <section className="lp-sec lp-sec-why-premium" id="why-juriq">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(5)}>
                        <p className="lp-sec-label">The Reality of Independent Practice</p>
                        <h2 className="lp-sec-title">Advocates Face Modern Practice Chaos</h2>
                        <p className="lp-sec-subtitle-lead">Running a solo practice in India means managing complex cases under pressure. Traditional tools fall short.</p>
                    </div>

                    <div className="lp-why-grid-premium">
                        {[
                            {
                                problem: 'Matters Scattered Everywhere',
                                problemDesc: 'Case details spread across hand-written diaries, chaotic WhatsApp chats, and local hard drive folders make search impossible.',
                                solution: 'Centralized Case Vault',
                                solutionDesc: 'Juriq links pleadings, orders, court dates, client summaries, and bills into a single, clean workspace per matter.',
                                number: '01'
                            },
                            {
                                problem: 'Missed Hearings & Deadlines',
                                problemDesc: 'Forgetting an upcoming hearing date or deadline ruins client trust and cases. Manual tracking leaves room for errors.',
                                solution: 'Integrated Court Calendar',
                                solutionDesc: 'Juriq matches case dates, sending warnings for next-day actions and showing clear timeframes for your entire schedule.',
                                number: '02'
                            },
                            {
                                problem: 'Disconnected Billing & Files',
                                problemDesc: 'Drafting fee records separately leads to forgotten billable items, delayed payments, and unorganized invoices.',
                                solution: 'Case-Linked Fee Tracking',
                                solutionDesc: 'Record retainers, hearing appearances, and documentation billings right inside the active case file in seconds.',
                                number: '03'
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="lp-why-card lp-reveal" ref={r(6 + idx)}>
                                <div className="lp-why-card-num">{item.number}</div>
                                <div className="lp-why-card-split">
                                    <div className="lp-why-side-problem">
                                        <h3>The Struggle</h3>
                                        <h4>{item.problem}</h4>
                                        <p>{item.problemDesc}</p>
                                    </div>
                                    <div className="lp-why-side-arrow">
                                        <div className="lp-asym-arrow">→</div>
                                    </div>
                                    <div className="lp-why-side-solution">
                                        <h3>The Resolution</h3>
                                        <h4>{item.solution}</h4>
                                        <p>{item.solutionDesc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ REDESIGNED FEATURES SECTION ════════════════════════════════════════ */}
            <section className="lp-sec lp-sec-features-premium" id="features">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(10)}>
                        <p className="lp-sec-label">Core Features</p>
                        <h2 className="lp-sec-title">Engineered Around Your True Workflow</h2>
                        <p className="lp-sec-subtitle-lead">No unnecessary features. Only high-performance tools designed for the daily requirements of active advocates.</p>
                    </div>

                    <div className="lp-features-grid-premium">
                        {[
                            {
                                Icon: Ic.Briefcase,
                                title: 'Unified Case Management',
                                desc: 'Store case numbers, citations, party info, court details, and comprehensive histories in structured individual files.',
                                benefit: 'Instant case recovery'
                            },
                            {
                                Icon: Ic.Calendar,
                                title: 'Advocate Hearing Calendar',
                                desc: 'Track your personal appearances across High Courts, District Courts, and Tribunals with dates linked directly to cases.',
                                benefit: 'Zero missed dates'
                            },
                            {
                                Icon: Ic.Note,
                                title: 'Secure Client Notes',
                                desc: 'Record statements, witness summaries, and strategy notes. Highly structured, searchable, and confidential.',
                                benefit: 'Centralized strategy'
                            },
                            {
                                Icon: Ic.Users,
                                title: 'Detailed Client Records',
                                desc: 'Maintain clean profiles with full histories, active cases, and billing status. Quickly reach out to active clients.',
                                benefit: 'Polished client management'
                            },
                            {
                                Icon: Ic.Shield,
                                title: 'Case Document Vault',
                                desc: 'Securely upload pleadings, writ petitions, and case orders directly into specific files. Encrypted storage you can access in court.',
                                benefit: 'Instant folder retrieve'
                            },
                            {
                                Icon: Ic.Billing,
                                title: 'Simple Legal Billing',
                                desc: 'Track appearances fees, professional retainers, and pending collections. Generate clean invoices linked to case records.',
                                benefit: 'Faster fee collection'
                            }
                        ].map((feat, idx) => (
                            <div key={idx} className="lp-feature-card-premium lp-reveal" ref={r(14 + idx)}>
                                <div className="lp-feature-icon-box"><feat.Icon /></div>
                                <h3>{feat.title}</h3>
                                <p>{feat.desc}</p>
                                <span className="lp-feature-benefit-tag">{feat.benefit}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ WHAT'S COMING NEXT (ONLY LAW FIRM / ADVANCED AI HERE) ══════════════ */}
            <section className="lp-sec lp-sec-roadmap-premium" id="roadmap">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(20)}>
                        <p className="lp-sec-label">Product Roadmap</p>
                        <h2 className="lp-sec-title">What’s Coming Next</h2>
                        <p className="lp-sec-subtitle-lead">While Juriq is built specifically for individual workspaces, we are engineered for scale. Here is what we are developing next.</p>
                    </div>

                    <div className="lp-roadmap-timeline-premium">
                        {[
                            {
                                phase: 'Phase 1: Multi-User Chambers',
                                desc: 'Shared workspace access for partners and senior counsel. Introduce role-based read/write access for private matters.',
                                tag: 'In Chambers Beta'
                            },
                            {
                                phase: 'Phase 2: Junior Advocate Collaboration',
                                desc: 'Assign research tasks, case brief drafting, and hearing tracking to junior advocates with strict admin review tools.',
                                tag: 'Coming Soon'
                            },
                            {
                                phase: 'Phase 3: AI-Assisted Legal Drafting',
                                desc: 'Generate structured initial drafts of writ petitions, written statements, and legal notices based on verified Indian formats.',
                                tag: 'Under Active R&D'
                            },
                            {
                                phase: 'Phase 4: AI Case Summaries',
                                desc: 'Instantly summarize lengthy high court judgments, appellate briefs, and document transcripts inside your Case Vault.',
                                tag: 'Coming Soon'
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="lp-roadmap-item-premium lp-reveal" ref={r(21 + idx)}>
                                <div className="lp-roadmap-meta">
                                    <h3>{item.phase}</h3>
                                    <span className="lp-roadmap-tag">{item.tag}</span>
                                </div>
                                <p>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ TRUST & CREDIBILITY BAR ═════════════════════════════════════════════ */}
            <div className="lp-trust lp-trust-premium">
                <div className="lp-trust-inner lp-reveal" ref={r(30)}>
                    <span className="lp-trust-label">Secured Legal Architecture</span>
                    <div className="lp-trust-items lp-trust-items-premium">
                        {[
                            { Icon: Ic.Shield, l: 'Encrypted Password Hashing' },
                            { Icon: Ic.Lock, l: 'Secure JWT Authentication' },
                            { Icon: Ic.Briefcase, l: 'Case-Bound Security Sandbox' },
                            { Icon: Ic.Lock, l: 'DPDP Privacy Aligned' },
                        ].map(({ Icon, l }) => (
                            <div key={l} className="lp-trust-item lp-trust-item-premium">
                                <div className="lp-trust-icon"><Icon /></div>
                                <span className="lp-trust-txt">{l}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══ FAQ SECTION ════════════════════════════════════════════════════════ */}
            <section className="lp-sec lp-sec-faq-premium" id="faq" aria-labelledby="faq-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(35)}>
                        <p className="lp-sec-label">FAQ</p>
                        <h2 id="faq-heading" className="lp-sec-title">Frequently Asked Questions</h2>
                    </div>
                    <FaqAccordion revealRef={r(36)} />
                </div>
            </section>

            {/* ══ FINAL CTA SECTION ══════════════════════════════════════════════════ */}
            <div className="lp-cta-wrap lp-cta-wrap-premium">
                <div className="lp-cta-card lp-cta-card-premium lp-reveal" ref={r(40)}>
                    <div className="lp-cta-glow lp-cta-glow-premium" aria-hidden="true" />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="lp-hero-badge lp-hero-badge-cta" style={{ margin: '0 auto 22px' }}>
                            <span className="lp-badge-dot" aria-hidden="true" />
                            Start Organizing Your Practice Professionally
                        </div>
                        <h2 className="lp-cta-title">Upgrade Your Solo Chambers Workspace</h2>
                        <p className="lp-cta-sub">Join independent advocates who have shifted from messy files and scattered folders to an organized digital workspace. Take control of your cases, schedules, and billing on a unified platform.</p>
                        <div className="lp-cta-actions lp-cta-actions-premium">
                            <button id="cta-signup" className="lp-btn lp-btn-gold-lg lp-btn-gold-premium-lg" onClick={() => go('/signup')}>
                                Create Free Workspace <Ic.Arrow />
                            </button>
                            <button id="cta-login" className="lp-btn lp-btn-outline-lg lp-btn-outline-premium-lg" onClick={() => go('/login')}>
                                Explore Dashboard
                            </button>
                        </div>
                        <p className="lp-cta-note">Secure database • Built for Indian advocates • No setup complexity</p>
                    </div>
                </div>
            </div>
        </LandingLayout>
    );
};

export default Home;
