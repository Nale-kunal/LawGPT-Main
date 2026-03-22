import React, { useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Scale } from 'lucide-react';
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
            {/* ══ NAVBAR ══════════════════════════════════════════════════════════════ */}
            <nav className="lp-nav lp-anim-fade" ref={el => { navRef.current = el; }}>
                <Link className="lp-nav-logo" to="/" aria-label="Juriq">
                    <div className="lp-nav-logo-icon">
                        <Scale className="lp-logo-icon" />
                    </div>
                    <div>
                        <span className="lp-nav-logo-text">Juriq</span>
                        <span className="lp-nav-logo-sub">Indian Law Management</span>
                    </div>
                </Link>
                <ul className="lp-nav-links">
                    <li><Link className="lp-nav-link-btn" to="/">Home</Link></li>
                    <li><Link className="lp-nav-link-btn" to="/product">Product</Link></li>
                    <li><Link className="lp-nav-link-btn" to="/experience">Experience</Link></li>
                    <li><Link className="lp-nav-link-btn" to="/security">Security</Link></li>
                    <li><Link className="lp-nav-link-btn" to="/about">About</Link></li>
                </ul>
                <div className="lp-nav-right">
                    <ThemeToggle />
                    <button id="nav-login" className="lp-btn lp-btn-ghost" onClick={() => navigate('/login')}>Login</button>
                    <button id="nav-signup" className="lp-btn lp-btn-gold" onClick={() => navigate('/signup')}>
                        <span>Get Started</span><Ic.Arrow />
                    </button>
                </div>
            </nav>

            <main>
                {children}
            </main>

            {/* ══ FOOTER ══════════════════════════════════════════════════════════════ */}
            <footer className="lp-footer" role="contentinfo">
                <div className="lp-footer-top">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <div className="lp-nav-logo-icon" style={{ width: 28, height: 28 }}><Scale className="lp-logo-icon" /></div>
                            <div><span className="lp-footer-brand-name">Juriq</span><span className="lp-footer-sub">Indian Law Management</span></div>
                        </div>
                        <p className="lp-footer-brand-tag">Professional case management for Indian advocates and legal professionals.</p>
                    </div>
                    <div>
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
                    <div>
                        <div className="lp-footer-col-title">Legal</div>
                        <div className="lp-footer-links-list">
                            <Link className="lp-footer-link-btn" to="/privacy" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>Privacy Policy</Link>
                            <Link className="lp-footer-link-btn" to="/terms" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>Terms of Service</Link>
                            <Link className="lp-footer-link-btn" to="/data-processing" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>Data Processing</Link>
                            <Link className="lp-footer-link-btn" to="/cookie-policy" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>Cookie Policy</Link>
                            <Link className="lp-footer-link-btn" to="/security" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>Security</Link>
                        </div>
                    </div>
                    <div>
                        <div className="lp-footer-col-title">Account</div>
                        <div className="lp-footer-links-list">
                            <Link className="lp-footer-link-btn" to="/login" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0 }}>Login</Link>
                            <Link className="lp-footer-link-btn" to="/signup" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0 }}>Sign Up Free</Link>
                            <Link className="lp-footer-link-btn" to="/forgot-password" style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0 }}>Forgot Password</Link>
                        </div>
                    </div>
                </div>
                <div className="lp-footer-bottom">
                    <span className="lp-footer-copy">2026 Juriq. All Rights Reserved.</span>
                    <span className="lp-footer-badge"><span style={{ color: '#22c55e' }}>*</span> Systems Operational</span>
                </div>
            </footer>
        </div>
    );
};

export default LandingLayout;
