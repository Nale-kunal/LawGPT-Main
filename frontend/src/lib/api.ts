/**
 * API utility functions for making requests to the backend
 */

/**
 * Get the API base URL for fetch() calls.
 *
 * Priority:
 *  1. VITE_API_URL env var (set to https://api.juriq.in in production)
 *     → browser makes request DIRECTLY to api.juriq.in with its own cookies
 *  2. Relative path fallback (Vercel proxy) when VITE_API_URL is not set
 *     NOTE: Vercel proxy is server-side — it cannot forward browser cookies
 *     for api.juriq.in, so auth will fail. Always set VITE_API_URL in prod.
 */
export function getApiUrl(path: string): string {
  // If path is already an absolute URL, return it as-is
  if (path.startsWith('http')) return path;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = import.meta.env.VITE_API_URL || '';

  // Use absolute URL when VITE_API_URL is configured (production & dev with env set)
  // This ensures the browser sends its own cookies directly to the backend host.
  if (baseUrl) return `${baseUrl}${cleanPath}`;

  // Fallback: relative path (works only if frontend and backend are same-origin)
  return cleanPath;
}

/**
 * Build an absolute backend URL for OAuth browser redirects (window.location.replace).
 * Always returns a full https://... URL — the browser must navigate directly to the
 * backend host, never through the Vercel proxy.
 */
