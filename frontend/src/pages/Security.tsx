import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ic } from '@/components/landing/LandingIcons';
import LandingLayout from '@/components/layout/LandingLayout';

const Security = () => {
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
                        <span className="juriq-badge" style={{ marginBottom: '8px' }}>Enterprise Trust</span>
                        <h1 className="juriq-h1" style={{ marginBottom: '8px', marginTop: '12px' }}>Your clients trust you. We protect that trust.</h1>
                        <p className="juriq-body-sm" style={{ maxWidth: '800px', margin: '0 auto', color: 'var(--lp-muted)' }}>
                            Advocates handle highly sensitive personal and business information. Juriq is engineered with a security-first architecture to maintain absolute confidentiality.
                        </p>
                    </div>
                </section>

                {/* ══ SECURITY PILLARS ════════════════════════════════════════════ */}
                <section className="juriq-section" style={{ padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal" ref={r(0)} style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <span className="juriq-pill">Infrastructure</span>
                            <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>Core Security Implementations</h2>
                            <p className="juriq-body-sm" style={{ maxWidth: '800px', margin: '0 auto' }}>
                                A deep dive into the real security architecture protecting your advocate workspace.
                            </p>
                        </div>

                        <div className="juriq-grid-3" style={{ marginBottom: '32px' }}>
                            {/* Encryption */}
                            <div className="juriq-card lp-reveal" ref={r(1)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Shield /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>1. Data Encryption</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.6', margin: 0 }}>
                                    Case briefs, documents, templates, and notes are encrypted in transit using HTTPS (TLS 1.3) and at rest using enterprise AES-256 encryption.
                                </p>
                            </div>

                            {/* Authentication */}
                            <div className="juriq-card lp-reveal" ref={r(2)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Lock /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>2. Authentication Security</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.6', margin: 0 }}>
                                    Advocate accounts are protected with bcrypt password hashing and secure JWT authentication tokens stored with strict browser protections.
                                </p>
                            </div>

                            {/* Access Control */}
                            <div className="juriq-card lp-reveal" ref={r(3)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Users /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>3. Access Control</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.6', margin: 0 }}>
                                    Strict account sandbox isolation. Case details, documents, and client contacts are isolated and accessible only by the authenticated advocate.
                                </p>
                            </div>

                            {/* Session Security */}
                            <div className="juriq-card lp-reveal" ref={r(4)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Calendar /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>4. Session Security</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.6', margin: 0 }}>
                                    Automatic session expiry, CSRF protection middleware, Content Security Policies (CSP), and request rate limiting safeguard the workspace.
                                </p>
                            </div>

                            {/* Consent Architecture */}
                            <div className="juriq-card lp-reveal" ref={r(5)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Briefcase /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>5. Consent Architecture</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.6', margin: 0 }}>
                                    DPDP aligned cookie consent banners and onboarding consent screens ensure complete transparency over advocate profile data collection.
                                </p>
                            </div>

                            {/* Privacy Controls */}
                            <div className="juriq-card lp-reveal" ref={r(6)}>
                                <div style={{ color: 'hsl(35, 100%, 55%)', marginBottom: '12px' }}><Ic.Scale /></div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>6. Privacy Controls</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.6', margin: 0 }}>
                                    Advocates retain absolute control. A complete data wiping utility guarantees that all client profiles, filings, and notes are deleted on account close.
                                </p>
                            </div>
                        </div>

                        {/* Technology stack */}
                        <div 
                            className="juriq-card lp-reveal grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 items-center" 
                            ref={r(7)}
                            style={{ 
                                padding: '20px', 
                                border: '1px solid var(--border)'
                            }}
                        >
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '8px', marginTop: 0 }}>7. Data Protection</h3>
                                <p style={{ fontSize: '13px', color: 'var(--lp-muted)', lineHeight: '1.6', margin: 0 }}>
                                    Database audits, server activity logging, and account boundaries provide comprehensive data protection compliance.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {['JWT Session Verification', 'AES-256 Encryption', 'Onboarding Consent Gate', 'DPDP Compliance Aligned', 'Secure Data Portability'].map(tag => (
                                    <span 
                                        key={tag} 
                                        style={{ 
                                            fontSize: '11px', 
                                            fontWeight: '600', 
                                            padding: '5px 10px', 
                                            borderRadius: '4px', 
                                            background: 'var(--lp-bg)', 
                                            border: '1px solid var(--border)', 
                                            color: 'var(--lp-subtle)' 
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>
                </section>

                {/* ══ AUDIT LOGGING & COMPLIANCE ══════════════════════════════════ */}
                <section className="juriq-section" style={{ background: 'var(--lp-bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '40px 0' }}>
                    <div className="juriq-container">
                        <div className="lp-reveal grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" ref={r(8)}>
                            <div>
                                <span className="juriq-pill">Reliability & Auditing</span>
                                <h2 className="juriq-h2" style={{ marginBottom: '12px', marginTop: 0 }}>Practice Activity Logging</h2>
                                <p className="juriq-body-sm" style={{ marginBottom: '16px', color: 'var(--lp-muted)' }}>
                                    To ensure transparency within legal chambers, Juriq implements secure activity logs. This records critical profile and account modifications, helping advocates maintain a secure workspace trail.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Track profile configuration changes
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--lp-muted)' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}><Ic.Check /></span> Log logins and password update attempts
                                    </li>
                                </ul>
                            </div>

                            <div 
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    background: 'var(--gradient-card)',
                                    padding: '20px',
                                    boxShadow: 'var(--shadow-elevated)'
                                }}
                            >
                                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '12px' }}>Audit Log Preview</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--lp-subtle)' }}>
                                    <div style={{ padding: '8px', background: 'var(--lp-bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}>[2026-06-19 11:30:00]</span> AUTH_LOGIN_SUCCESS - Advocate Kunal nale (IP: 192.168.1.5)
                                    </div>
                                    <div style={{ padding: '8px', background: 'var(--lp-bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}>[2026-06-19 11:32:15]</span> CASE_RECORD_CREATED - CC/2026/007 vs State of Maharashtra
                                    </div>
                                    <div style={{ padding: '8px', background: 'var(--lp-bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                        <span style={{ color: 'hsl(35, 100%, 55%)' }}>[2026-06-19 11:35:10]</span> DOCUMENT_UPLOAD_SUCCESS - WritPetition_Signed.pdf (Size: 4.8MB)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ FINAL CTA ═══════════════════════════════════════════════════ */}
                <section className="juriq-section" style={{ borderTop: '1px solid var(--border)', padding: '40px 0' }}>
                    <div className="juriq-container" style={{ textAlign: 'center' }}>
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <h2 className="juriq-h2" style={{ marginBottom: '8px', marginTop: 0 }}>Run a Secure Practice</h2>
                            <p className="juriq-body-sm" style={{ marginBottom: '20px', color: 'var(--lp-muted)' }}>
                                Create a secure, confidential individual chambers workspace.
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

export default Security;
