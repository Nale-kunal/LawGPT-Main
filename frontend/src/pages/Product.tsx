import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ic } from '@/components/landing/LandingIcons';
import LandingLayout from '@/components/layout/LandingLayout';

const Product = () => {
    const revealEls = useRef<(HTMLElement | null)[]>([]);
    const navigate = useNavigate();

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
            <div style={{ background: 'var(--lp-bg)', color: 'var(--lp-text)', overflow: 'hidden' }}>

                {/* ══ HEADER / INTRODUCTION ══════════════════════════════════════ */}
                <section 
                    style={{ 
                        paddingTop: '100px', 
                        paddingBottom: '32px',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--lp-bg2)'
                    }}
                >
                    <div className="juriq-container" style={{ textAlign: 'center' }}>
                        <span className="juriq-badge" style={{ marginBottom: '8px' }}>Product Overview</span>
                        <h1 className="juriq-h1" style={{ marginBottom: '8px', marginTop: '12px' }}>The Operating System for Advocates</h1>
                        <p className="juriq-body-sm" style={{ maxWidth: '800px', margin: '0 auto', color: 'var(--lp-muted)' }}>
                            Every tool an independent advocate needs to coordinate matters, track court listing calendars, manage legal documents, and maintain clients — built into a secure workspace.
                        </p>
                    </div>
                </section>

                {/* ══ FEATURE 1: CASE VAULT ═══════════════════════════════════════ */}
                <section className="juriq-section" style={{ padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(0)}>
                            <div>
                                <span className="juriq-pill">Centralized Directory</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>Matters & Case Vault</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Keep all pleadings, hearing histories, client records, and legal research in structured files per case. Move beyond chaotic local folders and manual diaries into a secure workspace.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Track case stages with a visual pipeline
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Linked index of filings, parties, and court listings
                                    </li>
                                </ul>
                            </div>
                            <div className="juriq-screenshot-wrapper">
                                <img src="/screenshots/cases.png" alt="Juriq Case Vault Grid" className="crisp-screenshot" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ FEATURE 2: DOCUMENT VAULT ══════════════════════════════════ */}
                <section className="juriq-section" style={{ background: 'var(--lp-bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(2)}>
                            <div className="juriq-screenshot-wrapper order-2 lg:order-1">
                                <img src="/screenshots/documents.jpg" alt="Juriq Document Vault" className="crisp-screenshot" />
                            </div>
                            <div className="order-1 lg:order-2">
                                <span className="juriq-pill">Secure Document Repository</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>Case Document Vault</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Manage, store, and organize writ petitions, pleading papers, and court orders directly inside the case they belong to. Search by file name to retrieve folders instantly.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> File categorization (PDFs, images, documents)
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Encrypted, secure cloud-based data storage
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ FEATURE 3: HEARING CALENDAR ════════════════════════════════ */}
                <section className="juriq-section" style={{ padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(4)}>
                            <div>
                                <span className="juriq-pill">Court Scheduling</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>Hearing Calendar</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Juriq lists scheduled hearings in a centralized calendar module. Keep track of listing dates, inspect calendar overlays, and receive conflict warnings to plan counsel schedules.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Conflict detection alerts for overlapping dates
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Integrated timeline linking listing histories to matters
                                    </li>
                                </ul>
                            </div>
                            <div className="juriq-screenshot-wrapper">
                                <img src="/screenshots/dashboard.png" alt="Juriq Dashboard Calendar" className="crisp-screenshot" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ FEATURE 4: CLIENT RECORDS ═════════════════════════════════ */}
                <section className="juriq-section" style={{ background: 'var(--lp-bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(6)}>
                            <div className="juriq-screenshot-wrapper order-2 lg:order-1">
                                <img src="/screenshots/clients.png" alt="Juriq Client & Case Directory" className="crisp-screenshot" />
                            </div>
                            <div className="order-1 lg:order-2">
                                <span className="juriq-pill">Directories</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>Detailed Client Directory</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Register contact profiles, communications, and linked matters. Find client details instantly, review active cases, and coordinate updates easily.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Secure advocate client logs and notes
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Full history listing associated active litigation
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ FEATURE 5: LEGAL TEMPLATES ════════════════════════════════ */}
                <section className="juriq-section" style={{ padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(8)}>
                            <div>
                                <span className="juriq-pill">Advocate Drafting</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>Court-Ready Templates</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Access standard pre-formatted legal drafts for affidavits, notices, plaints, and agreements. Structured templates make drafting faster and help you export court-ready documents in seconds.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Civil & Criminal court-ready standard formats
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> PDF and Microsoft Word document exports
                                    </li>
                                </ul>
                            </div>
                            <div className="juriq-screenshot-wrapper">
                                <img src="/screenshots/templates.png" alt="Juriq Templates Library" className="crisp-screenshot" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ FEATURE 6: ADVOCATE NOTES ══════════════════════════════════ */}
                <section className="juriq-section" style={{ background: 'var(--lp-bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(10)}>
                            <div className="juriq-screenshot-wrapper order-2 lg:order-1">
                                <img src="/screenshots/dashboard.png" alt="Juriq Worksheets and Notes" className="crisp-screenshot" />
                            </div>
                            <div className="order-1 lg:order-2">
                                <span className="juriq-pill">Attorney Work Product</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>Advocate Notes & Strategy</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Keep legal research summaries and strategy worksheets private. Compile details, facts, arguments, and evidence trails in worksheets directly linked to case files.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Private by default strategy journals
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Case-specific references and argument grids
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ FEATURE 7: COMMUNITY ═══════════════════════════════════════ */}
                <section className="juriq-section" style={{ padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(12)}>
                            <div>
                                <span className="juriq-pill">Advocate Forum</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>Advocate Community</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Engage with verified independent advocates. Discuss procedural nuances, review drafts, and build professional networks on a secure platform.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Discussion channels verified by bar registration
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Secure sharing of model drafts and templates
                                    </li>
                                </ul>
                            </div>

                            {/* Premium CSS Mockup representing Community interface */}
                            <div 
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    background: 'var(--gradient-card)',
                                    padding: '20px',
                                    boxShadow: 'var(--shadow-professional)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--foreground)' }}>Community Forum</span>
                                    <span className="juriq-badge" style={{ fontSize: '10px' }}>Advocates Online</span>
                                </div>
                                <div style={{ background: 'var(--lp-bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '11px', color: 'hsl(35, 100%, 55%)', fontWeight: '600' }}>#HighCourtPractice</span>
                                        <span style={{ fontSize: '11px', color: 'var(--lp-subtle)' }}>3 hours ago</span>
                                    </div>
                                    <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--foreground)', marginBottom: '4px' }}>Model format for filing e-attestation?</h4>
                                    <p style={{ fontSize: '12px', color: 'var(--lp-muted)', lineHeight: '1.4', margin: 0 }}>Has anyone uploaded the latest checklist for digital registry filings in Delhi HC?</p>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px', color: 'var(--lp-subtle)' }}>
                                        <span>👍 18 Likes</span>
                                        <span>💬 4 Comments</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ FINAL CTA ═══════════════════════════════════════════════════ */}
                <section className="juriq-section" style={{ background: 'var(--lp-bg2)', borderTop: '1px solid var(--border)', padding: '40px 0' }}>
                    <div className="juriq-container" style={{ textAlign: 'center' }}>
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <h2 className="juriq-h2" style={{ marginBottom: '8px', marginTop: 0 }}>Start Organizing Your Practice Today</h2>
                            <p className="juriq-body-sm" style={{ marginBottom: '20px', color: 'var(--lp-muted)' }}>
                                Set up your secure, dedicated chambers workspace in seconds.
                            </p>
                            <button className="juriq-btn-primary" onClick={() => go('/signup')} style={{ padding: '10px 20px', fontSize: '13.5px' }}>
                                Create Free Workspace <Ic.Arrow />
                            </button>
                        </div>
                    </div>
                </section>

            </div>
        </LandingLayout>
    );
};

export default Product;
