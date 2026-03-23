import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingLayout from '@/components/layout/LandingLayout';
import { Ic } from '@/components/landing/LandingIcons';


const CookiePolicy = () => {
    const navigate = useNavigate();
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

    return (
        <LandingLayout>
            {/* ══ CONTENT ═════════════════════════════════════════════════════════════ */}
            <section className="lp-sec">
                <div className="lp-sec-inner !max-w-4xl">
                    <div className="lp-sec-hd lp-reveal" ref={r(0)}>
                        <p className="lp-sec-label">Info Center</p>
                        <h1 className="lp-sec-title">Cookie Policy</h1>
                        <p className="lp-sec-sub">How we use cookies to improve your workspace</p>
                    </div>

                    <div className="space-y-12 lp-reveal" ref={r(1)}>
                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">What Are Cookies</h2>
                            <p className="lp-text-p">
                                Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently and provide a better experience for users.
                            </p>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Use of Cookies</h2>
                            <p className="lp-text-p mb-4">Juriq uses cookies specifically for the following essential purposes:</p>
                            <ul className="list-disc pl-6 space-y-4 lp-text-p">
                                <li><strong>Authentication:</strong> We use cookies to identify you when you log in, allowing you to access your secure legal workspace.</li>
                                <li><strong>Preferences:</strong> We use cookies to remember your interface preferences, such as light/dark mode settings.</li>
                                <li><strong>Performance:</strong> Basic session management to maintain platform stability during your session.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">User Control</h2>
                            <p className="lp-text-p">
                                Most web browsers allow you to control cookies through their settings. You can set your browser to refuse cookies or delete them at any time. However, please note that disabling essential cookies will prevent you from logging into Juriq and using the platform's core management features.
                            </p>
                        </section>

                        <section>
                            <h2 className="lp-title-lg text-xl! mb-4">Third-Party Cookies</h2>
                            <p className="lp-text-p">
                                Juriq avoids the use of invasive third-party tracking cookies. Any analytics cookies we may use are focused strictly on platform performance and stability.
                            </p>
                        </section>
                    </div>
                </div>
            </section>

            {/* ══ FINAL CTA ═══════════════════════════════════════════════════════════ */}
            <div className="lp-cta-wrap">
                <div className="lp-cta-card lp-reveal" ref={r(2)}>
                    <div className="lp-cta-glow" aria-hidden="true" />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="lp-hero-badge" style={{ margin: '0 auto 22px' }}>
                            <span className="lp-badge-dot" aria-hidden="true" />
                            Free to start, no credit card required
                        </div>
                        <h2 className="lp-cta-title">Start Organizing Your<br />Legal Practice</h2>
                        <p className="lp-cta-sub">Juriq provides a structured digital system for managing cases, documents, and hearings. Join advocates who have moved from scattered folders to a professional legal workspace.</p>
                        <div className="lp-cta-actions">
                            <button className="lp-btn lp-btn-gold-lg" onClick={() => go('/signup')}>Create Account <Ic.Arrow /></button>
                            <button className="lp-btn lp-btn-outline-lg" onClick={() => go('/login')}>Login</button>
                        </div>
                        <p className="lp-cta-note">Secure setup, Built for Indian advocates, No credit card required</p>
                    </div>
                </div>
            </div>
        </LandingLayout>
    );
};

export default CookiePolicy;
