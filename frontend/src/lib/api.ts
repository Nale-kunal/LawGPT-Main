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
        try { apiOrigin = new URL(apiUrl, currentOrigin).origin; } catch (e) { }
      }

      isSameOrigin = requestOrigin === currentOrigin || (apiOrigin !== '' && requestOrigin === apiOrigin);
    } catch (e) {
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
      } catch (e) {
        // Silently continue; if token generation failed, backend will naturally reject the request
      }
    }

    if (token) {
      headers.set('X-CSRF-Token', token);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // ALWAYS set
  });

  // 401 Handling: Trigger centralized auth reset, clear tokens/state, do not reload.
  // We skip intercepting 401s on the explicitly auth endpoints so refresh logic can handle it gracefully.
  const isAuthEndpoint = url.includes('/api/v1/auth/') || url.includes('/api/auth/');
  if (response.status === 401 && !isAuthEndpoint) {
    // Dispatch centralized auth event for any listeners
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  return response;
}

/**
 * Make an API request with proper error handling and automatic JSON parsing.
 */
export async function apiRequest<T = any>(
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
