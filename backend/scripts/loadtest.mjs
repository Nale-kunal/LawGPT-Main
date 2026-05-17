/**
 * loadtest.mjs — Autocannon-based load test for payment endpoints (spec #8)
 *
 * Usage:
 *   npm run load-test          (runs all scenarios)
 *   npm run load-test webhook  (webhook burst only)
 *
 * Requirements: npm install autocannon --save-dev
 */

import autocannon from 'autocannon';

const BASE_URL = process.env.LOAD_TEST_URL || 'http://localhost:5000';
const JWT      = process.env.LOAD_TEST_JWT || '';  // set a valid test JWT

function run(scenario) {
  return new Promise((resolve) => {
    const inst = autocannon({ ...scenario, outputStream: process.stdout });
    autocannon.track(inst, { renderProgressBar: true });
    inst.on('done', resolve);
  });
}

// ── Scenario 1: Webhook burst (simulates Razorpay retry storm) ────────────────
async function webhookBurst() {
  console.log('\n📡 Scenario 1: Webhook burst (100 req/s for 10s)\n');
  await run({
    url:         `${BASE_URL}/api/v1/payment/webhook`,
    method:      'POST',
    headers:     { 'Content-Type': 'application/json', 'x-razorpay-signature': 'invalid_sig' },
    body:        JSON.stringify({ event: 'subscription.charged', payload: {}, id: 'evt_test', created_at: Math.floor(Date.now() / 1000) }),
    connections: 50,
    duration:    10,
  });
}

// ── Scenario 2: GET /my-subscription (authenticated read load) ────────────────
async function mySubscriptionLoad() {
  console.log('\n📋 Scenario 2: GET /my-subscription (50 concurrent for 15s)\n');
  await run({
    url:         `${BASE_URL}/api/v1/payment/my-subscription`,
    method:      'GET',
    headers:     { Authorization: `Bearer ${JWT}` },
    connections: 50,
    duration:    15,
  });
}

// ── Scenario 3: Admin metrics endpoint ────────────────────────────────────────
async function adminMetricsLoad() {
  console.log('\n📊 Scenario 3: Admin metrics (10 concurrent for 5s)\n');
  await run({
    url:         `${BASE_URL}/api/v1/admin/payment/metrics`,
    method:      'GET',
    headers:     { Authorization: `Bearer ${JWT}` },
    connections: 10,
    duration:    5,
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
const scenario = process.argv[2];
try {
  if (!scenario || scenario === 'webhook')     await webhookBurst();
  if (!scenario || scenario === 'subscription') await mySubscriptionLoad();
  if (!scenario || scenario === 'metrics')     await adminMetricsLoad();
  console.log('\n✅ Load test complete\n');
} catch (err) {
  console.error('Load test error:', err.message);
  process.exit(1);
}
