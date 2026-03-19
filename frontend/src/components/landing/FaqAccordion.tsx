import { useState } from 'react';
import { Ic } from './LandingIcons';

// ─── FAQ Accordion Sub-Component ────────────────────────────────────────────
export const FaqAccordion = ({ revealRef }: { revealRef: (el: HTMLElement | null) => void }) => {
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    const faqs = [
        { q: 'What is LegalPro?', a: 'LegalPro is a professional case management platform built specifically for Indian advocates and solo legal practitioners. It provides structured tools for managing cases, clients, hearings, documents, notes, and billing in one organized workspace.' },
        { q: 'Who is LegalPro designed for?', a: 'LegalPro is designed primarily for solo advocates, independent legal consultants, and young lawyers starting their practice in India. It is optimized for individual practitioners managing multiple active cases.' },
        { q: 'Does LegalPro support law firms?', a: 'LegalPro currently supports individual advocate workspaces. Multi-user law firm collaboration with shared access and role management is on the product roadmap and will be available in a future update.' },
        { q: 'Are AI features available?', a: 'AI-powered features including case summaries, AI-assisted legal research, and drafting assistance are currently under active development. They are not yet available in the production platform. All upcoming AI features are clearly labeled "Coming Soon".' },
        { q: 'Is my case data secure?', a: 'Yes. LegalPro uses JWT-based authentication, encrypted password storage, role-based access control, CSRF protection middleware, and encrypted cloud document storage to protect your case data at every layer.' },
        { q: 'Can I store documents in LegalPro?', a: 'Yes. LegalPro includes a case-linked Document Vault where you can upload and store documents directly within each case. Documents are stored using secure, encrypted cloud storage and are accessible only to authorized users.' },
    ];
    return (
        <div className="lp-faq-list lp-reveal" ref={revealRef}>
            {faqs.map((f, i) => (
                <div key={i} className={`lp-faq-item${openIdx === i ? ' open' : ''}`}>
                    <button className="lp-faq-q" onClick={() => setOpenIdx(openIdx === i ? null : i)} aria-expanded={openIdx === i}>
                        <span className="lp-faq-q-text">{f.q}</span>
                        <span className="lp-faq-chevron"><Ic.ChevronDown /></span>
                    </button>
                    <div className="lp-faq-a">{f.a}</div>
                </div>
            ))}
        </div>
    );
};
