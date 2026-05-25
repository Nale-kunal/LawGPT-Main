import { Ic } from './LandingIcons';

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────
export const DashMockup = () => (
    <div className="lp-mock lp-mock-refined lp-anim-float">
        {/* Mock Title Bar */}
        <div className="lp-mock-bar">
            <div className="lp-mock-window-dots">
                <span className="lp-mock-dot lp-mock-dot-r" />
                <span className="lp-mock-dot lp-mock-dot-y" />
                <span className="lp-mock-dot lp-mock-dot-g" />
            </div>
            <div className="lp-mock-url-box">
                <span className="lp-mock-url-icon">🔒</span>
                <span className="lp-mock-url">app.juriq.in/dashboard</span>
            </div>
            <div className="lp-mock-bar-actions">
                <span className="lp-mock-mini-btn"></span>
            </div>
        </div>

        {/* Mock Application Frame */}
        <div className="lp-mock-body">
            {/* Sidebar Navigation */}
            <div className="lp-mock-sidebar lp-mock-sidebar-dense">
                <div className="lp-mock-sb-header">
                    <span className="lp-mock-sb-logo-dot" />
                    <span className="lp-mock-sb-header-text">Adv. Sharma</span>
                </div>
                <div className="lp-mock-sb-menu">
                    {[
                        { icon: <Ic.FileText />, label: 'Dashboard', act: true },
                        { icon: <Ic.Briefcase />, label: 'Cases', act: false },
                        { icon: <Ic.Users />, label: 'Clients', act: false },
                        { icon: <Ic.Calendar />, label: 'Calendar', act: false },
                        { icon: <Ic.Book />, label: 'Legal Research', act: false },
                        { icon: <Ic.Note />, label: 'Advocate Notes', act: false },
                        { icon: <Ic.Billing />, label: 'Billing & Fees', act: false },
                    ].map(item => (
                        <div key={item.label} className={`lp-mock-sb-item ${item.act ? 'act' : ''}`}>
                            <span className="lp-mock-item-icon">{item.icon}</span>
                            <span className="lp-mock-item-label">{item.label}</span>
                            {item.act && <span className="lp-mock-active-indicator" />}
                        </div>
                    ))}
                </div>
                <div className="lp-mock-sb-footer">
                    <span className="lp-mock-sb-footer-status">⚡ DPDP Secure</span>
                </div>
            </div>

            {/* Main Application Area */}
            <div className="lp-mock-main lp-mock-main-dense">
                {/* Dashboard Subheader */}
                <div className="lp-mock-title lp-mock-title-compact">
                    <div className="lp-mock-title-text-group">
                        <h2>Practice Overview</h2>
                        <p className="lp-mock-title-sub">Independent Workspace • Today: 25 May 2026</p>
                    </div>
                    <span className="lp-mock-btn lp-mock-btn-small">+ New Case File</span>
                </div>

                {/* KPI Metrics row */}
                <div className="lp-mock-kpis lp-mock-kpis-dense">
                    {[
                        { lbl: 'Active Cases', val: '24', sub: '+3 this month', trend: 'up' },
                        { lbl: 'Hearings (7 Days)', val: '7', sub: '2 scheduled tomorrow', trend: 'alert' },
                        { lbl: 'Pending Fees', val: '₹42,500', sub: '3 clients overdue', trend: 'warning' },
                    ].map(k => (
                        <div key={k.lbl} className="lp-mock-kpi lp-mock-kpi-compact">
                            <div className="lp-mock-kpi-header">
                                <span className="lp-mock-kpi-lbl">{k.lbl}</span>
                                <span className={`lp-mock-kpi-trend-dot lp-trend-${k.trend}`} />
                            </div>
                            <div className="lp-mock-kpi-val">{k.val}</div>
                            <div className="lp-mock-kpi-sub">{k.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Grid layout for structured dashboard modules */}
                <div className="lp-mock-content-grid">
                    {/* Active Cases & Matters List */}
                    <div className="lp-mock-grid-card lp-card-cases">
                        <div className="lp-mock-card-header">
                            <h3>Active Case Matters</h3>
                            <span className="lp-mock-badge-count">24 Total</span>
                        </div>
                        <div className="lp-mock-rows">
                            {[
                                { name: 'Sharma vs. State of Maharashtra', type: 'Criminal Appeal', court: 'High Court', status: 'Active Hearing', color: '#4ade80', bg: 'rgba(34,197,94,0.08)' },
                                { name: 'Kapoor vs. Kapoor Divorce Matter', type: 'Family Law', court: 'Family Court, Bandra', status: 'Next Hearing', color: '#facc15', bg: 'rgba(234,179,8,0.08)' },
                                { name: 'Tata Industries vs. Gupta Logistics', type: 'Civil Suit', court: 'Commercial Court', status: 'Written Statement', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
                            ].map(c => (
                                <div key={c.name} className="lp-mock-row lp-mock-row-compact">
                                    <div className="lp-mock-row-info">
                                        <div className="lp-mock-row-top">
                                            <span className="lp-mock-row-dot" style={{ background: c.color }} />
                                            <span className="lp-mock-row-name">{c.name}</span>
                                        </div>
                                        <div className="lp-mock-row-meta">
                                            <span>{c.type}</span> • <span className="lp-mock-row-court">{c.court}</span>
                                        </div>
                                    </div>
                                    <span className="lp-mock-badge lp-mock-badge-clean" style={{ background: c.bg, color: c.color }}>{c.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Hand Sidebar Widgets */}
                    <div className="lp-mock-grid-sidebar">
                        {/* Upcoming Hearings */}
                        <div className="lp-mock-grid-card lp-card-hearings">
                            <div className="lp-mock-card-header">
                                <h3>Upcoming Hearings</h3>
                            </div>
                            <div className="lp-mock-hearing-list">
                                {[
                                    { date: '26 May', title: 'Sharma vs. State', time: '10:30 AM', court: 'HC Courtroom 12' },
                                    { date: '26 May', title: 'Kapoor Divorce', time: '02:00 PM', court: 'FC Courtroom 3' },
                                ].map((h, idx) => (
                                    <div key={idx} className="lp-mock-hearing-item">
                                        <div className="lp-mock-hearing-date-box">
                                            <span className="lp-date-num">{h.date.split(' ')[0]}</span>
                                            <span className="lp-date-mon">{h.date.split(' ')[1]}</span>
                                        </div>
                                        <div className="lp-mock-hearing-info">
                                            <h4>{h.title}</h4>
                                            <p>{h.time} • {h.court}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activity Logs */}
                        <div className="lp-mock-grid-card lp-card-activity">
                            <div className="lp-mock-card-header">
                                <h3>Recent Workspace Activity</h3>
                            </div>
                            <div className="lp-mock-activity-list">
                                <div className="lp-mock-activity-item">
                                    <span className="lp-activity-bullet"></span>
                                    <p>Hearing date updated for <strong>Sharma vs. State</strong></p>
                                </div>
                                <div className="lp-mock-activity-item">
                                    <span className="lp-activity-bullet"></span>
                                    <p>Meeting notes saved for <strong>Kapoor matter</strong></p>
                                </div>
                                <div className="lp-mock-activity-item">
                                    <span className="lp-activity-bullet"></span>
                                    <p>Document <code>Written_Statement.pdf</code> uploaded</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
