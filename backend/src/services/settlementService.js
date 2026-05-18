/**
 * settlementService.js — Daily Razorpay settlement sync + mismatch alerting (spec #2)
 *
 * startSettlementJob() must be called after DB connects.
 */

import Razorpay      from 'razorpay';
import SettlementLog from '../models/SettlementLog.js';
import PaymentLog    from '../models/PaymentLog.js';
import logger        from '../utils/logger.js';
import { inc }       from './metricsService.js';

let _rzp = null;
function getRzp() {
  if (!_rzp) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) { throw new Error('Razorpay keys not configured'); }
    _rzp = new Razorpay({ key_id, key_secret });
  }
  return _rzp;
}

// ── Internal alert (avoids circular import with payment.js) ──────────────────
function _alert(type, payload) {
  logger.error({ alertType: type, ...payload }, `SETTLEMENT ALERT: ${type}`);
  if (process.env.SECURITY_ALERT_WEBHOOK_URL) {
    fetch(process.env.SECURITY_ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert: type, ts: new Date().toISOString(), ...payload }),
    }).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync settlements from Razorpay → DB
// ─────────────────────────────────────────────────────────────────────────────
async function syncSettlements() {
  try {
    logger.info('Settlement sync: starting');
    const rzp = getRzp();

    // Fetch last 100 settlements (most recent)
    const resp = await rzp.settlements.all({ count: 100 });
    const items = resp?.items ?? [];

    let newCount = 0;
    for (const s of items) {
      try {
        await SettlementLog.updateOne(
          { settlementId: s.id },
          {
            $setOnInsert: {
              settlementId:      s.id,
              amount:            s.amount,
              feePaise:          s.fees   ?? 0,
              taxPaise:          s.tax    ?? 0,
              status:            s.status,
              utrNo:             s.utr    ?? null,
              razorpayCreatedAt: s.created_at ? new Date(s.created_at * 1000) : null,
              syncedAt:          new Date(),
            },
          },
          { upsert: true }
        );
        newCount++;
      } catch (docErr) {
        if (docErr.code !== 11000) {  // 11000 = duplicate (already synced)
          logger.error({ docErr, settlementId: s.id }, 'Settlement sync: doc error');
        }
      }
    }

    logger.info({ total: items.length, newOrUpdated: newCount }, 'Settlement sync: complete');

    // ── Reconciliation: compare settled amount vs processed payments ──────────
    await _reconcileSettlements();

  } catch (err) {
    logger.error({ err }, 'Settlement sync: FATAL error — job continues next run');
  }
}

async function _reconcileSettlements() {
  try {
    // Total successfully processed payments in the last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const paymentLogs = await PaymentLog.find({
      status:    'processed',
      eventType: 'subscription.charged',
      createdAt: { $gte: since },
    }).select('amountPaise').lean();

    const totalPaymentsPaise = paymentLogs.reduce((sum, p) => sum + (p.amountPaise || 0), 0);

    // Total settled amount in last 24h
    const recentSettlements = await SettlementLog.find({
      razorpayCreatedAt: { $gte: since },
      status: 'processed',
    }).select('amount').lean();

    const totalSettledPaise = recentSettlements.reduce((sum, s) => sum + (s.amount || 0), 0);

    // Allow ±10% variance (fees, tax, timing differences)
    const variance = totalPaymentsPaise > 0
      ? Math.abs(totalPaymentsPaise - totalSettledPaise) / totalPaymentsPaise
      : 0;

    if (totalPaymentsPaise > 0 && variance > 0.1) {
      inc('settlement_mismatches');
      _alert('settlement_mismatch', {
        totalPaymentsPaise,
        totalSettledPaise,
        variancePct: (variance * 100).toFixed(1),
        since,
      });
    } else {
      logger.info({ totalPaymentsPaise, totalSettledPaise }, 'Settlement reconciliation: amounts match');
    }
  } catch (err) {
    logger.error({ err }, '_reconcileSettlements: error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Start daily settlement sync cron
// ─────────────────────────────────────────────────────────────────────────────
export function startSettlementJob() {
  // Run once 60s after startup, then every 24h
  setTimeout(syncSettlements, 60_000);
  setInterval(syncSettlements, 24 * 60 * 60 * 1000);
  logger.info('Settlement sync job scheduled (daily)');
}

// Exported for admin route use
export { syncSettlements };
