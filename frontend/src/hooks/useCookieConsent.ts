/**
 * useCookieConsent.ts
 *
 * Exposes:
 *   - consentGiven: boolean  — whether valid consent is stored
 *   - reopenBanner(): void   — fires a CustomEvent that CookieBanner listens to
 *
 * Security: this hook only triggers a UI event. No cookies are set or cleared here.
 * Actual consent persistence is handled exclusively by CookieBanner's saveConsent().
 */

import { useEffect, useState } from 'react';

const LOCAL_STORAGE_KEY     = 'juriq_cookie_consent';
const COOKIE_CONSENT_VERSION = '1.0';
const REOPEN_EVENT           = 'juriq:cookie-banner:reopen';

export function useCookieConsent() {
  const [consentGiven, setConsentGiven] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      return parsed?.version === COOKIE_CONSENT_VERSION;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Stay in sync if another tab clears storage
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          setConsentGiven(parsed?.version === COOKIE_CONSENT_VERSION);
        } catch {
          setConsentGiven(false);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const reopenBanner = () => {
    window.dispatchEvent(new CustomEvent(REOPEN_EVENT));
  };

  return { consentGiven, reopenBanner };
}

export { REOPEN_EVENT };
