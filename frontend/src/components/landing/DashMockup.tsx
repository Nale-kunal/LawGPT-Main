import { Ic } from './LandingIcons';

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────
export const DashMockup = () => (
    <div className="lp-mock lp-anim-float">
        <div className="lp-mock-bar">
            <span className="lp-mock-dot lp-mock-dot-r" />
            <span className="lp-mock-dot lp-mock-dot-y" />
            <span className="lp-mock-dot lp-mock-dot-g" />
            <div className="lp-mock-url">app.juriq.in / dashboard</div>
        </div>
        <div className="lp-mock-body">
            <div className="lp-mock-sidebar">
                {[
                    { icon: <Ic.FileText />, label: 'Dashboard', act: true },
                    { icon: <Ic.Briefcase />, label: 'Cases', act: false },
                    { icon: <Ic.Users />, label: 'Clients', act: false },
                    { icon: <Ic.Calendar />, label: 'Calendar', act: false },
                    { icon: <Ic.Book />, label: 'Research', act: false },
                    { icon: <Ic.Note />, label: 'Notes', act: false },
                    { icon: <Ic.Billing />, label: 'Billing', act: false },
                ].map(item => (
                    <div key={item.label} className={`lp-mock-sb-item ${item.act ? 'act' : ''}`}>
                        {item.icon}<span>{item.label}</span>
                    </div>
                ))}
            </div>
            <div className="lp-mock-main">
                <div className="lp-mock-title">
                    <span>Case Dashboard</span>
                    <span className="lp-mock-btn">+ New Case</span>
                </div>
                <div className="lp-mock-kpis">
                    {[
                        { lbl: 'Active Cases', val: '24', sub: '+3 this month' },
                        { lbl: 'Hearings Soon', val: '7', sub: '2 tomorrow' },
                        { lbl: 'Clients', val: '38', sub: '+5 this month' },
                    ].map(k => (
                        <div key={k.lbl} className="lp-mock-kpi">
                            <div className="lp-mock-kpi-lbl">{k.lbl}</div>
                            <div className="lp-mock-kpi-val">{k.val}</div>
                            <div className="lp-mock-kpi-sub">{k.sub}</div>
                        </div>
                    ))}
                </div>
                <div className="lp-mock-rows">
                    {[
                        { name: 'Sharma vs. State of Maharashtra', type: 'Criminal', status: 'Active', color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
                        { name: 'Kapoor Divorce Proceedings', type: 'Family', status: 'Hearing', color: '#facc15', bg: 'rgba(234,179,8,0.12)' },
                        { name: 'Tata Industries vs. Gupta Ltd.', type: 'Civil', status: 'Review', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
                    ].map(c => (
                        <div key={c.name} className="lp-mock-row">
                            <span className="lp-mock-row-dot" style={{ background: c.color }} />
                            <span className="lp-mock-row-name">{c.name}</span>
                            <span className="lp-mock-row-type">{c.type}</span>
                            <span className="lp-mock-badge" style={{ background: c.bg, color: c.color }}>{c.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);
