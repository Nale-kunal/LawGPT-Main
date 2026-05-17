/**
 * alertQueueService.js — Persistent alert delivery with retry + exponential backoff (spec #2)
 *
 * Replaces fire-and-forget triggerAlert fetch() with a DB-backed queue.
 * Worker polls every 30s; retries up to 3 times with backoff.
 *
 * Exported:
 *   enqueueAlert(type, payload)   — push to queue (non-blocking)
 *   startAlertWorker()            — start the delivery worker (called on server start)
 */

import AlertQueue from '../models/AlertQueue.js';
import logger     from '../utils/logger.js';

// ── Exponential backoff delays (ms) ──────────────────────────────────────────
const BACKOFF_MS = [0, 30_000, 120_000, 300_000]; // 0s, 30s, 2m, 5m

// ─────────────────────────────────────────────────────────────────────────────
// enqueueAlert — creates a pending queue record; never throws
// ─────────────────────────────────────────────────────────────────────────────
export async function enqueueAlert(type, payload = {}) {
  try {
    await AlertQueue.create({
      type,
      severity:    payload.severity || 'MEDIUM',
      payload,
      status:      'pending',
      retries:     0,
      nextRetryAt: new Date(),
    });
  } catch (err) {
    // Fallback: log directly so alert is never fully lost
    logger.error({ err, type, payload }, 'enqueueAlert: DB write failed — alert logged inline');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// _deliverAlert — attempt HTTP delivery to SECURITY_ALERT_WEBHOOK_URL
// ─────────────────────────────────────────────────────────────────────────────
async function _deliverAlert(alert) {
  const url = process.env.SECURITY_ALERT_WEBHOOK_URL;
  if (!url) return; // no webhook configured — log is sufficient

  const body = JSON.stringify({
    id:        alert._id,
    type:      alert.type,
    severity:  alert.severity,
    payload:   alert.payload,
    ts:        new Date().toISOString(),
  });

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal:  AbortSignal.timeout(8_000), // 8s hard timeout
  });

  if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// _processAlerts — poll DB for pending alerts and attempt delivery
// ─────────────────────────────────────────────────────────────────────────────
async function _processAlerts() {
  try {
    const now     = new Date();
    const pending = await AlertQueue.find({
      status:      'pending',
      nextRetryAt: { $lte: now },
    }).limit(20).sort({ nextRetryAt: 1 }).lean();

    for (const alert of pending) {
      try {
        await _deliverAlert(alert);

        await AlertQueue.updateOne(
          { _id: alert._id },
          { $set: { status: 'delivered', deliveredAt: new Date() } }
        );
        logger.info({ alertId: alert._id, type: alert.type }, 'Alert delivered');
      } catch (deliveryErr) {
        const nextRetries = (alert.retries || 0) + 1;
        const backoffMs   = BACKOFF_MS[Math.min(nextRetries, BACKOFF_MS.length - 1)];
        const isFailed    = nextRetries >= (alert.maxRetries || 3);

        await AlertQueue.updateOne(
          { _id: alert._id },
          {
            $set: {
              retries:     nextRetries,
              lastError:   deliveryErr.message,
              status:      isFailed ? 'failed' : 'pending',
              nextRetryAt: new Date(Date.now() + backoffMs),
              ...(isFailed ? { failedAt: new Date() } : {}),
            },
          }
        );

        if (isFailed) {
          logger.error({ alertId: alert._id, type: alert.type, err: deliveryErr.message }, 'Alert delivery permanently failed after 3 retries');
        } else {
          logger.warn({ alertId: alert._id, nextRetries, backoffMs }, 'Alert delivery failed — will retry');
        }
      }
    }
  } catch (err) {
    logger.error({ err }, 'alertQueueService: worker poll failed');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// startAlertWorker — call once after DB connects
// ─────────────────────────────────────────────────────────────────────────────
export function startAlertWorker() {
  setInterval(_processAlerts, 30_000); // poll every 30 seconds
  setTimeout(_processAlerts, 5_000);   // process any startup backlog
  logger.info('Alert delivery worker started (30s poll interval)');
}
