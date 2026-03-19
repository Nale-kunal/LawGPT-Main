$src = Get-Content 'frontend\src\pages\Index.tsx' -Encoding UTF8
$out = [System.Collections.Generic.List[string]]::new()

# Line ranges in the ORIGINAL file (1-indexed):
# Line 1: import { useEffect, useRef } -> add useState
# Lines 89-94 (Export icon block end) -> add new icons
# Lines 217-218 (nav links) -> update nav
# After line 330 (trust bar closing div) -> insert Problem + Workflow sections
# After line 396 (after features section) -> insert Pipeline, Hearing, Vault, Ref, Hub
# Lines 397-422 (old 4-step workflow) -> replace with 6-step walkthrough
# After line 422 (after workflow) -> nothing (walkthrough replaces it)
# After line 448 (after security section) -> insert Tech, Audience, Philosophy, Reliability
# Lines 467..end (testimonials+CTA+footer) -> replace with new testimonials+roadmap+transparency+screenshots+FAQ+CTA+footer

# Helper: output lines [startIdx..endIdx] (0-indexed inclusive)
function Out-Lines($from, $to) {
    for ($i = $from; $i -le $to; $i++) { $out.Add($src[$i]) }
}

# --- Line 1 (0-indexed: 0): fix import ---
$out.Add("import { useEffect, useRef, useState } from 'react';")

# Lines 2..88 unchanged (1-indexed 2-89, 0-indexed 1-88)
Out-Lines 1 88

# After line 89 (0-indexed 88 = "  Export: icon..."), insert new icons before closing };
# Find the closing }; of the Ic object - it's at line 94 (0-indexed 93)
# Lines 89-93 = Export icon block
Out-Lines 89 93

# Insert new icons
$newIcons = @'
  Target: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Server: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  Database: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Cloud: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
  Code: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Globe: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Folder: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Map: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  UserCheck: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" />
    </svg>
  ),
'@
$newIcons.Split("`n") | ForEach-Object { $out.Add($_) }

# Line 94 (0-indexed 93) = "};" closing of Ic
Out-Lines 93 93

# Lines 95..216 (0-indexed 94..215) unchanged
Out-Lines 94 215

# Line 217 (0-indexed 216): update nav links line - skip old 4 lines (216-219), add new
# Old: { l: 'Features', id: 'features' }, { l: 'How it Works', id: 'workflow' }, { l: 'Security'... }, { l: 'Reviews'...},
$out.Add("          { l: 'Features', id: 'features' },")
$out.Add("            { l: 'Workflow', id: 'legal-workflow' },")
$out.Add("            { l: 'Security', id: 'security' },")
$out.Add("            { l: 'Screenshots', id: 'screenshots' },")
$out.Add("            { l: 'FAQ', id: 'faq' },")

# Skip old nav lines 216-219 (0-indexed), continue from 220
Out-Lines 220 329

