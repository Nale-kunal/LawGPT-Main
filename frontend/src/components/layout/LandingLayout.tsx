import React, { useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Ic } from '@/components/landing/LandingIcons';
import '../../landing.css';

interface LandingLayoutProps {
    children: React.ReactNode;
}

const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const navRef = useRef<HTMLElement | null>(null);

    // Redirect if authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated) navigate('/dashboard', { replace: true });
    }, [isAuthenticated, isLoading, navigate]);

    // Sticky nav
    useEffect(() => {
        if (isLoading) return;
        const nav = navRef.current;
        if (!nav) return;
        const fn = () => nav.classList.toggle('scrolled', window.scrollY > 24);
        window.addEventListener('scroll', fn, { passive: true });
        fn(); // Initial check
        return () => window.removeEventListener('scroll', fn);
    }, [isLoading]);

    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    if (isLoading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0F19' }}>
            <div style={{ width: 28, height: 28, border: '2px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', animation: 'lp-spin 0.7s linear infinite' }} />
        </div>
    );


    return (
        <div className="lp-root">
            <a href="#main-content" className="skip-link">Skip to content</a>
            {/* ══ NAVBAR ══════════════════════════════════════════════════════════════ */}
            <nav className="lp-nav lp-nav-premium lp-anim-fade" ref={el => { navRef.current = el; }}>
                <Link className="lp-nav-logo lp-nav-logo-premium" to="/" aria-label="Juriq">
                    <div className="lp-nav-logo-icon lp-logo-premium-box" style={{ backgroundColor: '#000000' }}>
                        <BrandLogo size={18} className="rounded-none bg-[#000000]" />
                    </div>
                    <div className="lp-nav-logo-meta">
                        <span className="lp-nav-logo-text">Juriq</span>
                        <span className="lp-nav-logo-sub">Workspace for Independent Advocates</span>
                    </div>
                </Link>
                <ul className="lp-nav-links lp-nav-links-premium">
                    <li>
                        <Link className={`lp-nav-link-btn ${location.pathname === '/' ? 'lp-nav-active' : ''}`} to="/">
                            Home
                        </Link>
                    </li>
                    <li>
                        <Link className={`lp-nav-link-btn ${location.pathname === '/product' ? 'lp-nav-active' : ''}`} to="/product">
                            Product
                        </Link>
                    </li>
                    <li>
                        <Link className={`lp-nav-link-btn ${location.pathname === '/experience' ? 'lp-nav-active' : ''}`} to="/experience">
                            Experience
                        </Link>
                    </li>
                    <li>
                        <Link className={`lp-nav-link-btn ${location.pathname === '/security' ? 'lp-nav-active' : ''}`} to="/security">
                            Security
                        </Link>
                    </li>
                    <li>
                        <Link className={`lp-nav-link-btn ${location.pathname === '/about' ? 'lp-nav-active' : ''}`} to="/about">
                            About
                        </Link>
                    </li>
                </ul>
                <div className="lp-nav-right lp-nav-right-premium">
                    <ThemeToggle />
                    <button id="nav-login" className="lp-btn lp-btn-ghost lp-btn-ghost-premium" onClick={() => navigate('/login')}>Login</button>
                    <button id="nav-signup" className="lp-btn lp-btn-gold lp-btn-gold-premium" onClick={() => navigate('/signup')}>
                        <span>Get Started</span><Ic.Arrow />
                    </button>
                </div>
            </nav>

            <main id="main-content" className="lp-main-premium">
                {children}
            </main>

            {/* ══ FOOTER ══════════════════════════════════════════════════════════════ */}
            <footer className="lp-footer lp-footer-premium" role="contentinfo">
                <div className="lp-footer-top lp-footer-grid-premium">
                    <div className="lp-footer-brand-col">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div className="lp-nav-logo-icon" style={{ width: 28, height: 28, backgroundColor: '#000000' }}>
                                <BrandLogo size={16} className="rounded-none bg-[#000000]" />
                            </div>
                            <div>
                                <span className="lp-footer-brand-name">Juriq</span>
                                <span className="lp-footer-sub">Workspace for Independent Advocates</span>
                            </div>
                        </div>
                        <p className="lp-footer-brand-tag">An organized digital legal workspace built specifically for independent Indian advocates.</p>
                    </div>
                    <div className="lp-footer-nav-col">
                        <div className="lp-footer-col-title">Platform</div>
                        <div className="lp-footer-links-list">
                            {[
                                { lbl: 'Case Management', to: '/product#features' },
                                { lbl: 'Client Portal', to: '/client-portal' },
                                { lbl: 'Court Calendar', to: '/product#hearings' },
                                { lbl: 'Legal Research', to: '/product#features' },
                                { lbl: 'Legal Notes', to: '/legal-notes' },
                                { lbl: 'Billing', to: '/product#hub' }
                            ].map(item => (
                                <Link key={item.lbl} className="lp-footer-link-btn" to={item.to} style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0 }}>{item.lbl}</Link>
                            ))}
                        </div>
                    </div>
                    <div className="lp-footer-nav-col">
                        <div className="lp-footer-col-title">Legal</div>
                        <div className="lp-footer-links-list">
                            <Link className="lp-footer-link-btn" to="/privacy" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>Privacy Policy</Link>
                            <Link className="lp-footer-link-btn" to="/terms" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>Terms of Service</Link>
                            <Link className="lp-footer-link-btn" to="/data-processing" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>Data Processing</Link>
                            <Link className="lp-footer-link-btn" to="/cookie-policy" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>Cookie Policy</Link>
                            <Link className="lp-footer-link-btn" to="/security" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>Security</Link>
                        </div>
                    </div>
                    <div className="lp-footer-nav-col">
                        <div className="lp-footer-col-title">Account</div>
                        <div className="lp-footer-links-list">
                            <Link className="lp-footer-link-btn" to="/login" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0 }}>Login</Link>
                            <Link className="lp-footer-link-btn" to="/signup" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0 }}>Sign Up Free</Link>
                            <Link className="lp-footer-link-btn" to="/forgot-password" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0 }}>Forgot Password</Link>
                        </div>
                    </div>
                </div>
                <div className="lp-footer-bottom lp-footer-bottom-premium">
                    <span className="lp-footer-copy">&copy; 2026 Juriq. Handcrafted for modern advocates. All Rights Reserved.</span>
                    <span className="lp-footer-badge"><span className="lp-green-pulse-dot" style={{ color: '#22c55e' }}>●</span> Systems Operational</span>
                </div>
            </footer>
        </div>
    );
};

export default LandingLayout;
