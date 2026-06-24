import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';

const POLICY_VERSION = '1.0';
const EFFECTIVE_DATE = '1 June 2026';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
        <h2 className="lp-title-lg text-xl! mb-4">{title}</h2>
        <div className="lp-text-p space-y-3">{children}</div>
    </section>
);

const RefundPolicy = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isDashboard = location.pathname.startsWith('/dashboard');
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
    const go = (p: string) => navigate(p);

    const content = (
        <div className="space-y-12">

            <Section title="1. Refund Eligibility Window">
                <p>
                    Juriq offers a <strong>7-day refund window</strong> from the date of the first charge for a new subscription plan. If you are not satisfied with your subscription within 7 days of your first payment, you may request a full refund of that payment.
                </p>
                <p>
                    Subsequent renewal charges are <strong>not eligible for refunds</strong> unless otherwise required by applicable law.
                </p>
            </Section>

            <Section title="2. How to Request a Refund">
                <p>To request a refund, email us at:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Email:</strong> support@juriq.in</li>
                    <li><strong>Subject:</strong> Refund Request — [Your Registered Email]</li>
                    <li><strong>Include:</strong> Your Razorpay Payment ID (found in your payment confirmation email or invoice) and a brief reason for the request.</li>
                </ul>
                <p>We will acknowledge your request within <strong>24 business hours</strong> and process eligible refunds within <strong>5–7 business days</strong>.</p>
            </Section>

            <Section title="3. Refund Processing">
                <ul className="list-disc pl-6 space-y-2">
                    <li>Approved refunds are processed via Razorpay to the <strong>original payment instrument</strong> used at the time of purchase (credit card, debit card, UPI, net banking).</li>
                    <li>Bank processing times of 5–7 business days apply after Juriq initiates the refund. Some banks may take up to 10 business days.</li>
                    <li>Refund amounts will be the full subscription charge, inclusive of any GST paid.</li>
                </ul>
            </Section>

            <Section title="4. Non-Refundable Circumstances">
                <p>Refunds are <strong>not</strong> available in the following circumstances:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>The 7-day refund window has elapsed from the date of the subscription charge;</li>
                    <li>The request is for a renewal charge (as opposed to a first-time charge);</li>
                    <li>The subscription was purchased using a promotional coupon code providing free or heavily discounted access;</li>
                    <li>The account has been suspended or terminated for violation of our <Link to={isDashboard ? "/dashboard/terms" : "/terms"} className="text-primary hover:underline">Terms of Service</Link>;</li>
                    <li>The request is for a partial billing period (Juriq does not prorate refunds for unused days within a billing period).</li>
                </ul>
            </Section>

            <Section title="5. Anti-Abuse">
                <p>
                    Juriq reserves the right to deny refund requests from accounts that have previously received refunds or that exhibit patterns consistent with refund abuse (e.g., repeatedly subscribing and refunding). In such cases, the account may be flagged and future subscription purchases may be declined.
                </p>
                <p>
                    All refund decisions made by Juriq are final and binding.
                </p>
            </Section>

            <Section title="6. Cancellation vs. Refund">
                <p>
                    Cancelling your subscription is separate from requesting a refund:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Cancellation</strong> stops future renewal charges. Your access continues until the end of the current billing period. No refund is issued for the remaining period.</li>
                    <li><strong>Refund</strong> returns a payment already made, subject to the eligibility conditions above.</li>
                </ul>
                <p>You may cancel your subscription at any time via <strong>Settings → Subscription → Cancel Plan</strong>.</p>
            </Section>

            <Section title="7. Consumer Protection">
                <p>
                    This policy does not limit any rights you have under applicable Indian consumer protection law, including the Consumer Protection Act, 2019. If you believe your statutory rights are not being honoured, you may contact the relevant consumer dispute redressal forum.
                </p>
            </Section>

            <Section title="8. Contact">
                <p>
                    For refund requests or questions about this policy:<br />
                    <strong>Email:</strong> support@juriq.in<br />
                    <strong>Subject:</strong> Refund Request or Refund Policy — [Your Query]<br />
                    <strong>Response time:</strong> Within 24 business hours
                </p>
            </Section>

        </div>
    );

    if (isDashboard) {
        return (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Refund Policy</h1>
                    <p className="text-xs text-muted-foreground">
                        Version {POLICY_VERSION} &mdash; Effective {EFFECTIVE_DATE}
                    </p>
                </div>
                <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm max-h-[calc(100vh-10rem)] overflow-y-auto">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <LandingLayout>
            <section className="lp-sec">
                <div className="lp-sec-inner !max-w-4xl">
                    <div className="lp-sec-hd lp-reveal" ref={r(0)}>
                        <p className="lp-sec-label">Legal Center</p>
                        <h1 className="lp-sec-title">Refund Policy</h1>
                        <p className="lp-sec-sub">
                            Version {POLICY_VERSION} &mdash; Effective {EFFECTIVE_DATE}
                        </p>
                    </div>

                    <div className="lp-reveal" ref={r(1)}>
                        {content}
                    </div>
                </div>
            </section>

            <div className="lp-cta-wrap">
                <div className="lp-cta-card lp-reveal" ref={r(2)}>
                    <div className="lp-cta-glow" aria-hidden="true" />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="lp-hero-badge" style={{ margin: '0 auto 22px' }}>
                            <span className="lp-badge-dot" aria-hidden="true" />
                            7-day refund window on all plans
                        </div>
                        <h2 className="lp-cta-title">Try Juriq Risk-Free</h2>
                        <p className="lp-cta-sub">Start with our free plan, or upgrade knowing you have a 7-day refund guarantee on your first subscription payment.</p>
                        <div className="lp-cta-actions">
                            <button className="lp-btn lp-btn-gold-lg" onClick={() => go('/signup')}>Create Free Account <Ic.Arrow /></button>
                            <button className="lp-btn lp-btn-outline-lg" onClick={() => go('/login')}>Login</button>
                        </div>
                        <p className="lp-cta-note">No credit card required for free plan · Cancel anytime</p>
                    </div>
                </div>
            </div>
        </LandingLayout>
    );
};

export default RefundPolicy;