# After line 330 (0-indexed 329) = trust bar closing </div> 
# Insert Problem + Workflow Timeline sections
$problemSection = @'

      {/* Problem Framing */}
      <section className="lp-sec" id="problem" aria-labelledby="prob-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(40)}>
            <p className="lp-sec-label">The Challenge</p>
            <h2 id="prob-heading" className="lp-sec-title">Legal Practice Should Not Be Chaotic</h2>
            <p className="lp-problem-intro">Many advocates manage legal work using a mix of spreadsheets, paper files, and scattered folders. As caseloads grow, this becomes increasingly difficult to maintain.</p>
          </div>
          <div className="lp-problem-grid lp-reveal" ref={r(41)}>
            {[
              { label: 'Scattered Documents', sub: 'Case files spread across folders, drives, and email attachments with no central system.' },
              { label: 'Missed Hearings', sub: 'No unified calendar means hearing dates are tracked manually, risking costly oversights.' },
              { label: 'Multiple Case Chaos', sub: 'Managing 20+ active cases simultaneously without structured tracking is error-prone.' },
              { label: 'Unstructured Research', sub: 'Legal notes and research saved in notebooks or random documents that are hard to retrieve.' },
              { label: 'Disorganized Clients', sub: 'Client contact details and matter history stored inconsistently across different tools.' },
            ].map(p => (
              <div key={p.label} className="lp-problem-card">
                <div className="lp-problem-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </div>
                <div className="lp-problem-label">{p.label}</div>
                <div className="lp-problem-sub">{p.sub}</div>
              </div>
            ))}
          </div>
          <div className="lp-problem-solution lp-reveal" ref={r(42)}>
            <div className="lp-problem-solution-icon"><Ic.Scale /></div>
            <div className="lp-problem-solution-text"><strong>LegalPro</strong> introduces a structured digital system built specifically for legal practice, replacing scattered tools with one organized workspace.</div>
          </div>
        </div>
      </section>

      {/* Real Legal Workflow Timeline */}
      <section className="lp-sec lp-sec-alt" id="legal-workflow" aria-labelledby="lwf-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(43)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Real Legal Workflow</p>
            <h2 id="lwf-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Built Around Real Legal Workflow</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>LegalPro mirrors how advocates actually manage legal work from client onboarding to final judgment.</p>
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
                <div className="lp-wf-tl-title">{s.t}</div>
                <div className="lp-wf-tl-desc">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
'@
$problemSection.Split("`n") | ForEach-Object { $out.Add($_) }

# Lines 330..395 unchanged (0-indexed 330-395 = original features + why sections)
Out-Lines 330 395

