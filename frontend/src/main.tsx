import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Initialise Sentry before anything else renders
// No-ops if VITE_SENTRY_DSN is not set in .env
initSentry();

let lastErrorTime = 0;
let isSendingError = false;

const recentErrors = new Map();
const ERROR_TTL = 60000; // 60 sec

function shouldLogError(key: string) {
  const now = Date.now();
  if (recentErrors.has(key)) {
    return false;
  }
  recentErrors.set(key, now);
  setTimeout(() => {
    recentErrors.delete(key);
  }, ERROR_TTL);
  return true;
}

window.onerror = async (message, source, lineno, colno, error) => {
  const errorKey = `${message}-${source}-${lineno}`;
  if (!shouldLogError(errorKey)) return;

  const now = Date.now();
  if (now - lastErrorTime < 5000) return; // 5 sec throttle
  lastErrorTime = now;

  if (isSendingError) return;
  isSendingError = true;

  try {
    await fetch('/api/v1/logs/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'error',
        message,
        source,
        line: lineno,
        col: colno,
        stack: error?.stack
      })
    });
  } catch (_e) {
    // silently ignore to avoid recursion
  }

  isSendingError = false;
};

async function initApp() {
  const p = window.location.pathname;
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(p) || p === '/';

  // Update status text if it exists (placed in index.html)
  const setStatus = (text: string) => {
    const el = document.querySelector('.loader-text');
    if (el) el.textContent = text;
  };

  // GLOBAL AUTH GUARD (RUN BEFORE RENDER)
  if (isAuthPage) {
    try {
      // If we take more than 1.5s, update the text to show we are waking up the vault
      const wakeTimer = setTimeout(() => setStatus('Waking up secure vault...'), 1500);
      
      const res = await fetch('/api/v1/auth/validate', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      clearTimeout(wakeTimer);

      // Check if we got HTML instead of JSON (Render Waking Up page)
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        setStatus('Server warming up... please wait');
        // Retry once after 3s or just let it fall through to React
        await new Promise(r => setTimeout(r, 3000));
        window.location.reload(); // Hard reload is often the best recovery for Render's intercept
        return;
      }

      const data = await res.json();
      if (data.authenticated) {
        // HARD REDIRECT
        setStatus('Redirecting to dashboard...');
        window.location.replace('/dashboard');
        return; // Prevent render
      }
    } catch (_err) {
      // allow fallback to standard react behaviors
      console.warn('Auth validation failed, falling back to app render');
    }
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

initApp();
