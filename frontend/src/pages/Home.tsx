import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Ic } from '@/components/landing/LandingIcons';
import { FaqAccordion } from '@/components/landing/FaqAccordion';
import LandingLayout from '@/components/layout/LandingLayout';

const Home = () => {
    const navigate = useNavigate();
    const revealEls = useRef<(HTMLElement | null)[]>([]);
    const { isAuthenticated, isLoading } = useAuth();
    const [selectedScreenshotIdx, setSelectedScreenshotIdx] = useState<number | null>(null);

    // Prevent authenticated users from visiting the marketing landing page
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // Scroll-reveal handler for subtle fade reveals on scroll
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

    const showcaseSections = [
        {
            badge: 'Matter Control',
            title: 'Unified Case Management',
            desc: 'Store case numbers, citations, party info, court details, and histories in structured files. Keep track of litigation details in one clean directory.',
            bullets: [
                'Step-by-step litigation lifecycle tracking',
                'Linked documents, Strategy and Hearing histories'
            ],
            src: '/screenshots/cases.png',
            alt: 'Juriq Cases Page'
        },
        {
            badge: 'Pipeline Timeline',
            title: 'Structured Case Milestones',
            desc: 'Every legal matter progresses through multiple stages. Juriq lets you track these stages through a structured case pipeline so nothing falls through the cracks.',
            bullets: [
                'Custom case milestones and stages',
                'Clear visual timeline progress tracking'
            ],
            src: '/screenshots/case-pipeline.png',
            alt: 'Juriq Case Pipeline Tracker'
        },
        {
            badge: 'Secure Document Repository',
            title: 'Case Document Vault',
            desc: 'Manage, store, and organize writ petitions, pleading papers, and court orders directly inside the case they belong to. Search by file name to retrieve folders instantly.',
            bullets: [
                'File categorization (PDFs, images, documents)',
                'Encrypted, secure cloud-based data storage'
            ],
            src: '/screenshots/documents.jpg',
            alt: 'Juriq Document Vault'
        },
        {
            badge: 'Directories',
            title: 'Detailed Client Directory',
            desc: 'Register contact profiles, communications, and linked matters. Find client details instantly, review active cases, and coordinate updates easily.',
            bullets: [
                'Secure advocate client logs and notes',
                'Full history listing associated active litigation'
            ],
            src: '/screenshots/clients.png',
            alt: 'Juriq Client & Case Directory'
        },
        {
            badge: 'Advocate Drafting',
            title: 'Court-Ready Templates',
            desc: 'Access standard pre-formatted legal drafts for affidavits, notices, plaints, and agreements. Structured templates make drafting faster and help you export court-ready documents in seconds.',
            bullets: [
                'Civil & Criminal court-ready standard formats',
                'PDF and Microsoft Word document exports'
            ],
            src: '/screenshots/templates.png',
            alt: 'Juriq Templates Library'
        }
    ];

    return (
        <LandingLayout>
            <div style={{ background: 'var(--lp-bg)', color: 'var(--lp-text)', overflow: 'hidden' }}>

                {/* ══ SECTION 1: HERO (TWO-COLUMN, ABOVE-THE-FOLD SPLIT LAYOUT) ════════════════ */}
                <section 
                    style={{ 
                        paddingTop: '110px', 
                        paddingBottom: '40px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <div className="juriq-container">
                        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 lg:gap-12 items-center">
                            {/* Left Column: Core Copy (40% width, compact max-height) */}
                            <div 
                                className="lp-anim-up" 
                                style={{ 
                                    zIndex: 2,
                                    maxHeight: '450px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    gap: '12px'
                                }}
                            >
                                <div className="juriq-badge" style={{ alignSelf: 'flex-start' }}>
                                    Designed for Solo Practitioners in India
                                </div>

                                <h1 
                                    className="juriq-h1"
                                    style={{ 
                                        fontWeight: '800',
                                        fontSize: 'clamp(26px, 3.5vw, 38px)',
                                        lineHeight: '1.15',
                                        margin: 0
                                    }}
                                >
                                    Your Entire Practice. <span style={{ color: 'hsl(35, 100%, 55%)' }}>Organized.</span>
                                </h1>

                                <p 
                                    className="juriq-body-sm"
                                    style={{ 
                                        color: 'var(--lp-muted)',
                                        margin: 0,
                                        fontSize: '15px',
                                        lineHeight: '1.5'
                                    }}
                                >
                                    A focused, secure digital workspace built specifically for individual advocates. Centralize case files, track upcoming hearings, and manage client records without the paper chaos.
                                </p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--lp-subtle)', margin: '4px 0 0 0' }}>
                                    🔒 Built for high confidentiality.
                                </div>

                                <div style={{ display: 'flex', gap: '10px', margin: '4px 0 0 0', flexWrap: 'wrap' }}>
                                    <button className="juriq-btn-primary" onClick={() => go('/signup')} style={{ padding: '10px 20px', fontSize: '13.5px' }}>
                                        Create Free Workspace <Ic.Arrow />
                                    </button>
                                    <button className="juriq-btn-secondary" onClick={() => go('/login')} style={{ padding: '10px 20px', fontSize: '13.5px' }}>
                                        Explore Dashboard
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '4px 0 0 0' }}>
                                    {['Case Vault', 'Calendar', 'Notes', 'Templates'].map(tag => (
                                        <span 
                                            key={tag} 
                                            style={{ 
                                                fontSize: '11px', 
                                                padding: '3px 8px', 
                                                background: 'var(--lp-bg-card)', 
                                                border: '1px solid var(--border)', 
                                                borderRadius: '4px',
                                                color: 'var(--lp-subtle)',
                                                fontWeight: '500'
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Right Column: Screenshot above fold (60% width, large, visible on load) */}
                            <div 
                                className="lp-anim-up-d2"
                                style={{
                                    position: 'relative',
                                    zIndex: 1,
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <div
                                    className="juriq-screenshot-wrapper"
                                    style={{
                                        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.4)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        width: '100%',
                                        maxWidth: '1200px',
                                        margin: '0 auto'
                                    }}
                                >
                                    <img 
                                        src="/screenshots/dashboard.png" 
                                        alt="Juriq Advocate Dashboard" 
                                        className="crisp-screenshot"
                                        style={{ 
                                            width: '100%', 
                                            height: 'auto', 
                                            display: 'block'
                                        }}
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* ══ SECTION 2: PRODUCT PREVIEW (TRUST / SOCIAL PROOF) ═══════════ */}
                <section 
                    style={{ 
                        borderTop: '1px solid var(--border)', 
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--lp-bg2)',
                        padding: '16px 0'
                    }}
                >
                    <div className="juriq-container">
                        <div 
                            className="juriq-grid-4 lp-reveal" 
                            ref={r(0)}
                            style={{ textAlign: 'center', alignItems: 'center' }}
                        >
                            <div style={{ padding: '8px' }}>
                                <div style={{ fontSize: '13px', color: 'var(--lp-subtle)', fontWeight: '500' }}>Platform Ease</div>
                                <div style={{ fontSize: '15px', color: 'var(--lp-text)', fontWeight: '600', marginTop: '4px' }}>No setup complexity</div>
                            </div>
                            <div style={{ padding: '8px', borderLeft: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '13px', color: 'var(--lp-subtle)', fontWeight: '500' }}>Advocate Vault</div>
                                <div style={{ fontSize: '15px', color: 'var(--lp-text)', fontWeight: '600', marginTop: '4px' }}>Secure cloud workspace</div>
                            </div>
                            <div style={{ padding: '8px', borderLeft: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '13px', color: 'var(--lp-subtle)', fontWeight: '500' }}>Compliance</div>
                                <div style={{ fontSize: '15px', color: 'var(--lp-text)', fontWeight: '600', marginTop: '4px' }}>DPDP compliant architecture</div>
                            </div>
                            <div style={{ padding: '8px', borderLeft: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '13px', color: 'var(--lp-subtle)', fontWeight: '500' }}>Reliability</div>
                                <div style={{ fontSize: '15px', color: 'var(--lp-text)', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <span style={{ color: '#22c55e' }}>●</span> Systems Operational
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ SECTION 3: PROBLEMS SOLVED ══════════════════════════════════ */}
                <section className="juriq-section" id="why-juriq" style={{ padding: '48px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal" ref={r(1)} style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <span className="juriq-pill">Advocate Challenges</span>
                            <h2 className="juriq-h2" style={{ marginBottom: '12px !important', marginTop: '0 !important' }}>Advocates Face Modern Practice Chaos</h2>
                            <p className="juriq-body-sm" style={{ maxWidth: '800px', margin: '0 auto' }}>
                                Running a solo practice in India means managing complex cases under pressure. Traditional tools fall short.
                            </p>
                        </div>

                        <div className="juriq-grid-3">
                            {[
                                {
                                    num: '01',
                                    problem: 'Matters Scattered Everywhere',
                                    probDesc: 'Case details spread across hand-written diaries, chaotic WhatsApp chats, and local hard drive folders make search impossible.',
                                    solution: 'Centralized Case Vault',
                                    solDesc: 'Juriq links pleadings, orders, court dates, client summaries, and case notes into a single, clean workspace per matter.'
                                },
                                {
                                    num: '02',
                                    problem: 'Missed Hearings & Deadlines',
                                    probDesc: 'Forgetting an upcoming hearing date or deadline ruins client trust and cases. Manual tracking leaves room for errors.',
                                    solution: 'Integrated Court Calendar',
                                    solDesc: 'Juriq matches case dates, sending warnings for next-day actions and showing clear timeframes for your entire schedule.'
                                },
                                {
                                    num: '03',
                                    problem: 'Fragmented Case Records',
                                    probDesc: 'Critical case files, notes, and documents scattered across folders and devices make finding information stressful.',
                                    solution: 'Unified Case Workspace',
                                    solDesc: 'Keep every case file, document, note, and hearing date in one structured, searchable workspace — accessible securely from anywhere.'
                                }
                            ].map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="juriq-card lp-reveal" 
                                    ref={r(2 + idx)}
                                    style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '24px', fontWeight: '800', color: 'hsl(35, 100%, 55%)', opacity: 0.8 }}>{item.num}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--lp-subtle)', fontWeight: '600' }}>Struggle to Resolution</span>
                                    </div>
                                    
                                    <div style={{ flex: 1, marginBottom: '16px' }}>
                                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '6px' }}>❌ {item.problem}</h4>
                                        <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.5', margin: 0 }}>{item.probDesc}</p>
                                    </div>

                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'hsl(35, 100%, 55%)', marginBottom: '6px' }}>✓ {item.solution}</h4>
                                        <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.5', margin: 0 }}>{item.solDesc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══ SECTION 4: CORE CAPABILITIES (ALTERNATING SCREENSHOT SHOWCASE SYSTEM) ════════════════ */}
                <section className="juriq-section" id="capabilities" style={{ background: 'var(--lp-bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '56px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal" ref={r(5)} style={{ textAlign: 'center', marginBottom: '48px' }}>
                            <span className="juriq-pill">Core Features</span>
                            <h2 className="juriq-h2" style={{ marginBottom: '12px !important', marginTop: '0 !important' }}>Engineered Around Your True Workflow</h2>
                            <p className="juriq-body-sm" style={{ maxWidth: '800px', margin: '0 auto' }}>
                                A focused, secure digital workspace designed to serve the daily needs of legal professionals.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '56px' }}>
                            {showcaseSections.map((item, idx) => {
                                const isEven = idx % 2 === 1;
                                return (
                                    <div 
                                        key={idx}
                                        className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center" 
                                        ref={r(6 + idx)}
                                    >
                                        {/* Text Column */}
                                        <div className={isEven ? 'order-1 lg:order-2' : 'order-1'}>
                                            <div className="juriq-badge" style={{ marginBottom: '8px' }}>{item.badge}</div>
                                            <h3 className="juriq-h3" style={{ marginBottom: '12px !important', marginTop: '0 !important', fontWeight: '700' }}>{item.title}</h3>
                                            <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                                {item.desc}
                                            </p>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {item.bullets.map((bullet, bIdx) => (
                                                    <li key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                                        <span style={{ color: 'hsl(35, 100%, 55%)', display: 'inline-flex' }}><Ic.Check /></span> {bullet}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Screenshot Column (Clickable to open Lightbox Modal) */}
                                        <div 
                                            className={`juriq-screenshot-wrapper cursor-pointer ${isEven ? 'order-2 lg:order-1' : 'order-2'}`}
                                            onClick={() => setSelectedScreenshotIdx(idx)}
                                            style={{ 
                                                width: '100%',
                                                maxWidth: '900px',
                                                border: '1px solid var(--border)',
                                                boxShadow: 'var(--shadow-elevated)',
                                                borderRadius: '8px',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <img 
                                                src={item.src} 
                                                alt={item.alt} 
                                                className="crisp-screenshot"
                                                style={{ width: '100%', height: 'auto', display: 'block' }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ══ SECTION 5: SECURITY ══════════════════════════════════════════ */}
                <section className="juriq-section" id="security-overview" style={{ padding: '48px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal" ref={r(11)} style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <span className="juriq-pill">Practice Confidentiality</span>
                            <h2 className="juriq-h2" style={{ marginBottom: '12px !important', marginTop: '0 !important' }}>Secured Legal Architecture</h2>
                            <p className="juriq-body-sm" style={{ maxWidth: '800px', margin: '0 auto' }}>
                                Legal records demand high security. Juriq is built with strict privacy controls to preserve attorney-client confidentiality.
                            </p>
                        </div>

                        <div className="juriq-grid-3">
                            <div className="juriq-card lp-reveal" ref={r(12)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Shield /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>AES-256 Data Encryption</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.5', margin: 0 }}>All client briefs, documents, notes, and case details are securely encrypted in transit and at rest.</p>
                            </div>

                            <div className="juriq-card lp-reveal" ref={r(13)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Lock /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>JWT Session Authentication</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.5', margin: 0 }}>Secure, token-based authorization and session boundaries for advocate workspace access.</p>
                            </div>

                            <div className="juriq-card lp-reveal" ref={r(14)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Users /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>DPDP Alignment</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.5', margin: 0 }}>Engineered with onboarding consent-gate parameters and secure audit logging to support privacy principles.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ SECTION 6: FAQ ═══════════════════════════════════════════════ */}
                <section className="juriq-section" id="faq" style={{ borderTop: '1px solid var(--border)', background: 'var(--lp-bg2)', padding: '48px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal" ref={r(15)} style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <span className="juriq-pill">FAQ</span>
                            <h2 className="juriq-h2" style={{ marginBottom: '12px !important', marginTop: '0 !important' }}>Frequently Asked Questions</h2>
                        </div>
                        <FaqAccordion revealRef={r(16)} />
                    </div>
                </section>

                {/* ══ SECTION 7: FINAL CTA ══════════════════════════════════════════ */}
                <section className="juriq-section" style={{ borderTop: '1px solid var(--border)', padding: '48px 0' }}>
                    <div className="juriq-container" style={{ textAlign: 'center' }}>
                        <div 
                            className="lp-reveal" 
                            ref={r(17)}
                            style={{ 
                                maxWidth: '850px', 
                                margin: '0 auto', 
                                padding: '32px 24px',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                background: 'var(--gradient-card)',
                                boxShadow: 'var(--shadow-professional)'
                            }}
                        >
                            <span className="juriq-pill" style={{ marginBottom: '8px' }}>Start Organizing Your Practice</span>
                            <h2 className="juriq-h2" style={{ marginBottom: '12px !important', marginTop: '0 !important' }}>
                                Upgrade Your Solo Chambers Workspace
                            </h2>
                            <p className="juriq-body-sm" style={{ marginBottom: '20px', color: 'var(--lp-muted)' }}>
                                Join independent advocates who have shifted from messy files and scattered folders to an organized digital workspace. Take control of your cases, schedules, and documents on a unified platform.
                            </p>

                            <div 
                                style={{ 
                                    display: 'flex', 
                                    gap: '12px', 
                                    justifyContent: 'center',
                                    marginBottom: '16px'
                                }}
                            >
                                <button className="juriq-btn-primary" onClick={() => go('/signup')} style={{ padding: '10px 20px', fontSize: '13.5px' }}>
                                    Create Free Workspace <Ic.Arrow />
                                </button>
                                <button className="juriq-btn-secondary" onClick={() => go('/login')} style={{ padding: '10px 20px', fontSize: '13.5px' }}>
                                    Explore Dashboard
                                </button>
                            </div>

                            <p style={{ fontSize: '13px', color: 'var(--lp-subtle)', margin: 0 }}>
                                Secure database • Built for Indian advocates • No setup complexity
                            </p>
                        </div>
                    </div>
                </section>

            </div>

            {/* ══ GORGEOUS LIGHTBOX MODAL FOR HIGH-DEFINITION SCREENSHOTS ══ */}
            {selectedScreenshotIdx !== null && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        animation: 'fadeIn 0.25s ease-out'
                    }}
                    onClick={() => setSelectedScreenshotIdx(null)}
                >
                    <div 
                        style={{
                            maxWidth: '960px',
                            width: '100%',
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow-professional)',
                            overflow: 'hidden',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Title Bar / Header (Simple and professional, no fake browser controls) */}
                        <div 
                            style={{
                                padding: '14px 20px',
                                background: 'var(--muted)',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--foreground)' }}>
                                {showcaseSections[selectedScreenshotIdx].title}
                            </span>
                            <button 
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--muted-foreground)',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    fontWeight: '500',
                                    lineHeight: 1
                                }}
                                onClick={() => setSelectedScreenshotIdx(null)}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Image Body */}
                        <div style={{ padding: '24px', background: 'var(--background)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img 
                                src={showcaseSections[selectedScreenshotIdx].src} 
                                alt={showcaseSections[selectedScreenshotIdx].title} 
                                className="crisp-screenshot"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '65vh',
                                    borderRadius: '8px',
                                    boxShadow: 'var(--shadow-elevated)',
                                    border: '1px solid var(--border)',
                                    display: 'block'
                                }}
                            />
                        </div>

                        {/* Description & Navigation Footer */}
                        <div 
                            style={{
                                padding: '16px 20px',
                                background: 'var(--muted)',
                                borderTop: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '16px'
                            }}
                        >
                            <div style={{ flex: 1, minWidth: '280px' }}>
                                <p style={{ margin: 0, fontSize: '14px', color: 'var(--foreground)', fontWeight: '600' }}>
                                    {showcaseSections[selectedScreenshotIdx].title}
                                </p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>
                                    {showcaseSections[selectedScreenshotIdx].desc}
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button 
                                    className="juriq-btn-secondary"
                                    style={{ padding: '8px 16px', fontSize: '13px' }}
                                    onClick={() => setSelectedScreenshotIdx((selectedScreenshotIdx - 1 + showcaseSections.length) % showcaseSections.length)}
                                >
                                    ← Previous
                                </button>
                                <button 
                                    className="juriq-btn-secondary"
                                    style={{ padding: '8px 16px', fontSize: '13px' }}
                                    onClick={() => setSelectedScreenshotIdx((selectedScreenshotIdx + 1) % showcaseSections.length)}
                                >
                                    Next →
                                </button>
                                <button 
                                    className="juriq-btn-primary"
                                    style={{ padding: '8px 16px', fontSize: '13px' }}
                                    onClick={() => {
                                        setSelectedScreenshotIdx(null);
                                        go('/signup');
                                    }}
                                >
                                    Try Juriq Free
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </LandingLayout>
    );
};

export default Home;