# After features (line 396, 0-indexed 395) insert Pipeline, Hearing, Vault, Reference, Hub
$middleSections = @'

      {/* Case Pipeline */}
      <section className="lp-sec" id="pipeline" aria-labelledby="pipe-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(45)}>
            <p className="lp-sec-label">Case Pipeline</p>
            <h2 id="pipe-heading" className="lp-sec-title">Track Case Progress Clearly</h2>
            <p className="lp-pipeline-desc">Every legal matter progresses through multiple stages. LegalPro lets you track these stages through a structured case pipeline so nothing falls through the cracks.</p>
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
                <div className="lp-pipeline-stage-title">{st.t}</div>
                <div className="lp-pipeline-stage-sub">{st.s}</div>
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

      {/* Hearing Management */}
      <section className="lp-sec lp-sec-alt" id="hearings" aria-labelledby="hear-heading">
        <div className="lp-sec-inner">
          <div className="lp-hearing-split lp-reveal" ref={r(48)}>
            <div>
              <p className="lp-sec-label">Hearing Management</p>
              <h2 id="hear-heading" className="lp-sec-title">Never Miss a Hearing</h2>
              <p className="lp-hearing-desc">LegalPro provides a calendar-based system to track every hearing and identify scheduling overlaps across multiple courts.</p>
              <div className="lp-hearing-features">
                {[
                  { Icon: Ic.Calendar, t: 'Hearing Timeline Tracking', d: 'Every hearing date logged against its case with full context.' },
                  { Icon: Ic.Shield, t: 'Conflict Detection Alerts', d: 'Overlapping hearing dates are flagged so you can reschedule in time.' },
                  { Icon: Ic.Map, t: 'Calendar Overview', d: 'Monthly and weekly views across all active cases and courts.' },
                ].map(({ Icon, t, d }) => (
                  <div key={t} className="lp-hearing-feat">
                    <div className="lp-hearing-feat-icon"><Icon /></div>
                    <div><div className="lp-hearing-feat-title">{t}</div><div className="lp-hearing-feat-desc">{d}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lp-cal-mock">
              <div className="lp-cal-mock-header"><span>March 2026</span><span style={{ fontSize: 11, color: 'var(--lp-subtle)' }}>3 hearings this week</span></div>
              <div className="lp-cal-mock-grid">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                  <div key={d} className="lp-cal-mock-cell" style={{ minHeight: 28, background: 'var(--lp-bg3)' }}>
                    <div className="lp-cal-mock-day">{d}</div>
                  </div>
                ))}
                {[{d:'10',ev:'Sharma HC',conflict:false},{d:'11',ev:'',conflict:false},{d:'12',ev:'Kapoor FC',conflict:false},{d:'13',ev:'Tata Civil',conflict:true},{d:'14',ev:'Gupta Dist',conflict:true},{d:'15',ev:'',conflict:false},{d:'16',ev:'',conflict:false}].map((c,i) => (
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

      {/* Document Vault */}
      <section className="lp-sec" id="vault" aria-labelledby="vault-heading">
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
                <div className="lp-vault-title">{title}</div>
                <div className="lp-vault-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal Reference Library */}
      <section className="lp-sec lp-sec-alt" id="reference" aria-labelledby="ref-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(51)}>
            <p className="lp-sec-label">Legal Reference</p>
            <h2 id="ref-heading" className="lp-sec-title">Quick Legal Reference</h2>
            <p className="lp-ref-desc">LegalPro includes an integrated reference system containing commonly used Indian laws, keeping key statutes accessible while you work on cases.</p>
          </div>
          <div className="lp-ref-chips lp-reveal" ref={r(52)}>
            {['Indian Penal Code (IPC)','Criminal Procedure Code (CrPC)','Indian Contract Act','Code of Civil Procedure (CPC)','Indian Evidence Act','Negotiable Instruments Act','Transfer of Property Act','Specific Relief Act','Arbitration & Conciliation Act','Consumer Protection Act','Information Technology Act'].map(law => (
              <div key={law} className="lp-ref-chip"><span className="lp-ref-chip-dot" />{law}</div>
            ))}
          </div>
          <p className="lp-ref-note lp-reveal" ref={r(53)}>Future updates will expand the legal reference database with more acts and case law summaries.</p>
        </div>
      </section>

      {/* Practice Management Hub */}
      <section className="lp-sec" id="hub" aria-labelledby="hub-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(54)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">All-in-One</p>
            <h2 id="hub-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Your Entire Legal Practice in One Workspace</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>LegalPro centralizes every essential component of legal practice management.</p>
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
                <div className="lp-hub-label">{label}</div>
                <div className="lp-hub-sub">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
'@
$middleSections.Split("`n") | ForEach-Object { $out.Add($_) }

# Lines 396-421 (0-indexed) = old "How it Works" 4-step section — REPLACE with 6-step walkthrough
$walkthrough = @'
      {/* Product Walkthrough */}
      <section className="lp-sec lp-sec-alt" id="walkthrough" aria-labelledby="walk-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(20)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Product Walkthrough</p>
            <h2 id="walk-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>How LegalPro Works</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>Get organized in minutes. No training required.</p>
          </div>
          <div className="lp-steps-grid lp-reveal" ref={r(21)}>
            {[
              { n: '1', t: 'Create Your Account', d: 'Sign up and set up your LegalPro advocate profile in minutes.' },
              { n: '2', t: 'Register Your Clients', d: 'Add client details, contact information, and identification records.' },
              { n: '3', t: 'Create & Organize Cases', d: 'Build structured case files with court details, parties, and case type.' },
              { n: '4', t: 'Schedule & Track Hearings', d: 'Add hearing dates, record outcomes, and get a full calendar view.' },
              { n: '5', t: 'Upload Documents & Notes', d: 'Attach case documents and maintain internal strategy notes per case.' },
              { n: '6', t: 'Export & Invoice', d: 'Generate professional case summaries and billing invoices.' },
            ].map(s => (
              <div key={s.t} className="lp-step-card">
                <div className="lp-step-num-row">
                  <div className="lp-step-circle">{s.n}</div>
                  <div className="lp-step-title">{s.t}</div>
                </div>
                <div className="lp-step-desc">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
'@
$walkthrough.Split("`n") | ForEach-Object { $out.Add($_) }

# Skip old 4-step workflow (0-indexed lines 396-421), continue from 422
Out-Lines 422 447

# After line 448 (0-indexed 447 = end of security section), insert Tech, Audience, Philosophy, Reliability
$techSections = @'

      {/* Technology Architecture */}
      <section className="lp-sec" id="technology" aria-labelledby="tech-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(56)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Technology</p>
            <h2 id="tech-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Built on Modern Technology</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>LegalPro uses a modern web stack designed for reliability, security, and performance.</p>
          </div>
          <div className="lp-tech-grid lp-reveal" ref={r(57)}>
            {[
              { Icon: Ic.Code,     layer: 'Frontend',  name: 'React + TypeScript', desc: 'Type-safe component architecture for a reliable, consistent UI.' },
              { Icon: Ic.Server,   layer: 'Backend',   name: 'Node.js + Express',  desc: 'Scalable REST API layer with JWT authentication and CSRF protection.' },
              { Icon: Ic.Database, layer: 'Database',  name: 'MongoDB',             desc: 'Flexible document database for structured legal data storage.' },
              { Icon: Ic.Cloud,    layer: 'Storage',   name: 'Cloud Storage',       desc: 'Encrypted cloud-based document storage for secure case file access.' },
            ].map(({ Icon, layer, name, desc }) => (
              <div key={name} className="lp-tech-card">
                <div className="lp-tech-icon"><Icon /></div>
                <div className="lp-tech-layer">{layer}</div>
                <div className="lp-tech-name">{name}</div>
                <div className="lp-tech-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It Is For */}
      <section className="lp-sec lp-sec-alt" id="audience" aria-labelledby="aud-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(58)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Who It Is For</p>
            <h2 id="aud-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Designed for Legal Professionals</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>Built specifically for the needs of individual advocates and independent legal consultants.</p>
          </div>
          <div className="lp-audience-grid lp-reveal" ref={r(59)}>
            <div className="lp-audience-card">
              <div className="lp-audience-icon"><Ic.UserCheck /></div>
              <div className="lp-audience-role">Primary Audience</div>
              <div className="lp-audience-title">Solo Advocates</div>
              <div className="lp-audience-desc">Individual advocates managing multiple cases across different courts. LegalPro gives you a single organized system for your entire practice.</div>
            </div>
            <div className="lp-audience-card">
              <div className="lp-audience-icon"><Ic.Briefcase /></div>
              <div className="lp-audience-role">Consultants</div>
              <div className="lp-audience-title">Independent Legal Consultants</div>
              <div className="lp-audience-desc">Legal consultants handling multiple client matters simultaneously. Track each matter independently within one organized workspace.</div>
            </div>
            <div className="lp-audience-card">
              <div className="lp-audience-icon"><Ic.Star /></div>
              <div className="lp-audience-role">New Practitioners</div>
              <div className="lp-audience-title">Young Lawyers Starting Practice</div>
              <div className="lp-audience-desc">Build professional legal workflows from day one. LegalPro gives you the structure to run a disciplined practice from the start.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Philosophy */}
      <section className="lp-sec" id="philosophy" aria-labelledby="phil-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(60)}>
            <p className="lp-sec-label">Design Philosophy</p>
            <h2 id="phil-heading" className="lp-sec-title">Designed for Legal Precision</h2>
            <p className="lp-philosophy-intro">LegalPro is not a generic productivity tool repurposed for law. It is built specifically for legal workflows, with every feature designed around how advocates actually work.</p>
          </div>
          <div className="lp-philosophy-list lp-reveal" ref={r(61)}>
            {[
              { t: 'Case-Based Organization', s: 'Every piece of information, documents, notes, hearings, clients, is organized within the case it belongs to.' },
              { t: 'Hearing-Driven Workflow', s: 'Hearings are the heartbeat of legal practice. The entire system is designed to help you never miss one.' },
              { t: 'Structured Legal Documentation', s: 'Notes, research, and strategy documents follow a structured format designed for legal professionals.' },
              { t: 'Secure Case Records', s: 'Case data is treated as confidential by design. Access is controlled, logged, and protected at every layer.' },
            ].map(({ t, s }) => (
              <div key={t} className="lp-philosophy-item">
                <div className="lp-philosophy-check"><Ic.Check /></div>
                <div><div className="lp-philosophy-text">{t}</div><div className="lp-philosophy-sub">{s}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Reliability */}
      <section className="lp-sec lp-sec-alt" id="reliability" aria-labelledby="rel-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(62)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Reliability</p>
            <h2 id="rel-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Built for Professional Legal Practice</h2>
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
                <div className="lp-reliability-title">{t}</div>
                <div className="lp-reliability-desc">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
'@
$techSections.Split("`n") | ForEach-Object { $out.Add($_) }

# Lines 448-531 (0-indexed) = original testimonials + CTA + footer — REPLACE entirely with new version
$finalSections = @'
      {/* Testimonials */}
      <section className="lp-sec lp-proof-bg" id="reviews">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(30)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">From the Community</p>
            <h2 className="lp-sec-title" style={{ textAlign: 'center' }}>Built for Legal Professionals</h2>
          </div>
          <div className="lp-reveal" ref={r(31)} style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="lp-proof-card" style={{ maxWidth: 680, width: '100%', textAlign: 'center', borderRadius: 'var(--lp-r)' }}>
              <p className="lp-proof-quote" style={{ fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 0 }}>
                LegalPro is currently evolving with feedback from legal professionals to build a modern case management system tailored for Indian advocates.
                <br /><br />
                Real user testimonials will appear here as the platform grows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Roadmap */}
      <section className="lp-sec" id="roadmap" aria-labelledby="road-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(64)}>
            <p className="lp-sec-label">Roadmap</p>
            <h2 id="road-heading" className="lp-sec-title">What is Coming Next</h2>
            <p className="lp-roadmap-intro">LegalPro will continue expanding with new capabilities. The following features are currently in development and will be released in future updates.</p>
          </div>
          <div className="lp-roadmap-items lp-reveal" ref={r(65)}>
            {[
              { t: 'AI-Powered Case Summaries', d: 'Automatically generate structured summaries of case history, hearings, and notes.' },
              { t: 'AI-Assisted Legal Research', d: 'Intelligent search and analysis across legal references and case materials.' },
              { t: 'AI Drafting Assistance', d: 'Draft legal correspondence and internal notes with AI-assisted writing tools.' },
              { t: 'Multi-User Law Firm Collaboration', d: 'Shared workspaces for small law firms with role-based access per user.' },
              { t: 'Advanced Practice Analytics', d: 'Insights into case outcomes, hearing frequency, and practice performance over time.' },
            ].map(({ t, d }) => (
              <div key={t} className="lp-roadmap-item">
                <div className="lp-roadmap-dot" />
                <div className="lp-roadmap-content">
                  <div><div className="lp-roadmap-title">{t}</div><div className="lp-roadmap-desc">{d}</div></div>
                  <span className="lp-coming-soon"><span className="lp-cs-dot" />Coming Soon</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency */}
      <section className="lp-sec lp-sec-alt" id="transparency" aria-labelledby="trans-heading">
        <div className="lp-sec-inner">
          <div className="lp-transparency-box lp-reveal" ref={r(66)}>
            <div>
              <h2 id="trans-heading" className="lp-transparency-title">Transparent Product Development</h2>
              <p className="lp-transparency-text">LegalPro focuses on building practical tools that help advocates manage legal work reliably. Artificial intelligence capabilities are currently under development and will be released in future updates. All AI features require your professional review before use.</p>
            </div>
            <div className="lp-transparency-tags">
              {['Production-grade authentication','No fabricated statistics','AI features clearly labeled','Honest capability descriptions'].map(tag => (
                <div key={tag} className="lp-transparency-tag"><span className="lp-transparency-tag-dot" />{tag}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots Preview */}
      <section className="lp-sec" id="screenshots" aria-labelledby="ss-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(67)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">Interface Preview</p>
            <h2 id="ss-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>See LegalPro in Action</h2>
            <p className="lp-sec-sub" style={{ textAlign: 'center' }}>A preview of the organized, professional interface your practice will run on.</p>
          </div>
          <div className="lp-screens-grid lp-reveal" ref={r(68)}>

            {/* Case Dashboard */}
            <div className="lp-screen-card">
              <div className="lp-app-mock">
                <div className="lp-app-sidebar">
                  <div className="lp-app-logo-row"><div className="lp-app-logo-icon" /><div className="lp-app-logo-text">LegalPro</div></div>
                  <div className="lp-app-nav-label">Navigation</div>
                  {['Dashboard','Cases','Calendar','Clients','Legal Research','Billing','Documents','Notes'].map((item, i) => (
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
                    {[{n:'Sharma v State',s:'Active',c:'HC Delhi'},{n:'Kapoor Civil 04',s:'Hearing',c:'Dist Court'},{n:'IT v Tata Ltd',s:'Pending',c:'HC Mumbai'}].map(r => (
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
                <div className="lp-screen-label">Case Dashboard</div>
                <div className="lp-screen-desc">Unified overview of all active cases, hearings, and client count.</div>
              </div>
            </div>

            {/* Legal Calendar */}
            <div className="lp-screen-card">
              <div className="lp-app-mock">
                <div className="lp-app-sidebar">
                  <div className="lp-app-logo-row"><div className="lp-app-logo-icon" /><div className="lp-app-logo-text">LegalPro</div></div>
                  <div className="lp-app-nav-label">Navigation</div>
                  {['Dashboard','Cases','Calendar','Clients','Legal Research','Billing','Documents','Notes'].map((item, i) => (
                    <div key={item} className={`lp-app-nav-item${i === 2 ? ' active' : ''}`}><div className="lp-app-nav-dot" />{item}</div>
                  ))}
                </div>
                <div className="lp-app-main">
                  <div className="lp-app-topbar">
                    <div><div className="lp-app-page-title">Legal Calendar</div><div className="lp-app-page-sub">Court hearings and important dates</div></div>
                    <div className="lp-app-btn-gold">+ Schedule Hearing</div>
                  </div>
                  <div className="lp-app-content">
                    <div className="lp-app-cal-header"><span className="lp-app-cal-month">March 2026</span><div style={{display:'flex',gap:4}}><div className="lp-app-cal-arrow" /><div className="lp-app-cal-arrow" /></div></div>
                    <div className="lp-app-cal-days">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="lp-app-cal-day-hd">{d}</div>)}</div>
                    <div className="lp-app-cal-grid">
                      {Array.from({length:35}).map((_,i) => {
                        const evts=[{i:6,col:'#D4AF37'},{i:14,col:'#D4AF37',col2:'#3b82f6',warn:true},{i:15,col:'#ef4444',warn:true},{i:16,today:true},{i:20,col:'#D4AF37'}];
                        const ev=evts.find(e=>e.i===i);
                        return (
                          <div key={i} className={`lp-app-cal-cell${ev && ev.today ? ' today' : ''}`}>
                            <span className="lp-app-cal-num">{i < 31 ? i+1 : ''}</span>
                            {ev && ev.col && <div className="lp-app-cal-dot" style={{background: ev.col}} />}
                            {ev && ev.col2 && <div className="lp-app-cal-dot" style={{background: ev.col2}} />}
                            {ev && ev.warn && <div className="lp-app-cal-warn">!</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="lp-screen-bottom">
                <div className="lp-screen-label">Legal Calendar</div>
                <div className="lp-screen-desc">Monthly calendar with colour-coded hearings, conflict flags, and scheduling.</div>
              </div>
            </div>

            {/* Document Management */}
            <div className="lp-screen-card">
              <div className="lp-app-mock">
                <div className="lp-app-sidebar">
                  <div className="lp-app-logo-row"><div className="lp-app-logo-icon" /><div className="lp-app-logo-text">LegalPro</div></div>
                  <div className="lp-app-nav-label">Navigation</div>
                  {['Dashboard','Cases','Calendar','Clients','Legal Research','Billing','Documents','Notes'].map((item, i) => (
                    <div key={item} className={`lp-app-nav-item${i === 6 ? ' active' : ''}`}><div className="lp-app-nav-dot" />{item}</div>
                  ))}
                </div>
                <div className="lp-app-main">
                  <div className="lp-app-topbar">
                    <div><div className="lp-app-page-title">Document Management</div><div className="lp-app-page-sub">Secure storage for all legal documents</div></div>
                    <div style={{display:'flex',gap:5}}><div className="lp-app-btn-ghost">New Folder</div><div className="lp-app-btn-gold">Upload</div></div>
                  </div>
                  <div className="lp-app-content">
                    <div className="lp-app-doc-cats">
                      {[{l:'All Files'},{l:'Images'},{l:'PDF & DOC'},{l:'Videos'}].map(c => (
                        <div key={c.l} className="lp-app-doc-cat"><div className="lp-app-doc-cat-val">0</div><div className="lp-app-doc-cat-lbl">{c.l}</div></div>
                      ))}
                    </div>
                    <div className="lp-app-table-hd" style={{marginTop:8}}>Folders</div>
                    <div className="lp-app-folder-row"><div className="lp-app-folder-icon" /><div className="lp-app-folder-info"><div className="lp-app-folder-name">CC-2024-002 - Megatron</div><div className="lp-app-folder-date">2025-02-21 10:43 PM</div></div></div>
                    <div className="lp-app-folder-row"><div className="lp-app-folder-icon" /><div className="lp-app-folder-info"><div className="lp-app-folder-name">TF-2026-001 - Optimus</div><div className="lp-app-folder-date">2026-02-21 2:58 AM</div></div></div>
                  </div>
                </div>
              </div>
              <div className="lp-screen-bottom">
                <div className="lp-screen-label">Document Management</div>
                <div className="lp-screen-desc">Case-linked document folders with upload, search, and secure access control.</div>
              </div>
            </div>

            {/* Client Registry */}
            <div className="lp-screen-card">
              <div className="lp-app-mock">
                <div className="lp-app-sidebar">
                  <div className="lp-app-logo-row"><div className="lp-app-logo-icon" /><div className="lp-app-logo-text">LegalPro</div></div>
                  <div className="lp-app-nav-label">Navigation</div>
                  {['Dashboard','Cases','Calendar','Clients','Legal Research','Billing','Documents','Notes'].map((item, i) => (
                    <div key={item} className={`lp-app-nav-item${i === 3 ? ' active' : ''}`}><div className="lp-app-nav-dot" />{item}</div>
                  ))}
                </div>
                <div className="lp-app-main">
                  <div className="lp-app-topbar">
                    <div><div className="lp-app-page-title">Clients</div><div className="lp-app-page-sub">All registered clients</div></div>
                    <div className="lp-app-btn-gold">+ Add Client</div>
                  </div>
                  <div className="lp-app-content">
                    <div className="lp-app-search-bar"><span style={{opacity:.4,fontSize:10}}>Search clients...</span></div>
                    {[{n:'Rajesh Sharma',m:'CC-2024-002',s:'Active'},{n:'Priya Kapoor',m:'FC-2025-007',s:'Active'},{n:'Arvind Tata',m:'CV-2026-001',s:'Pending'},{n:'Meera Gupta',m:'CR-2025-014',s:'Active'}].map(c => (
                      <div key={c.n} className="lp-app-client-row">
                        <div className="lp-app-avatar-sm">{c.n[0]}</div>
                        <div className="lp-app-client-info"><div className="lp-app-client-name">{c.n}</div><div className="lp-app-client-matter">{c.m}</div></div>
                        <div className={`lp-app-tr-badge${c.s === 'Active' ? ' gold' : ''}`}>{c.s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lp-screen-bottom">
                <div className="lp-screen-label">Client Registry</div>
                <div className="lp-screen-desc">Organized client profiles linked to case matters, with status and quick search.</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-sec lp-sec-alt" id="faq" aria-labelledby="faq-heading">
        <div className="lp-sec-inner">
          <div className="lp-sec-hd lp-reveal" ref={r(69)} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="lp-sec-label">FAQ</p>
            <h2 id="faq-heading" className="lp-sec-title" style={{ textAlign: 'center' }}>Frequently Asked Questions</h2>
          </div>
          <FaqAccordion revealRef={r(70)} />
        </div>
      </section>

      {/* Final CTA */}
      <div className="lp-cta-wrap">
        <div className="lp-cta-card lp-reveal" ref={r(38)}>
          <div className="lp-cta-glow" aria-hidden="true" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="lp-hero-badge" style={{ margin: '0 auto 22px', width: 'fit-content' }}>
              <span className="lp-badge-dot" aria-hidden="true" />
              Free to start, no credit card required
            </div>
            <h2 className="lp-cta-title">Start Organizing Your<br />Legal Practice</h2>
            <p className="lp-cta-sub">LegalPro provides a structured digital system for managing cases, documents, and hearings. Join advocates who have moved from scattered folders to a professional legal workspace.</p>
            <div className="lp-cta-actions">
              <button id="cta-signup" className="lp-btn lp-btn-gold-lg" onClick={() => go('/signup')}>Create Account <Ic.Arrow /></button>
              <button id="cta-login" className="lp-btn lp-btn-outline-lg" onClick={() => go('/login')}>Login</button>
            </div>
            <p className="lp-cta-note">Secure setup, Built for Indian advocates, No credit card required</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-footer-top">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div className="lp-nav-logo-icon" style={{ width: 28, height: 28 }}><Scale className="lp-logo-icon" /></div>
              <div><span className="lp-footer-brand-name">LegalPro</span><span className="lp-footer-sub">Indian Law Management</span></div>
            </div>
            <p className="lp-footer-brand-tag">Professional case management for Indian advocates and legal professionals.</p>
          </div>
          <div>
            <div className="lp-footer-col-title">Platform</div>
            <div className="lp-footer-links-list">
              {['Case Management','Client Portal','Court Calendar','Legal Research','Legal Notes','Billing'].map(lbl => (
                <button key={lbl} className="lp-footer-link-btn" onClick={() => scrollId('features')}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="lp-footer-col-title">Legal</div>
            <div className="lp-footer-links-list">
              {['Privacy Policy','Terms of Service','Data Processing','Cookie Policy','Security'].map(lbl => (
                <button key={lbl} className="lp-footer-link-btn">{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="lp-footer-col-title">Account</div>
            <div className="lp-footer-links-list">
              <button className="lp-footer-link-btn" onClick={() => go('/login')}>Login</button>
              <button className="lp-footer-link-btn" onClick={() => go('/signup')}>Sign Up Free</button>
              <button className="lp-footer-link-btn" onClick={() => go('/forgot-password')}>Forgot Password</button>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span className="lp-footer-copy">2026 LegalPro. All Rights Reserved.</span>
          <span className="lp-footer-badge"><span style={{ color: '#22c55e' }}>*</span> Systems Operational</span>
        </div>
      </footer>

    </div>
  );
};

export default Index;
'@
$finalSections.Split("`n") | ForEach-Object { $out.Add($_) }

# Write output
[System.IO.File]::WriteAllLines('frontend\src\pages\Index.tsx', $out, [System.Text.Encoding]::UTF8)
Write-Host "Done. Lines written: $($out.Count)"
