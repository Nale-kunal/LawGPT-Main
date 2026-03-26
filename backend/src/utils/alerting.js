/**
 * Production alerting utility — Slack webhook (optional).
 * No-ops silently if SLACK_WEBHOOK_URL is not configured.
 * Uses native fetch (Node 18+) — zero additional dependencies.
 *
 * Usage:
 *   import { sendAlert } from '../utils/alerting.js';
 *   await sendAlert({ level: 'critical', title: 'CSRF Attack', message: '...', metadata: { ip } });
 */

/* global AbortSignal */
import logger from './logger.js';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

/**
 * @param {{ level: 'info'|'warning'|'critical', title: string, message: string, metadata?: Record<string,unknown> }} opts
 */
export async function sendAlert({ level = 'warning', title, message, metadata = {} }) {
  // Always log locally regardless of Slack config
  const logPayload = { alertLevel: level, alertTitle: title, ...metadata };
  if (level === 'critical') {
    logger.error(logPayload, `🚨 ALERT: ${title} — ${message}`);
  } else {
    logger.warn(logPayload, `⚠️  ALERT: ${title} — ${message}`);
  }

  // Slack webhook (optional — no-op if not configured)
  if (!SLACK_WEBHOOK_URL) {
    return;
  }

  const emoji = level === 'critical' ? '🚨' : level === 'warning' ? '⚠️' : 'ℹ️';
  const color = level === 'critical' ? '#cc0000' : level === 'warning' ? '#ff9900' : '#36a64f';

  const body = {
    attachments: [
      {
        color,
        fallback: `${emoji} [${level.toUpperCase()}] ${title}: ${message}`,
        title: `${emoji} ${title}`,
        text: message,
        fields: Object.entries(metadata).map(([key, value]) => ({
          title: key,
          value: String(value).slice(0, 200),
          short: true,
        })),
        footer: 'Juriq API',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000), // 5-second timeout — never block auth flow
    });
    if (!res.ok) {
      if (!SLACK_WEBHOOK_URL) { // Assuming webhookUrl in the instruction refers to SLACK_WEBHOOK_URL
        return;
      }
      logger.warn({ status: res.status }, 'Slack alert delivery failed (non-fatal)');
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Slack alert request failed (non-fatal)');
  }
}

/**
 * Convenience wrappers
 */
export const alertCritical = (title, message, metadata) =>
  sendAlert({ level: 'critical', title, message, metadata });

export const alertWarning = (title, message, metadata) =>
  sendAlert({ level: 'warning', title, message, metadata });