export function getOAuthUrl(path: string): string {
  const backendBase =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? '' : 'http://localhost:5000');

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendBase}${cleanPath}`;
}


export const fetchWithTimeout = (url: string | URL, options = {}, timeout = 8000) => {
  return Promise.race([
    fetch(url, options as RequestInit),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeout)
    )
  ]);
};

/**
 * Helper to get the CSRF token from cookies
 */
export function getCsrfToken(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * A wrapper around native fetch that automatically appends the CSRF token 
 * to mutating requests (POST, PUT, PATCH, DELETE).
 */
export async function apiFetch(pathOrUrl: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(pathOrUrl);

  const headers = new Headers(options.headers);
  const method = (options.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  // Attach Request Tracing UUID consistently per session
  let requestId = sessionStorage.getItem('requestId');
  if (!requestId) {
    requestId = crypto.randomUUID();
    sessionStorage.setItem('requestId', requestId);
  }
  if (!headers.has('x-request-id')) {
    headers.set('x-request-id', requestId);
  }

  // Ensure we send JSON by default if body is present (unless it's FormData)
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach CSRF token
  // If url is relative, it is implicitly same-origin.
  let isSameOrigin = true;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const requestOrigin = new URL(url).origin;
      const currentOrigin = window.location.origin;
      const apiUrl = import.meta.env.VITE_API_URL;

      let apiOrigin = '';
      if (apiUrl) {
        try { apiOrigin = new URL(apiUrl, currentOrigin).origin; } catch { /* invalid VITE_API_URL — ignore */ }
      }

      isSameOrigin = requestOrigin === currentOrigin || (apiOrigin !== '' && requestOrigin === apiOrigin);
    } catch (_e) { // eslint-disable-line @typescript-eslint/no-unused-vars
      isSameOrigin = false;
    }
  }

  if (isMutating && isSameOrigin) {
    let token = getCsrfToken();

    // Automatically fetch a fresh token if missing after a fresh login or session expiration
    if (!token) {
      try {
        const csrfRes = await fetch(getApiUrl('/api/v1/auth/csrf-token'), { credentials: 'include' });
        if (csrfRes.ok) {
          const data = await csrfRes.json();
          token = data.csrfToken;
          if (token) {
            // Manually cache it in document.cookie so subsequent requests don't need to fetch it
            document.cookie = `csrf-token=${encodeURIComponent(token)}; path=/; max-age=86400; samesite=lax`;
          }
        }
      } catch (_e) { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Silently continue; if token generation failed, backend will naturally reject the request
      }
    }

    if (token) {
      headers.set('X-CSRF-Token', token);
    }
  }

  let response = await fetchWithTimeout(url, {
    ...options,
    headers,
    credentials: 'include', // ALWAYS set
  }, 8000);

  // CSRF Handling: If we get a 403 with CSRF error, the cached frontend token is stale.
  // We need to clear it, fetch a new one, and retry the request exactly once.
  if (response.status === 403 && isMutating) {
    try {
      const clonedRes = response.clone();
      const errBody = await clonedRes.json().catch(() => ({}));
      if (errBody.error === 'CSRF validation failed' || errBody.message?.includes('CSRF')) {
        console.warn('API 403 CSRF validation failed. Clearing stale token cache and retrying...');
        
        // 1. Clear the stale frontend cookie
        document.cookie = 'csrf-token=; path=/; max-age=0; samesite=strict';
        document.cookie = 'csrf-token=; path=/; max-age=0; samesite=none; secure';
        
        // 2. Fetch a fresh token
        const freshCsrfRes = await fetch(getApiUrl('/api/v1/auth/csrf-token'), { credentials: 'include' });
        if (freshCsrfRes.ok) {
          const freshData = await freshCsrfRes.json();
          const freshToken = freshData.csrfToken;
          if (freshToken) {
            document.cookie = `csrf-token=${encodeURIComponent(freshToken)}; path=/; max-age=86400; samesite=lax`;
            headers.set('X-CSRF-Token', freshToken);
            
            // 3. Retry the exactly identical robust request
            response = await fetchWithTimeout(url, {
              ...options,
              headers,
              credentials: 'include',
            }, 8000);
          }
        }
      }
    } catch (_csrfErr) {
      console.error('Failed to auto-recover from CSRF error.', _csrfErr);
    }
  }

  const resRequestId = response.headers.get("x-request-id");
  // Only log request IDs in dev, and skip noisy auth-check endpoints (401s there are expected)
  const isAuthCheckEndpoint = url.includes('/auth/me') || url.includes('/auth/refresh') || url.includes('/auth/validate');
  if ((import.meta.env.DEV || process.env.NODE_ENV === "development") && !isAuthCheckEndpoint) {
    console.warn("Request ID:", resRequestId);
  }

  // 401 Handling: Automatically attempt token refresh on 401 from non-auth endpoints
  const isAuthEndpoint = url.includes('/api/v1/auth/') || url.includes('/api/auth/');

  if (response.status === 401 && !isAuthEndpoint) {
    console.warn('API 401 Unauthorized encountered. Attempting token refresh...', { url, method });

    try {
      // 1. Attempt to refresh the token using the refresh token cookie
      const refreshRes = await fetch(getApiUrl('/api/v1/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-request-id': requestId as string // Reuse same request ID for tracing
        }
      });

      if (refreshRes.ok) {
        console.info('Token refreshed successfully. Retrying original request.');
        // 2. Retry the original request with the same parameters
        const retryResponse = await fetchWithTimeout(url, {
          ...options,
          headers,
          credentials: 'include',
        }, 8000);

        return retryResponse;
      } else {
        console.error('Token refresh failed. Dispatching auth:unauthorized.');
        // If refresh fails, original 401 should trigger global unauthorized event
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    } catch (refreshError) {
      console.error('Error during token refresh:', refreshError);
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }

  return response;

}

/**
 * Make an API request with proper error handling and automatic JSON parsing.
 */
export async function apiRequest<T = any>( // eslint-disable-line @typescript-eslint/no-explicit-any
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Convenience object for API requests
 */
const api = {
  get: <T = any>(path: string, options?: RequestInit) => apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T = any>(path: string, body?: any, options?: RequestInit) => 
    apiRequest<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T = any>(path: string, body?: any, options?: RequestInit) => 
    apiRequest<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = any>(path: string, body?: any, options?: RequestInit) => 
    apiRequest<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = any>(path: string, options?: RequestInit) => apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

export default api;
