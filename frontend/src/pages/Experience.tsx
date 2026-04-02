import { useEffect, useRef } from 'react';
import LandingLayout from '@/components/layout/LandingLayout';
import { BrandLogo } from '@/components/ui/BrandLogo';

const Experience = () => {
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
            {/* ══ REAL LEGAL WORKFLOW ══════════════════════════════════════════════════ */}
            <section className="lp-sec" id="legal-workflow" aria-labelledby="lwf-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(43)}>
                        <p className="lp-sec-label">Real Legal Workflow</p>
                        <h2 id="lwf-heading" className="lp-sec-title">Built Around Real Legal Workflow</h2>
                        <p className="lp-sec-sub">Juriq mirrors how advocates actually manage legal work from client onboarding to final judgment.</p>
                    </div>
                    <div className="lp-wf-timeline lp-reveal" ref={r(44)}>
                        {[
                            { n: '1', t: 'Client Registration', d: 'Register client details and identification records.' },
                            { n: '2', t: 'Case Creation', d: 'Structured case files with court details and parties.' },
                            { n: '3', t: 'Hearing Scheduling', d: 'Track hearings and record proceedings.' },
                            { n: '4', t: 'Strategy Notes', d: 'Internal case strategy and evidence references.' },
                            { n: '5', t: 'Document Management', d: 'Case-linked document vault and storage.' },
                            { n: '6', t: 'Billing & Invoicing', d: 'Generate invoices and track payments.' },
                            { n: '7', t: 'Export & Reporting', d: 'Professional legal summaries and exports.' },
                        ].map(s => (
                            <div key={s.t} className="lp-wf-tl-item">
                                <div className="lp-wf-tl-num">{s.n}</div>
                                <div className="lp-title-md" style={{ marginBottom: 4 }}>{s.t}</div>
                                <div className="lp-text-sm">{s.d}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ PRODUCT WALKTHROUGH ════════════════════════════════════════════════════ */}
            <section className="lp-sec lp-sec-alt" id="walkthrough" aria-labelledby="walk-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(20)}>
                        <p className="lp-sec-label">Product Walkthrough</p>
                        <h2 id="walk-heading" className="lp-sec-title">How Juriq Works</h2>
                        <p className="lp-sec-sub">Get organized in minutes. No training required.</p>
                    </div>
                    <div className="lp-steps-grid lp-reveal" ref={r(21)}>
                        {[
                            { n: '1', t: 'Create Your Account', d: 'Sign up and set up your Juriq advocate profile in minutes.' },
                            { n: '2', t: 'Register Your Clients', d: 'Add client details, contact information, and identification records.' },
                            { n: '3', t: 'Create & Organize Cases', d: 'Build structured case files with court details, parties, and case type.' },
                            { n: '4', t: 'Schedule & Track Hearings', d: 'Add hearing dates, record outcomes, and get a full calendar view.' },
                            { n: '5', t: 'Upload Documents & Notes', d: 'Attach case documents and maintain internal strategy notes per case.' },
                            { n: '6', t: 'Export & Invoice', d: 'Generate professional case summaries and billing invoices.' },
                        ].map(s => (
                            <div key={s.t} className="lp-step-card">
                                <div className="lp-step-num-row">
                                    <div className="lp-step-circle">{s.n}</div>
                                    <div className="lp-title-md" style={{ marginBottom: 0 }}>{s.t}</div>
                                </div>
                                <div className="lp-text-p">{s.d}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ INTERFACE PREVIEW ═════════════════════════════════════════════════════ */}
            <section className="lp-sec" id="screenshots" aria-labelledby="ss-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(67)}>
                        <p className="lp-sec-label">Interface Preview</p>
                        <h2 id="ss-heading" className="lp-sec-title">See Juriq in Action</h2>
                        <p className="lp-sec-sub">A preview of the organized, professional interface your practice will run on.</p>
                    </div>
                    <div className="lp-screens-grid lp-reveal" ref={r(68)}>
                        {/* Dashboard Mockup Summary */}
                        <div className="lp-screen-card">
                            <div className="lp-app-mock">
                                <div className="lp-app-sidebar">
                                    <div className="lp-app-logo-row"><BrandLogo size={14} className="rounded-none bg-black" /><div className="lp-app-logo-text">Juriq</div></div>
                                    <div className="lp-app-nav-label">Navigation</div>
                                    {['Dashboard', 'Cases', 'Calendar', 'Clients', 'Legal Research', 'Billing', 'Documents', 'Notes'].map((item, i) => (
                                        <div key={item} className={`lp-app-nav-item${i === 0 ? ' active' : ''}`}><div className="lp-app-nav-dot" />{item}</div>
                                    ))}
                                </div>
                                <div className="lp-app-main">
                                    <div className="lp-app-topbar">
                                        <div><div className="lp-app-page-title">Welcome back, Advocate</div></div>
                                        <div className="lp-app-topbar-icons"><div className="lp-app-icon-circle" /><div className="lp-app-icon-circle gold" /></div>
                                    </div>
                                    <div className="lp-app-content">
                                        <div className="lp-app-kpi-row">
                                            <div className="lp-app-kpi"><div className="lp-app-kpi-val">12</div><div className="lp-app-kpi-key">Active Cases</div></div>
                                            <div className="lp-app-kpi"><div className="lp-app-kpi-val gold">4</div><div className="lp-app-kpi-key">Hearings Due</div></div>
                                            <div className="lp-app-kpi"><div className="lp-app-kpi-val">19</div><div className="lp-app-kpi-key">Clients</div></div>
                                        </div>
                                        <div className="lp-app-table-hd">Recent Cases</div>
                                        {[{ n: 'Sharma v State', s: 'Active', c: 'HC Delhi' }, { n: 'Kapoor Civil 04', s: 'Hearing', c: 'Dist Court' }, { n: 'IT v Tata Ltd', s: 'Pending', c: 'HC Mumbai' }].map(r => (
                                            <div key={r.n} className="lp-app-table-row">
                                                <div className="lp-app-tr-name">{r.n}</div>
                                                <div className="lp-app-tr-court">{r.c}</div>
                                                <div className={`lp-app-tr-badge${r.s === 'Hearing' ? ' gold' : ''}`}>{r.s}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="lp-screen-bottom">
                                <div className="lp-title-md" style={{ marginBottom: 4 }}>Case Dashboard</div>
                                <div className="lp-text-sm">Unified overview of all active cases, hearings, and client count.</div>
                            </div>
                        </div>

                        {/* Legal Calendar Mockup */}
                        <div className="lp-screen-card">
                            <div className="lp-app-mock">
                                <div className="lp-app-sidebar">
                                    <div className="lp-app-logo-row"><BrandLogo size={14} className="rounded-none bg-black" /><div className="lp-app-logo-text">Juriq</div></div>
                                    <div className="lp-app-nav-label">Navigation</div>
                                    {['Dashboard', 'Cases', 'Calendar', 'Clients', 'Legal Research', 'Billing', 'Documents', 'Notes'].map((item, i) => (
                                        <div key={item} className={`lp-app-nav-item${i === 2 ? ' active' : ''}`}><div className="lp-app-nav-dot" />{item}</div>
                                    ))}
                                </div>
                                <div className="lp-app-main">
                                    <div className="lp-app-topbar">
                                        <div><div className="lp-app-page-title">Legal Calendar</div><div className="lp-app-page-sub">Court hearings and important dates</div></div>
                                        <div className="lp-app-btn-gold">+ Schedule Hearing</div>
                                    </div>
                                    <div className="lp-app-content">
                                        <div className="lp-app-cal-header"><span className="lp-app-cal-month">March 2026</span><div style={{ display: 'flex', gap: 4 }}><div className="lp-app-cal-arrow" /><div className="lp-app-cal-arrow" /></div></div>
                                        <div className="lp-app-cal-days">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="lp-app-cal-day-hd">{d}</div>)}</div>
                                        <div className="lp-app-cal-grid">
                                            {Array.from({ length: 35 }).map((_, i) => {
                                                const evts = [{ i: 6, col: '#D4AF37' }, { i: 14, col: '#D4AF37', col2: '#3b82f6', warn: true }, { i: 15, col: '#ef4444', warn: true }, { i: 16, today: true }, { i: 20, col: '#D4AF37' }];
                                                const ev = evts.find(e => e.i === i);
                                                return (
                                                    <div key={i} className={`lp-app-cal-cell${ev && ev.today ? ' today' : ''}`}>
                                                        <span className="lp-app-cal-num">{i < 31 ? i + 1 : ''}</span>
                                                        {ev && ev.col && <div className="lp-app-cal-dot" style={{ background: ev.col }} />}
                                                        {ev && ev.col2 && <div className="lp-app-cal-dot" style={{ background: ev.col2 }} />}
                                                        {ev && ev.warn && <div className="lp-app-cal-warn">!</div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="lp-screen-bottom">
                                <div className="lp-title-md" style={{ marginBottom: 4 }}>Legal Calendar</div>
                                <div className="lp-text-sm">Monthly calendar with colour-coded hearings, conflict flags, and scheduling.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </LandingLayout>
    );
};

export default Experience;
