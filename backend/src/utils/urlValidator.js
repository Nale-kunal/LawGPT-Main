/**
 * urlValidator.js
 *
 * SSRF & Open-Redirect Prevention — URL Validation Utilities
 *
 * Provides strict URL allowlisting to prevent:
 *  - Server-Side Request Forgery (SSRF)
 *  - Open redirect attacks
 *  - javascript:, data:, file: protocol abuse
 *  - Internal network access via stored/user-supplied URLs
 *  - AWS/GCP/Azure metadata endpoint access
 *  - IDN homograph attacks
 *
 * Usage:
 *   import { isAllowedFetchUrl, validateCloudinaryUrl } from '../utils/urlValidator.js';
 */

import { env } from '../config/env.js';

// ── Private/reserved IP ranges ─────────────────────────────────────────────
// Covers RFC1918 private ranges, loopback, link-local, and cloud metadata IPs.
const PRIVATE_IP_PATTERNS = [
    /^localhost$/i,
    /^127\./,                 // 127.0.0.0/8 loopback
    /^0\.0\.0\.0$/,           // Unspecified address
    /^::1$/,                  // IPv6 loopback
    /^fc00:/i,                // IPv6 unique local
    /^fe80:/i,                // IPv6 link-local
    /^10\./,                  // RFC1918: 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./,  // RFC1918: 172.16.0.0/12
    /^192\.168\./,            // RFC1918: 192.168.0.0/16
    /^169\.254\./,            // Link-local (AWS EC2 metadata: 169.254.169.254)
    /^100\.64\./,             // Carrier-grade NAT
    /^198\.18\./,             // Benchmark testing
    /^198\.51\.100\./,        // TEST-NET-2 (RFC5737)
    /^203\.0\.113\./          // TEST-NET-3 (RFC5737)
];

// Cloud metadata endpoints by hostname
const METADATA_HOSTNAMES = new Set([
    'metadata.google.internal',      // GCP
    'metadata.internal',             // GCP alternative
    'computemetadata.internal',      // GCP
    '169.254.169.254',               // AWS/Azure/GCP metadata IP
    'fd00:ec2::254',                 // AWS IPv6 metadata
    'instance-data',                 // AWS internal
    'metadata.azure.internal',       // Azure
    '100.100.100.200',               // Alibaba Cloud metadata
]);

// Allowed protocols for fetch operations
const ALLOWED_FETCH_PROTOCOLS = new Set(['https:']);

// Allowed protocols for redirect destinations
const ALLOWED_REDIRECT_PROTOCOLS = new Set(['https:', 'http:']);

/**
 * Checks if a hostname resolves to a private/internal IP address.
 * Note: This only catches literal IP addresses in the URL — for hostname-based
 * attacks, DNS pinning/rebinding requires a network-layer firewall.
 * @param {string} hostname
 * @returns {boolean}
 */
function isPrivateHost(hostname) {
    // Remove IPv6 brackets
    const cleanHost = hostname.replace(/^\[/, '').replace(/\]$/, '');

    if (METADATA_HOSTNAMES.has(cleanHost)) {return true;}
    if (PRIVATE_IP_PATTERNS.some(pattern => pattern.test(cleanHost))) {return true;}

    // Detect non-ASCII (IDN homograph attempt)
    // eslint-disable-next-line no-control-regex
    if (/[^\x00-\x7F]/.test(cleanHost)) {return true;}

    return false;
}

/**
 * Validates that a URL is safe to fetch from the server.
 *
 * Blocks:
 *  - Non-HTTPS protocols
 *  - Private/internal IP ranges
 *  - Cloud metadata endpoints
 *  - Localhost / loopback
 *  - Non-ASCII hostnames (IDN homograph)
 *
 * @param {string} url - URL to validate
 * @returns {{ ok: boolean, error?: string }}
 */
export function isAllowedFetchUrl(url) {
    if (!url || typeof url !== 'string') {
        return { ok: false, error: 'URL must be a non-empty string' };
    }

    // Length guard
    if (url.length > 2048) {
        return { ok: false, error: 'URL exceeds maximum allowed length' };
    }

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return { ok: false, error: 'Invalid URL format' };
    }

    // Protocol allowlist — only HTTPS permitted for server-side fetch
    if (!ALLOWED_FETCH_PROTOCOLS.has(parsed.protocol)) {
        return { ok: false, error: `Protocol '${parsed.protocol}' is not allowed for server-side requests (HTTPS only)` };
    }

    // Private/internal host check
    if (isPrivateHost(parsed.hostname)) {
        return { ok: false, error: 'URL points to a private, internal, or reserved address' };
    }

    return { ok: true };
}

/**
 * Validates that a URL is a legitimate Cloudinary URL for the configured cloud.
 * This prevents SSRF via database-stored Cloudinary URLs being replaced with
 * attacker-controlled URLs.
 *
 * @param {string} url - URL to validate as a Cloudinary resource URL
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateCloudinaryUrl(url) {
    if (!url || typeof url !== 'string') {
        return { ok: false, error: 'URL must be a non-empty string' };
    }

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return { ok: false, error: 'Invalid URL format' };
    }

    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
        return { ok: false, error: 'Cloudinary URLs must use HTTPS' };
    }

    // Must be the official Cloudinary delivery hostname
    if (parsed.hostname !== 'res.cloudinary.com') {
        return { ok: false, error: 'URL is not from the Cloudinary CDN (res.cloudinary.com)' };
    }

    // If configured, verify the cloud name in the URL path
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    if (cloudName && !parsed.pathname.startsWith(`/${cloudName}/`)) {
        return { ok: false, error: `Cloudinary URL does not belong to configured cloud: ${cloudName}` };
    }

    // No private hosts (defense in depth — Cloudinary CDN should never be private)
    if (isPrivateHost(parsed.hostname)) {
        return { ok: false, error: 'URL points to a private address' };
    }

    return { ok: true };
}

/**
 * Validates an OAuth redirect URL against the configured allowed origins.
 * Prevents open redirect attacks in OAuth flows.
 *
 * @param {string} url - Redirect URL to validate
 * @param {string[]} allowedOrigins - Array of allowed origin strings
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateRedirectUrl(url, allowedOrigins = []) {
    if (!url || typeof url !== 'string') {
        return { ok: false, error: 'Redirect URL must be a non-empty string' };
    }

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return { ok: false, error: 'Invalid redirect URL format' };
    }

    // Protocol must be HTTP or HTTPS
    if (!ALLOWED_REDIRECT_PROTOCOLS.has(parsed.protocol)) {
        return { ok: false, error: `Protocol '${parsed.protocol}' is not allowed for redirects` };
    }

    // Origin must match one of the allowed origins
    const origin = parsed.origin; // e.g. "https://app.juriq.com"
    if (!allowedOrigins.includes(origin)) {
        return { ok: false, error: `Redirect origin '${origin}' is not in the allowed origins list` };
    }

    // Private host check
    if (isPrivateHost(parsed.hostname)) {
        return { ok: false, error: 'Redirect URL points to a private address' };
    }

    return { ok: true };
}

export default { isAllowedFetchUrl, validateCloudinaryUrl, validateRedirectUrl };
