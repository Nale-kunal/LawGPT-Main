import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';
import { useCookieConsent } from '@/hooks/useCookieConsent';

const POLICY_VERSION = '1.0';
const EFFECTIVE_DATE = '1 June 2026';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
        <h2 className="lp-title-lg text-xl! mb-4">{title}</h2>
        <div className="lp-text-p space-y-3">{children}</div>
    </section>
);

const CookiePolicy = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isDashboard = location.pathname.startsWith('/dashboard');
    const { reopenBanner } = useCookieConsent();
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

            <Section title="1. What Are Cookies">
                <p>
                    Cookies are small text files stored in your browser when you visit a website. They help the website remember your session and preferences. Juriq uses cookies minimally and only for the purposes described below.
                </p>
            </Section>

            <Section title="2. Cookies We Use">
                <p>Juriq uses <strong>only strictly necessary and functional cookies</strong>. We do not use advertising cookies, third-party tracking cookies, or behavioral profiling cookies.</p>

                <div className="overflow-x-auto mt-2">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 pr-4 font-semibold">Cookie Name</th>
                                <th className="text-left py-2 pr-4 font-semibold">Category</th>
                                <th className="text-left py-2 pr-4 font-semibold">Purpose</th>
                                <th className="text-left py-2 pr-4 font-semibold">Duration</th>
                                <th className="text-left py-2 font-semibold">Provider</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border/50">
                                <td className="py-2 pr-4 font-mono text-xs">token</td>
                                <td className="py-2 pr-4">Strictly Necessary</td>
                                <td className="py-2 pr-4">JWT access token for your authenticated session. HttpOnly, Secure (production), SameSite=Lax. Cannot be read by JavaScript.</td>
                                <td className="py-2 pr-4">15 minutes</td>
                                <td className="py-2">Juriq</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 pr-4 font-mono text-xs">refreshToken</td>
                                <td className="py-2 pr-4">Strictly Necessary</td>
                                <td className="py-2 pr-4">Long-lived JWT refresh token for renewing your session without re-logging in. HttpOnly, Secure (production), SameSite=Lax.</td>
                                <td className="py-2 pr-4">7 days</td>
                                <td className="py-2">Juriq</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 pr-4 font-mono text-xs">is_authenticated</td>
                                <td className="py-2 pr-4">Strictly Necessary</td>
                                <td className="py-2 pr-4">Client-readable boolean flag that allows the page to perform an instant redirect for authenticated users without an API call. Does not contain any sensitive data.</td>
                                <td className="py-2 pr-4">15 minutes</td>
                                <td className="py-2">Juriq</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 pr-4 font-mono text-xs">csrf-token</td>
                                <td className="py-2 pr-4">Strictly Necessary</td>
                                <td className="py-2 pr-4">Prevents Cross-Site Request Forgery attacks on authenticated requests (double-submit cookie pattern).</td>
                                <td className="py-2 pr-4">Session</td>
                                <td className="py-2">Juriq</td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4 font-mono text-xs">rzp_* cookies</td>
                                <td className="py-2 pr-4">Strictly Necessary</td>
                                <td className="py-2 pr-4">Set by Razorpay during payment checkout. Required for payment processing security.</td>
                                <td className="py-2 pr-4">Session</td>
                                <td className="py-2">Razorpay</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p className="mt-4 text-sm font-semibold">localStorage (not cookies)</p>
                <p className="text-sm text-muted-foreground">The following data is stored in your browser's <strong>localStorage</strong> (not cookies). localStorage data is not transmitted to our servers automatically and is only read by Juriq's own JavaScript:</p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li><strong className="font-mono text-xs">legal-pro-theme</strong> — Stores your light/dark mode preference. Persistent until you clear browser data.</li>
                    <li><strong className="font-mono text-xs">juriq_cookie_consent</strong> — Stores your cookie consent preferences locally so you are not prompted again. Persistent until you clear browser data or a new policy version is published.</li>
                </ul>
            </Section>

            <Section title="3. What We Do NOT Use">
                <ul className="list-disc pl-6 space-y-2">
                    <li>No advertising or retargeting cookies;</li>
                    <li>No third-party social media tracking pixels;</li>
                    <li>No behavioral profiling or cross-site tracking;</li>
                    <li>No analytics cookies that track individual users across sessions (any analytics are aggregated and anonymised at the infrastructure level).</li>
                </ul>
            </Section>

            <Section title="4. Strictly Necessary Cookies">
                <p>
                    Strictly necessary cookies are required for the platform to function. They enable core features such as authentication, CSRF protection, and session management. You cannot opt out of these cookies while using Juriq, as they are essential to the security of your account.
                </p>
            </Section>

            <Section title="5. Managing Cookies">
                <p>
                    You may manage or delete cookies through your browser settings. Note that disabling strictly necessary cookies (such as the session cookie) will prevent you from logging in and using the platform.
                </p>
                <p>
                    Most modern browsers allow you to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>View all cookies stored by a website;</li>
                    <li>Delete individual cookies or all cookies for a given domain;</li>
                    <li>Block third-party cookies by default.</li>
                </ul>
                <p>Refer to your browser's help documentation for specific instructions.</p>
            </Section>

            <Section title="6. Changes to This Policy">
                <p>
                    If we change the cookies we use or the purposes for which we use them, we will update this Cookie Policy and notify registered users. The version number at the top of this page will be incremented with each material change.
                </p>
            </Section>

            <Section title="7. Contact">
                <p>
                    For questions about our use of cookies:<br />
                    <strong>Email:</strong> support@juriq.in<br />
                    <strong>Subject:</strong> Cookie Policy — [Your Query]
                </p>
            </Section>

            {/* Cookie Settings Action — lets users re-open the consent banner from this page */}
            <section className="border border-primary/20 bg-primary/5 rounded-2xl p-6 space-y-3">
                <h2 className="lp-title-lg text-xl! mb-1">Cookie Settings</h2>
                <p className="lp-text-p">
                    You can review and update your cookie preferences at any time. Clicking the button below will open the cookie preferences panel so you can change your settings.
                </p>
                <button
                    id="open-cookie-settings-btn"
                    onClick={reopenBanner}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                    ⚙️ Open Cookie Settings
                </button>
                <p className="text-xs text-muted-foreground pt-1">
                    Strictly necessary cookies cannot be disabled as they are required for platform security and authentication.
                </p>
            </section>

        </div>
    );

    if (isDashboard) {
        return (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Cookie Policy</h1>
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
                        <h1 className="lp-sec-title">Cookie Policy</h1>
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
                            No tracking, no advertising cookies
                        </div>
                        <h2 className="lp-cta-title">Start Organizing Your<br />Legal Practice</h2>
                        <p className="lp-cta-sub">Juriq provides a structured digital system for managing cases, documents, and hearings. Join advocates who have moved from scattered folders to a professional legal workspace.</p>
                        <div className="lp-cta-actions">
                            <button className="lp-btn lp-btn-gold-lg" onClick={() => go('/signup')}>Create Account <Ic.Arrow /></button>
                            <button className="lp-btn lp-btn-outline-lg" onClick={() => go('/login')}>Login</button>
                        </div>
                        <p className="lp-cta-note">Secure setup · Built for Indian advocates · No credit card required</p>
                    </div>
                </div>
            </div>
        </LandingLayout>
    );
};

export default CookiePolicy;
