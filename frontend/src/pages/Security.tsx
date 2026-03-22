import { useEffect, useRef } from 'react';
import { Ic } from '@/components/landing/LandingIcons';
import LandingLayout from '@/components/layout/LandingLayout';

const Security = () => {
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
            {/* ══ ENTERPRISE SECURITY ══════════════════════════════════════════════════ */}
            <section className="lp-sec lp-sec-deep" id="security">
                <div className="lp-sec-inner">
                    <div className="lp-sec-split lp-reveal" ref={r(24)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
                        <div>
                            <p className="lp-sec-label">Enterprise Security</p>
                            <h2 className="lp-sec-title">
                                Your clients trust you.<br />We protect that trust.
                            </h2>
                            <p className="lp-sec-sub" style={{ marginBottom: 28 }}>
                                Lawyers handle the most sensitive personal and business information. Juriq is built with security-first architecture — not bolted on later.
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {['DPDP Ready', 'AES-256 Encrypted', 'Audit Logged'].map(tag => (
                                    <span key={tag} className="lp-badge-tag">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="lp-sec-grid">
                            {[
                                { title: 'Encrypted Data Storage', desc: 'All case data encrypted at rest and in transit using AES-256.' },
                                { title: 'Role-Based Access Control', desc: 'Granular permissions for each team member — control who sees what.' },
                                { title: 'Secure Document Handling', desc: 'Documents uploaded, stored, and shared through secured channels only.' },
                                { title: 'Private Legal Notes', desc: 'Attorney work-product notes are private by default, never shared automatically.' },
                            ].map(item => (
                                <div key={item.title} className="lp-sec-card">
                                    <div className="lp-sec-card-icon"><Ic.Check /></div>
                                    <div className="lp-title-md">{item.title}</div>
                                    <div className="lp-text-sm">{item.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ TECHNOLOGY ARCHITECTURE ═══════════════════════════════════════════════ */}
            <section className="lp-sec" id="technology" aria-labelledby="tech-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(56)}>
                        <p className="lp-sec-label">Technology</p>
                        <h2 id="tech-heading" className="lp-sec-title">Built on Modern Technology</h2>
                        <p className="lp-sec-sub">Juriq uses a modern web stack designed for reliability, security, and performance.</p>
                    </div>
                    <div className="lp-tech-grid lp-reveal" ref={r(57)}>
                        {[
                            { Icon: Ic.Code, layer: 'Frontend', name: 'React + TypeScript', desc: 'Type-safe component architecture for a reliable, consistent UI.' },
                            { Icon: Ic.Server, layer: 'Backend', name: 'Node.js + Express', desc: 'Scalable REST API layer with JWT authentication and CSRF protection.' },
                            { Icon: Ic.Database, layer: 'Database', name: 'MongoDB', desc: 'Flexible document database for structured legal data storage.' },
                            { Icon: Ic.Cloud, layer: 'Storage', name: 'Cloud Storage', desc: 'Encrypted cloud-based document storage for secure case file access.' },
                        ].map(({ Icon, layer, name, desc }) => (
                            <div key={name} className="lp-tech-card">
                                <div className="lp-tech-icon"><Icon /></div>
                                <div className="lp-tech-layer">{layer}</div>
                                <div className="lp-title-md">{name}</div>
                                <div className="lp-text-sm">{desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ RELIABILITY ══════════════════════════════════════════════════════════ */}
            <section className="lp-sec lp-sec-alt" id="reliability" aria-labelledby="rel-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(62)}>
                        <p className="lp-sec-label">Reliability</p>
                        <h2 id="rel-heading" className="lp-sec-title">Built for Professional Legal Practice</h2>
                    </div>
                    <div className="lp-reliability-grid lp-reveal" ref={r(63)}>
                        {[
                            { t: 'Structured Case Lifecycle', d: 'Every case follows a defined lifecycle from registration to closure without information getting lost.' },
                            { t: 'Audit Logging', d: 'System activity is logged so you always know what changed and when in your practice.' },
                            { t: 'Secure Authentication', d: 'JWT-based authentication with encrypted password storage and session management.' },
                            { t: 'Encrypted Document Storage', d: 'Case documents stored using encrypted cloud infrastructure, accessible only to authorized users.' },
                        ].map(({ t, d }) => (
                            <div key={t} className="lp-reliability-card">
                                <div className="lp-reliability-icon"><Ic.Check /></div>
                                <div className="lp-title-md">{t}</div>
                                <div className="lp-text-sm">{d}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </LandingLayout>
    );
};

export default Security;
