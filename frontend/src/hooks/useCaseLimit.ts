import { useState, useEffect } from 'react';
import { getApiUrl, apiFetch } from '@/lib/api';

interface CaseLimitInfo {
  plan:         string;
  used:         number;
  limit:        number | null;   // null = unlimited
  remaining:    number | null;
  reachedLimit: boolean;
}

/**
 * useCaseLimit
 * ─────────────
 * Returns the user's current case usage vs plan limit.
 * Useful for showing "3 / 5 cases used" in the Cases page.
 */
export function useCaseLimit() {
  const [data, setData]       = useState<CaseLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await apiFetch(getApiUrl('/api/v1/cases/limit'), { credentials: 'include' });
      if (res.ok) { setData(await res.json()); }
    } catch { /* fail silently */ }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  return { data, loading, refresh };
}
