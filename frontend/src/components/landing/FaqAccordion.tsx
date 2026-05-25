import { useState } from 'react';
import { Ic } from './LandingIcons';

// ─── FAQ Accordion Sub-Component ────────────────────────────────────────────
export const FaqAccordion = ({ revealRef }: { revealRef: (el: HTMLElement | null) => void }) => {
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    const faqs = [
        { 
            q: 'What exactly is Juriq, and how does it help independent advocates?', 
            a: 'Juriq is an organized digital workspace designed specifically for solo advocates and independent legal practitioners in India. Instead of juggling loose paper diaries, scattered WhatsApp files, and Excel sheets, Juriq centralizes your entire case lifecycles, court hearing histories, legal research files, client directory, and case billing into a secure, cohesive interface.' 
        },
        { 
            q: 'Is Juriq designed for multi-lawyer firms or solo practitioners?', 
            a: 'Juriq is built from the ground up for the individual advocate. We intentionally optimize the workflows for solo chambers, independent legal consultants, and junior lawyers managing active litigation on their own. Multi-user shared chambers, junior associate access, and firm collaboration features are actively planned and will be introduced in our upcoming workspace modules.' 
        },
        { 
            q: 'What is the status of the AI legal research and drafting tools?', 
            a: 'We believe in absolute transparency. AI features such as case summaries, AI legal research assistants, and intelligent draft generation are currently under active development. They are not yet in the production dashboard. Upcoming AI features are clearly labeled "Coming Soon" and will roll out progressively to ensure high accuracy and strict alignment with Indian legal protocols.' 
        },
        { 
            q: 'How does Juriq protect my confidential client data?', 
            a: 'Your case and client records are protected by industry-standard security. Juriq utilizes robust JWT authentication, encrypted password hashing, CSRF security middleware, role-ready architecture, and encrypted cloud document storage. All systems are engineered to respect the confidentiality demands of the Indian legal ecosystem, including DPDP-aware security practices.' 
        },
        { 
            q: 'Does Juriq support document storage for case files?', 
            a: 'Yes. Every case matter created has a dedicated, secure Document Vault. You can upload relevant pleadings, orders, petitions, and evidence files directly within the case details, giving you an organized digital folder that you can reference instantly in court.' 
        },
        { 
            q: 'Can I start using Juriq for free?', 
            a: 'Absolutely. You can create your free individual workspace in seconds with no credit card required. Our primary features—such as case management, client notes, court calendars, and billing tracking—are fully accessible so you can organize your practice right away.' 
        },
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
