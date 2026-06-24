/**
 * policyVersions.js
 * Shared policy version constants and requirements.
 */
import crypto from 'crypto';

export const POLICY_VERSIONS = {
  terms: '1.0',
  privacy: '1.0',
  'refund-policy': '1.0',
  'data-processing': '1.0',
  'cookie-policy': '1.0',
};

export const CANONICAL_POLICY_TEXT = {
  'terms:1.0': `Juriq Terms of Service v1.0 — Effective 1 June 2026. Juriq is a legal practice management software-as-a-service (SaaS) platform designed to assist enrolled advocates, law firm staff, and legal professionals. Juriq is not a law firm and does not provide legal advice, legal representation, or legal services. Advocates remain solely responsible for all legal judgments, client advice, strategy, filings, and professional obligations.`,
  'privacy:1.0': `Juriq Privacy Policy v1.0 — Effective 1 June 2026. Describes how Juriq collects, uses, stores, and protects personal data in accordance with the Information Technology Act 2000 and the Digital Personal Data Protection Act 2023 (India). Data is processed only for purposes consented to by the data principal. You may request access, correction, or erasure of your data.`,
  'refund-policy:1.0': `Juriq Refund Policy v1.0 — Effective 1 June 2026. 7-day refund window from first subscription charge. Contact support@juriq.in with Razorpay Payment ID. Renewals, coupon plans, and partial periods are not refundable.`,
  'data-processing:1.0': `Juriq Data Processing Agreement v1.0 — Effective 1 June 2026. Describes data controller/processor roles, sub-processors (Razorpay, MongoDB Atlas India), data localisation, technical security controls, and data subject rights under the DPDP Act 2023.`,
  'cookie-policy:1.0': `Juriq Cookie Policy v1.0 — Effective 1 June 2026. Juriq uses only strictly necessary and functional cookies. No advertising or third-party tracking cookies are used. You may control optional cookie categories through the cookie preference center.`,
};

/**
 * Compute SHA-256 of canonical policy text for a given policyType + version.
 * Returns null if no canonical text is defined (should never occur for released policies).
 */
export function computePolicyHash(policyType, version) {
  const key = `${policyType}:${version}`;
  const text = CANONICAL_POLICY_TEXT[key];
  if (!text) return null;
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export const REQUIRED_SIGNUP_CONSENTS = [
  {
    policyType: 'terms',
    version: POLICY_VERSIONS.terms,
    title: 'Terms of Service',
    fullTextUrl: '/terms',
    policyHash: computePolicyHash('terms', POLICY_VERSIONS.terms),
  },
  {
    policyType: 'privacy',
    version: POLICY_VERSIONS.privacy,
    title: 'Privacy Policy',
    fullTextUrl: '/privacy',
    policyHash: computePolicyHash('privacy', POLICY_VERSIONS.privacy),
  },
];

