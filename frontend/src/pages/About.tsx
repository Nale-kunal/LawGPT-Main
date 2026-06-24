import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ic } from '@/components/landing/LandingIcons';
import LandingLayout from '@/components/layout/LandingLayout';

const About = () => {
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

                {/* ══ HEADER / MISSION ═══════════════════════════════════════════ */}
                <section 
                    style={{ 
                        paddingTop: '100px', 
                        paddingBottom: '32px',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--lp-bg2)'
                    }}
                >
                    <div className="juriq-container" style={{ textAlign: 'center' }}>
                        <span className="juriq-badge" style={{ marginBottom: '8px' }}>Our Mission</span>
                        <h1 className="juriq-h1" style={{ marginBottom: '8px', marginTop: '12px' }}>Organizing the Practice of Law</h1>
                        <p className="juriq-body-sm" style={{ maxWidth: '800px', margin: '0 auto', color: 'var(--lp-muted)' }}>
                            Juriq exists to empower independent advocates and solo chambers in India with secure, focused, and structured digital workspaces.
                        </p>
                    </div>
                </section>

                {/* ══ STORY / THE CHALLENGE ═══════════════════════════════════════ */}
                <section className="juriq-section" id="story" style={{ padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start" ref={r(0)}>
                            <div>
                                <span className="juriq-pill">Why Juriq Exists</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>The Story Behind the Workspace</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '12px' }}>
                                    Running an independent practice in India is highly demanding. Advocates often coordinate dozens of active cases simultaneously across High Courts, District Courts, and various tribunals.
                                </p>
                                <p className="juriq-body-sm" style={{ color: 'var(--lp-muted)', margin: 0 }}>
                                    Without dedicated software, practice management degenerates into scattered WhatsApp threads, paper diaries, and disconnected cloud storage folders. Searching for client briefs or court orders under pressure becomes stressful and error-prone.
                                </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ borderLeft: '3px solid hsl(35, 100%, 55%)', paddingLeft: '20px' }}>
                                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '4px' }}>Case-Bound Structure</h4>
                                    <p style={{ fontSize: '13px', color: 'var(--lp-muted)', margin: 0 }}>Every document, calendar listing, and brief note is organized directly under its corresponding case file.</p>
                                </div>
                                <div style={{ borderLeft: '3px solid hsl(35, 100%, 55%)', paddingLeft: '20px' }}>
                                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '4px' }}>Indian Court Alignment</h4>
                                    <p style={{ fontSize: '13px', color: 'var(--lp-muted)', margin: 0 }}>Calendar grids and listing layouts are built specifically around High Court and District Court listing patterns.</p>
                                </div>
                                <div style={{ borderLeft: '3px solid hsl(35, 100%, 55%)', paddingLeft: '20px' }}>
                                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '4px' }}>Advocate Security</h4>
                                    <p style={{ fontSize: '13px', color: 'var(--lp-muted)', margin: 0 }}>Workproduct remains confidential. Granular credentials isolate data directories strictly by account.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ TARGET AUDIENCE ═════════════════════════════════════════════ */}
                <section className="juriq-section" style={{ background: 'var(--lp-bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal" ref={r(4)} style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <span className="juriq-pill">Target Chambers</span>
                            <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>Designed for Legal Professionals</h2>
                            <p className="juriq-body-sm" style={{ maxWidth: '800px', margin: '0 auto' }}>
                                Juriq is optimized to serve active practitioners starting or managing their independent litigation practice.
                            </p>
                        </div>

                        <div className="juriq-grid-3">
                            <div className="juriq-card lp-reveal" ref={r(5)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Users /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>Solo Advocates</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.6', margin: 0 }}>
                                    Advocates managing listings across various courtrooms. Juriq unifies calendars and cases under one account.
                                </p>
                            </div>

                            <div className="juriq-card lp-reveal" ref={r(6)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Briefcase /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>Independent Consultants</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.6', margin: 0 }}>
                                    Corporate and legal consultants handling transactions. Track files, checklists, and document drafts by client matter.
                                </p>
                            </div>

                            <div className="juriq-card lp-reveal" ref={r(7)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Star /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>New Practitioners</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.6', margin: 0 }}>
                                    Young advocates starting practice. Establish structured, clean case logs, folders, and timelines from day one.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ DEVELOPMENT TRANSPARENCY & ROADMAP ══════════════════════════ */}
                <section className="juriq-section" id="development" style={{ padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center" ref={r(8)}>
                            <div>
                                <span className="juriq-pill">Product Roadmap</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>Development Roadmap</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '12px' }}>
                                    We maintain absolute transparency regarding Juriq's features. The core features—Case Vault, Document Vault, Calendars, Client registry, and Templates—are fully functional.
                                </p>
                                <p className="juriq-body-sm" style={{ color: 'var(--lp-muted)', margin: 0 }}>
                                    Advanced multi-user chamber setups and AI drafting tools are under active R&D and clearly marked as upcoming additions.
                                </p>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { phase: 'Phase 1: Multi-User Chambers', desc: 'Shared workspace access for partners and senior counsel. Introduce role-based read/write access for private matters.', status: 'In Chambers Beta' },
                                    { phase: 'Phase 2: Junior Advocate Collaboration', desc: 'Assign research tasks, case brief drafting, and hearing tracking to junior advocates with strict admin review tools.', status: 'Coming Soon' },
                                    { phase: 'Phase 3: AI-Assisted Legal Drafting', desc: 'Generate structured initial drafts of writ petitions, written statements, and legal notices based on verified Indian formats.', status: 'Under Active R&D' },
                                    { phase: 'Phase 4: AI Case Summaries', desc: 'Instantly summarize lengthy high court judgments, appellate briefs, and document transcripts inside your Case Vault.', status: 'Coming Soon' }
                                ].map((item, idx) => (
                                    <div 
                                        key={idx} 
                                        style={{ 
                                            background: 'var(--lp-bg2)', 
                                            border: '1px solid var(--border)', 
                                            borderRadius: '8px', 
                                            padding: '16px' 
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--foreground)' }}>{item.phase}</span>
                                            <span style={{ fontSize: '11px', color: 'hsl(35, 100%, 55%)', fontWeight: '600' }}>{item.status}</span>
                                        </div>
                                        <p style={{ fontSize: '12px', color: 'var(--lp-muted)', margin: 0, lineHeight: '1.4' }}>{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ FINAL CTA ═══════════════════════════════════════════════════ */}
                <section className="juriq-section" style={{ background: 'var(--lp-bg2)', borderTop: '1px solid var(--border)', padding: '40px 0' }}>
                    <div className="juriq-container" style={{ textAlign: 'center' }}>
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <h2 className="juriq-h2" style={{ marginBottom: '8px', marginTop: 0 }}>Experience the OS for Advocates</h2>
                            <p className="juriq-body-sm" style={{ marginBottom: '20px', color: 'var(--lp-muted)' }}>
                                Build a disciplined, organized digital legal chambers workspace.
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

export default About;
