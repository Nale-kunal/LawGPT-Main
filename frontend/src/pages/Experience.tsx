import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ic } from '@/components/landing/LandingIcons';
import LandingLayout from '@/components/layout/LandingLayout';

const Experience = () => {
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
                        <span className="juriq-badge" style={{ marginBottom: '8px' }}>Advocate Walkthrough</span>
                        <h1 className="juriq-h1" style={{ marginBottom: '8px', marginTop: '12px' }}>How Advocates Run on Juriq</h1>
                        <p className="juriq-body-sm" style={{ maxWidth: '800px', margin: '0 auto', color: 'var(--lp-muted)' }}>
                            Explore the linear, organized workflow designed to manage legal matters with high security and zero paper chaos.
                        </p>
                    </div>
                </section>

                {/* ══ STEP 1: CAPTURE ═════════════════════════════════════════════ */}
                <section className="juriq-section" style={{ padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(0)}>
                            <div>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'hsl(35, 100%, 55%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 01 / Capture</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: '6px' }}>Onboard Clients & Cases</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Register contact profiles, communications, and linked matters. Capture the core facts, parties involved, case type, and court listings from day one.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Create case records with court details
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Register client contact directories
                                    </li>
                                </ul>
                            </div>
                            <div className="juriq-screenshot-wrapper">
                                <img src="/screenshots/clients.png" alt="Capture clients and cases grid" className="crisp-screenshot" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ STEP 2: ORGANIZE ════════════════════════════════════════════ */}
                <section className="juriq-section" style={{ background: 'var(--lp-bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(2)}>
                            <div className="juriq-screenshot-wrapper order-2 lg:order-1">
                                <img src="/screenshots/documents.jpg" alt="Organize documents and cases" className="crisp-screenshot" />
                            </div>
                            <div className="order-1 lg:order-2">
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'hsl(35, 100%, 55%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 02 / Organize</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: '6px' }}>Assemble Case Files & Notes</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Structure petitions, pleadings, and orders directly under their corresponding cases. Keep notes, facts, and legal drafts in specific folders.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Link writs, orders, and evidence lists
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Private, attorney work-product strategy notes
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ STEP 3: TRACK ═══════════════════════════════════════════════ */}
                <section className="juriq-section" style={{ padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(4)}>
                            <div>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'hsl(35, 100%, 55%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 03 / Track</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: '6px' }}>Track Hearings & Deadlines</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Log next-listing court dates and keep track of counsel appearances on the calendar dashboard. Juriq alerts you of calendar overlaps to prevent scheduling conflicts.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Calendar display for upcoming listing schedules
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Automatic conflict alerts for overlapping hearings
                                    </li>
                                </ul>
                            </div>
                            <div className="juriq-screenshot-wrapper">
                                <img src="/screenshots/dashboard.png" alt="Track hearings calendar" className="crisp-screenshot" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ STEP 4: COLLABORATE ═════════════════════════════════════════ */}
                <section className="juriq-section" style={{ background: 'var(--lp-bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(6)}>
                            <div className="juriq-screenshot-wrapper order-2 lg:order-1">
                                <img src="/screenshots/templates.png" alt="Collaborate with templates" className="crisp-screenshot" />
                            </div>
                            <div className="order-1 lg:order-2">
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'hsl(35, 100%, 55%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 04 / Collaborate</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: '6px' }}>Utilize Templates & Community</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Access standard legal templates to build drafts, affidavits, and notices. Connect with other verified advocates on the forum to share knowledge and discuss developments.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Ready-to-customize civil & criminal templates
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Verified advocate discussion network forums
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ STEP 5: RETRIEVE ════════════════════════════════════════════ */}
                <section className="juriq-section" style={{ padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(8)}>
                            <div>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'hsl(35, 100%, 55%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 05 / Retrieve</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: '6px' }}>Instant Lookup in Court</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    Access your case-linked files and strategy summaries securely on your phone or laptop in court. Find pleadings and document filings instantly when called for arguments.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Fast keyword search across all cases and files
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Multi-device secure advocate login
                                    </li>
                                </ul>
                            </div>
                            <div className="juriq-screenshot-wrapper">
                                <img src="/screenshots/dashboard.png" alt="Retrieve case details dashboard view" className="crisp-screenshot" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ FINAL CTA ═══════════════════════════════════════════════════ */}
                <section className="juriq-section" style={{ background: 'var(--lp-bg2)', borderTop: '1px solid var(--border)', padding: '40px 0' }}>
                    <div className="juriq-container" style={{ textAlign: 'center' }}>
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <h2 className="juriq-h2" style={{ marginBottom: '8px', marginTop: 0 }}>Experience the Difference Today</h2>
                            <p className="juriq-body-sm" style={{ marginBottom: '20px', color: 'var(--lp-muted)' }}>
                                Create a secure account to organize your active litigation practices.
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

export default Experience;
