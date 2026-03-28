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

createRoot(document.getElementById("root")!).render(<App />);

