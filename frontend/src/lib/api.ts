/**
 * API utility functions for making requests to the backend
 */

/**
 * Get the API base URL
 * In development: uses Vite proxy or VITE_API_URL
 * In production: returns relative path to leverage Vercel Proxy
 */
export function getApiUrl(path: string): string {
  // Use relative paths in production to leverage Vercel Proxy (vercel.json rewrites)
  if (import.meta.env.PROD) {
    // Ensure path starts with / if it doesn't already
    return path.startsWith('/') ? path : `/${path}`;
  }

  // In development, we might use an absolute URL or a relative path (Vite proxy)
  const baseUrl = import.meta.env.VITE_API_URL || '';

  // If the path already includes the base URL or is an absolute URL, return it
  if (path.startsWith('http')) return path;

  // Ensure we don't have double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
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
            document.cookie = `csrf-token=${encodeURIComponent(token)}; path=/; max-age=86400; samesite=strict`;
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

  const response = await fetchWithTimeout(url, {
    ...options,
    headers,
    credentials: 'include', // ALWAYS set
  }, 8000);

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
