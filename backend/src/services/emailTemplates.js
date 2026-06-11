/**
 * emailTemplates.js — Responsive HTML email templates for Juriq SaaS
 *
 * All templates return { subject, html, text }.
 * Keep inline CSS for email client compatibility.
 */

const BASE_URL = process.env.FRONTEND_URL || 'https://juriq.app';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@juriq.app';
const BRAND_COLOR = '#1a1a2e';

const wrap = (content, previewText = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Juriq</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;">${previewText}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:${BRAND_COLOR};padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Juriq</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:12px;">Indian Law Practice Management</p>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#f9f9fb;border-top:1px solid #eee;">
          <p style="margin:0;color:#999;font-size:11px;text-align:center;">
            © ${new Date().getFullYear()} Juriq Technologies Pvt. Ltd. · 
            <a href="${BASE_URL}/privacy" style="color:#999;">Privacy</a> · 
            <a href="${BASE_URL}/terms" style="color:#999;">Terms</a> · 
            Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#999;">${SUPPORT_EMAIL}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-top:16px;">${text}</a>`;

const heading = (text) =>
  `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;">${text}</h2>`;

const para = (text) =>
  `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#444;">${text}</p>`;

const highlight = (label, value) =>
  `<tr><td style="padding:8px 12px;font-size:13px;color:#666;">${label}</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#111;">${value}</td></tr>`;

const infoTable = (rows) =>
  `<table style="width:100%;border-collapse:collapse;background:#f9f9fb;border-radius:8px;margin:16px 0;overflow:hidden;">${rows.map(([l, v]) => highlight(l, v)).join('')}</table>`;

// ── Template functions ────────────────────────────────────────────────────────

export function paymentSuccessEmail({ name, planType, billingCycle, amount, renewalDate, invoiceNumber }) {
  const planLabel = { free: 'Free', basic: 'Basic', pro: 'Pro', premium: 'Premium', elite: 'Elite ✦' }[planType] ?? planType;
  const subject = `✅ Payment Successful — ${planLabel} Plan Activated`;
  const html = wrap(`
    ${heading(`Payment Confirmed — Welcome to ${planLabel}!`)}
    ${para(`Hi ${name || 'there'}, your payment was successful and your plan is now active.`)}
    ${infoTable([
      ['Plan', planLabel],
      ['Billing Cycle', billingCycle === 'yearly' ? 'Annual' : 'Monthly'],
      ['Amount Paid', `₹${(amount / 100).toLocaleString('en-IN')}`],
      ['Renewal Date', renewalDate || 'N/A'],
      ['Invoice No.', invoiceNumber || 'Generating…'],
    ])}
    ${para('Your GST invoice is available in your subscription dashboard.')}
    ${btn('View Subscription', `${BASE_URL}/dashboard/subscription`)}
  `, `Your ${planLabel} plan is now active`);
  return { subject, html, text: `Payment Successful! Your ${planLabel} plan is now active. Amount: ₹${(amount / 100).toLocaleString('en-IN')}. Renewal: ${renewalDate || 'N/A'}.` };
}

export function paymentFailedEmail({ name, planType, retryUrl }) {
  const subject = '⚠️ Payment Failed — Action Required';
  const html = wrap(`
    ${heading('Your Payment Could Not Be Processed')}
    ${para(`Hi ${name || 'there'}, we were unable to process your payment for the ${planType ?? 'subscription'} plan.`)}
    ${para('No amount has been charged. Please update your payment method or try again.')}
    ${btn('Retry Payment', retryUrl || `${BASE_URL}/dashboard/pricing`)}
    ${para('<small style="color:#999;">If you keep seeing this error, please contact your bank or our support team.</small>')}
  `, 'Your payment could not be processed');
  return { subject, html, text: `Payment failed for your ${planType ?? ''} subscription. Please retry at ${BASE_URL}/dashboard/pricing` };
}

export function subscriptionCancelledEmail({ name, planType, accessUntil }) {
  const subject = 'Subscription Cancellation Confirmed';
  const html = wrap(`
    ${heading('Your Subscription Has Been Cancelled')}
    ${para(`Hi ${name || 'there'}, your ${planType ?? 'subscription'} has been cancelled as requested.`)}
    ${infoTable([
      ['Plan', planType ?? 'N/A'],
      ['Access Until', accessUntil ? new Date(accessUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Immediately'],
    ])}
    ${para('You can reactivate your subscription anytime from the pricing page.')}
    ${btn('Reactivate Subscription', `${BASE_URL}/dashboard/pricing`)}
  `, 'Your subscription has been cancelled');
  return { subject, html, text: `Subscription cancelled. Access continues until ${accessUntil || 'now'}.` };
}

export function renewalReminderEmail({ name, planType, renewalDate, amount, daysLeft }) {
  const subject = `⏰ Reminder: Your ${planType} Plan Renews in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`;
  const html = wrap(`
    ${heading(`Your Plan Renews in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`)}
    ${para(`Hi ${name || 'there'}, just a reminder that your ${planType} subscription will auto-renew soon.`)}
    ${infoTable([
      ['Plan', planType],
      ['Renewal Date', renewalDate],
      ['Amount', `₹${(amount / 100).toLocaleString('en-IN')}`],
    ])}
    ${para('No action needed — your subscription will renew automatically. To cancel or change your plan, visit the subscription dashboard.')}
    ${btn('Manage Subscription', `${BASE_URL}/dashboard/subscription`)}
  `, `Your ${planType} plan renews in ${daysLeft} days`);
  return { subject, html, text: `Reminder: Your ${planType} plan renews in ${daysLeft} days on ${renewalDate} for ₹${(amount / 100).toLocaleString('en-IN')}.` };
}

export function trialEndingEmail({ name, planType, trialEndDate, daysLeft }) {
  const subject = `Your Free Trial Ends in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`;
  const html = wrap(`
    ${heading(`Your Trial is Ending Soon`)}
    ${para(`Hi ${name || 'there'}, your free trial of the ${planType} plan ends on ${trialEndDate}.`)}
    ${para('Upgrade now to keep uninterrupted access to all features.')}
    ${btn('Upgrade Now', `${BASE_URL}/dashboard/pricing`)}
  `, `Your free trial ends in ${daysLeft} days`);
  return { subject, html, text: `Your free trial ends in ${daysLeft} days (${trialEndDate}). Visit ${BASE_URL}/dashboard/pricing to upgrade.` };
}

export function invoiceGeneratedEmail({ name, invoiceNumber, planType, amount, invoiceDate }) {
  const subject = `Invoice ${invoiceNumber} — Juriq ${planType} Plan`;
  const html = wrap(`
    ${heading('Your Invoice is Ready')}
    ${para(`Hi ${name || 'there'}, your GST-compliant invoice has been generated.`)}
    ${infoTable([
      ['Invoice No.', invoiceNumber],
      ['Plan', planType],
      ['Amount', `₹${(amount / 100).toLocaleString('en-IN')}`],
      ['Date', invoiceDate],
    ])}
    ${btn('Download Invoice', `${BASE_URL}/dashboard/subscription`)}
  `, `Invoice ${invoiceNumber} is ready for download`);
  return { subject, html, text: `Invoice ${invoiceNumber} for ₹${(amount / 100).toLocaleString('en-IN')} is available in your subscription dashboard.` };
}

export function gracePeriodWarningEmail({ name, planType, gracePeriodEnds }) {
  const subject = '⚠️ Action Required: Subscription Payment Overdue';
  const html = wrap(`
    ${heading('Payment Overdue — Grace Period Active')}
    ${para(`Hi ${name || 'there'}, your ${planType} subscription payment could not be collected.`)}
    ${para(`You are currently in a <strong>grace period</strong> until ${gracePeriodEnds}. Please update your payment method to avoid service interruption.`)}
    ${btn('Update Payment Method', `${BASE_URL}/dashboard/pricing`)}
    ${para('<small style="color:#999;">If no payment is received by the grace period end, your account will be downgraded to the Free plan.</small>')}
  `, 'Action required: payment overdue');
  return { subject, html, text: `Payment overdue for ${planType} plan. Grace period ends ${gracePeriodEnds}. Visit ${BASE_URL}/dashboard/pricing to update payment.` };
}
