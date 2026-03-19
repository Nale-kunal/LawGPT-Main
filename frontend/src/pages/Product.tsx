import { useEffect, useRef } from 'react';
import { Ic } from '@/components/landing/LandingIcons';
import LandingLayout from '@/components/layout/LandingLayout';

const Product = () => {
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
            {/* ══ CORE FEATURES ══════════════════════════════════════════════════════ */}
            <section className="lp-sec" id="features" aria-labelledby="feat-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd lp-reveal" ref={r(11)}>
                        <p className="lp-sec-label">Core Platform</p>
                        <h2 id="feat-heading" className="lp-sec-title">
                            Every tool a law firm needs,<br />designed to work together
                        </h2>
                        <p className="lp-sec-sub">
                            Purpose-built modules that mirror how legal professionals actually work — not generic project management tools forced into legal shape.
                        </p>
                    </div>

                    <div className="lp-feat-grid lp-reveal" ref={r(12)}>
                        {[
                            {
                                Icon: Ic.Briefcase,
                                title: 'Case Management',
                                desc: 'Create, track and manage every case with structured workflows. Attach documents, add notes, log hearings, and track case status from filing to verdict.',
                                tag: 'Core Module',
                            },
                            {
                                Icon: Ic.Users,
                                title: 'Client Portal',
                                desc: 'Maintain a complete client registry with contact details, linked cases, billing history and communication logs. Know every client at a glance.',
                                tag: 'Relationships',
                            },
                            {
                                Icon: Ic.Calendar,
                                title: 'Court Calendar',
                                desc: 'Visual calendar with court date tracking, hearing reminders, and conflict detection. Never miss a hearing or filing deadline again.',
                                tag: 'Scheduling',
                            },
                            {
                                Icon: Ic.Book,
                                title: 'Legal Research',
                                desc: 'Access Indian legal knowledge base, case precedents, and statute references directly inside LegalPro. Supports your argument building instantly.',
                                tag: 'AI-Assisted',
                            },
                            {
                                Icon: Ic.Note,
                                title: 'Legal Notes',
                                desc: 'Rich-text legal notepad with case linking, PDF/Word export, and structured formatting for briefs, affidavits, and internal memos.',
                                tag: 'Documents',
                            },
                            {
                                Icon: Ic.Billing,
                                title: 'Billing & Invoicing',
                                desc: 'Generate professional invoices, track payments, manage retainers and log billable hours — all tied directly to your client and case records.',
                                tag: 'Finance',
                            },
                            {
                                Icon: Ic.Export,
                                title: 'Document Export',
                                desc: 'Export legal documents as polished PDFs or Word files with professional formatting. Ready for court, client, or co-counsel.',
                                tag: 'Exports',
                            },
                            {
                                Icon: Ic.Robot,
                                title: 'AI Legal Assistant',
                                desc: 'AI-powered research, case summarization, and legal writing assistance built directly into your workspace — no context switching needed.',
                                tag: 'AI Layer',
                            },
                        ].map(({ Icon, title, desc, tag }) => (
                            <div key={title} className="lp-feat-card">
                                <div className="lp-feat-icon"><Icon /></div>
                                <h3 className="lp-title-lg">{title}</h3>
                                <p className="lp-text-p">{desc}</p>
                                <div className="lp-feat-tag">● {tag}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CASE PIPELINE ══════════════════════════════════════════════════════ */}
            <section className="lp-sec lp-sec-alt" id="pipeline" aria-labelledby="pipe-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd lp-reveal" ref={r(45)}>
                        <p className="lp-sec-label">Case Pipeline</p>
                        <h2 id="pipe-heading" className="lp-sec-title">Track Case Progress Clearly</h2>
                        <p className="lp-sec-sub">Every legal matter progresses through multiple stages. LegalPro lets you track these stages through a structured case pipeline so nothing falls through the cracks.</p>
                    </div>
                    <div className="lp-pipeline-row lp-reveal" ref={r(46)}>
                        {[
                            { n: '01', t: 'Client Registered', s: 'Identity & contact captured' },
                            { n: '02', t: 'Case Filed', s: 'Court & parties documented' },
                            { n: '03', t: 'Hearing Scheduled', s: 'Dates on calendar' },
                            { n: '04', t: 'Under Review', s: 'Strategy & notes active' },
                            { n: '05', t: 'Judgment Pending', s: 'Final arguments filed' },
                            { n: '06', t: 'Closed', s: 'Order received & archived' },
                        ].map(st => (
                            <div key={st.n} className="lp-pipeline-stage">
                                <div className="lp-pipeline-badge">{st.n}</div>
                                <div className="lp-title-md" style={{ marginBottom: 4 }}>{st.t}</div>
                                <div className="lp-text-sm">{st.s}</div>
                            </div>
                        ))}
                    </div>
                    <div className="lp-pipeline-features lp-reveal" ref={r(47)}>
                        {['Custom case milestones', 'Structured case lifecycle', 'Clear visual progress tracking'].map(f => (
                            <div key={f} className="lp-pipeline-feat"><span className="lp-pipeline-feat-dot" />{f}</div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ HEARING MANAGEMENT ══════════════════════════════════════════════════ */}
            <section className="lp-sec" id="hearings" aria-labelledby="hear-heading">
                <div className="lp-sec-inner">
                    <div className="lp-hearing-split lp-reveal" ref={r(48)}>
                        <div>
                            <p className="lp-sec-label">Hearing Management</p>
                            <h2 id="hear-heading" className="lp-sec-title">Never Miss a Hearing</h2>
                            <p className="lp-sec-sub" style={{ marginBottom: 28 }}>LegalPro provides a calendar-based system to track every hearing and identify scheduling overlaps across multiple courts.</p>
                            <div className="lp-hearing-features">
                                {[
                                    { Icon: Ic.Calendar, t: 'Hearing Timeline Tracking', d: 'Every hearing date logged against its case with full context.' },
                                    { Icon: Ic.Shield, t: 'Conflict Detection Alerts', d: 'Overlapping hearing dates are flagged so you can reschedule in time.' },
                                    { Icon: Ic.Map, t: 'Calendar Overview', d: 'Monthly and weekly views across all active cases and courts.' },
                                ].map(({ Icon, t, d }) => (
                                    <div key={t} className="lp-hearing-feat">
                                        <div className="lp-hearing-feat-icon"><Icon /></div>
                                        <div><div className="lp-title-md" style={{ marginBottom: 2 }}>{t}</div><div className="lp-text-sm">{d}</div></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lp-cal-mock">
                            <div className="lp-cal-mock-header"><span>March 2026</span><span style={{ fontSize: 11, color: 'var(--lp-subtle)' }}>3 hearings this week</span></div>
                            <div className="lp-cal-mock-grid">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                    <div key={d} className="lp-cal-mock-cell" style={{ minHeight: 28, background: 'var(--lp-bg3)' }}>
                                        <div className="lp-cal-mock-day">{d}</div>
                                    </div>
                                ))}
                                {[{ d: '10', ev: 'Sharma HC', conflict: false }, { d: '11', ev: '', conflict: false }, { d: '12', ev: 'Kapoor FC', conflict: false }, { d: '13', ev: 'Tata Civil', conflict: true }, { d: '14', ev: 'Gupta Dist', conflict: true }, { d: '15', ev: '', conflict: false }, { d: '16', ev: '', conflict: false }].map((c, i) => (
                                    <div key={i} className={`lp-cal-mock-cell${c.ev ? ' has-event' : ''}`}>
                                        <div className="lp-cal-mock-day">{c.d}</div>
                                        {c.ev && !c.conflict && <div className="lp-cal-mock-event">{c.ev}</div>}
                                        {c.ev && c.conflict && <div className="lp-cal-mock-conflict">! {c.ev}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ DOCUMENT VAULT ══════════════════════════════════════════════════════ */}
            <section className="lp-sec lp-sec-alt" id="vault" aria-labelledby="vault-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd lp-reveal" ref={r(49)}>
                        <p className="lp-sec-label">Document Management</p>
                        <h2 id="vault-heading" className="lp-sec-title">Secure Case Document Vault</h2>
                        <p className="lp-sec-sub">LegalPro organizes every document directly within the case where it belongs.</p>
                    </div>
                    <div className="lp-vault-grid lp-reveal" ref={r(50)}>
                        {[
                            { Icon: Ic.Folder, title: 'Case-Linked Storage', desc: 'Every document is attached to its specific case file, no more hunting through generic folders.' },
                            { Icon: Ic.Lock, title: 'Secure Access Control', desc: 'Documents accessible only to the authorized advocate. Role-based access protects sensitive files.' },
                            { Icon: Ic.Cloud, title: 'Cloud Document Access', desc: 'Access your case documents securely from anywhere with encrypted cloud-based storage.' },
                        ].map(({ Icon, title, desc }) => (
                            <div key={title} className="lp-vault-card">
                                <div className="lp-vault-icon"><Icon /></div>
                                <div className="lp-title-md">{title}</div>
                                <div className="lp-text-p">{desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ WORKSPACE HUB ═══════════════════════════════════════════════════════ */}
            <section className="lp-sec" id="hub" aria-labelledby="hub-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd-center lp-reveal" ref={r(54)}>
                        <p className="lp-sec-label">All-in-One</p>
                        <h2 id="hub-heading" className="lp-sec-title">Your Entire Legal Practice in One Workspace</h2>
                        <p className="lp-sec-sub">LegalPro centralizes every essential component of legal practice management.</p>
                    </div>
                    <div className="lp-hub-grid lp-reveal" ref={r(55)}>
                        {[
                            { Icon: Ic.Briefcase, label: 'Cases', sub: 'Full case lifecycle tracking' },
                            { Icon: Ic.Users, label: 'Clients', sub: 'Organized client registry' },
                            { Icon: Ic.Calendar, label: 'Hearings', sub: 'Court calendar management' },
                            { Icon: Ic.Folder, label: 'Documents', sub: 'Secure case documents' },
                            { Icon: Ic.Note, label: 'Legal Notes', sub: 'Strategy & research notes' },
                            { Icon: Ic.Billing, label: 'Billing', sub: 'Invoicing & payment tracking' },
                        ].map(({ Icon, label, sub }) => (
                            <div key={label} className="lp-hub-item">
                                <div className="lp-hub-icon"><Icon /></div>
                                <div className="lp-title-md" style={{ marginBottom: 4 }}>{label}</div>
                                <div className="lp-text-sm">{sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ LEGAL REFERENCE ═════════════════════════════════════════════════════ */}
            <section className="lp-sec lp-sec-alt" id="reference" aria-labelledby="ref-heading">
                <div className="lp-sec-inner">
                    <div className="lp-sec-hd lp-reveal" ref={r(51)}>
                        <p className="lp-sec-label">Legal Reference</p>
                        <h2 id="ref-heading" className="lp-sec-title">Quick Legal Reference</h2>
                        <p className="lp-sec-sub">LegalPro includes an integrated reference system containing commonly used Indian laws, keeping key statutes accessible while you work on cases.</p>
                    </div>
                    <div className="lp-ref-chips lp-reveal" ref={r(52)}>
                        {['Indian Penal Code (IPC)', 'Criminal Procedure Code (CrPC)', 'Indian Contract Act', 'Code of Civil Procedure (CPC)', 'Indian Evidence Act', 'Negotiable Instruments Act', 'Transfer of Property Act', 'Specific Relief Act', 'Arbitration & Conciliation Act', 'Consumer Protection Act', 'Information Technology Act'].map(law => (
                            <div key={law} className="lp-ref-chip"><span className="lp-ref-chip-dot" />{law}</div>
                        ))}
                    </div>
                    <p className="lp-text-sm lp-reveal" ref={r(53)} style={{ marginTop: 20, color: 'var(--lp-subtle)' }}>Future updates will expand the legal reference database with more acts and case law summaries.</p>
                </div>
            </section>
        </LandingLayout>
    );
};

export default Product;
