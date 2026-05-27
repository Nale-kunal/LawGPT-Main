/**
 * boot.js — Synchronous pre-React boot script
 *
 * Runs before React mounts. Handles:
 *  1. Theme sync: reads localStorage and sets .dark / .light on <html>
 *     to prevent FOUC (Flash of Unstyled Content).
 *  2. Auth guard: redirects authenticated users away from public-only routes
 *     on BFCache restore (back/forward navigation).
 *
 * This file is intentionally plain JS (no imports, no bundler dependencies)
 * so it can be loaded as a synchronous <script src> before the React bundle.
 * Vite includes it in the build with a content-hash, making it CSP-safe
 * without unsafe-inline.
 */
(function () {
  // ── 1. Theme Sync ──────────────────────────────────────────────────────────
  var sk = 'legal-pro-theme';
  var t = localStorage.getItem(sk) || 'system';
  var r = document.documentElement;
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var isDark = t === 'dark' || (t === 'system' && prefersDark);
  if (isDark) {
    r.classList.add('dark');
  } else {
    r.classList.add('light');
  }

  // ── 2. Auth Guard (BFCache / Sync Redirect) ────────────────────────────────
  var p = window.location.pathname;
  var isPublicRoute = (
    p === '/' ||
    p === '/login' ||
    p === '/signup' ||
    p === '/forgot-password' ||
    p === '/reset-password'
  );
  if (isPublicRoute && document.cookie.indexOf('is_authenticated=true') !== -1) {
    window.location.replace('/dashboard');
  }
})();
