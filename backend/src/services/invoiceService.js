/**
 * invoiceService.js — GST-ready invoice generation for Indian compliance (spec #7)
 *
 * Called after every successful subscription.charged event.
 *
 * Exported:
 *   generatePaymentInvoice(params)  — creates and returns a PaymentInvoice
 *   getInvoiceById(invoiceId, userId) — secure fetch by ID + userId
 */

import PaymentInvoice from '../models/PaymentInvoice.js';
import User           from '../models/User.js';
import logger         from '../utils/logger.js';

// ── GST rates (India, 2024) ───────────────────────────────────────────────────
const GST_RATE        = 0.18;   // 18% total GST on SaaS
const CGST_RATE       = 0.09;   // 9% CGST (intra-state)
const SGST_RATE       = 0.09;   // 9% SGST (intra-state)
const IGST_RATE       = 0.18;   // 18% IGST (inter-state)

// ── Invoice number generator ──────────────────────────────────────────────────
function _generateInvoiceNumber() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, '0');
  const rand   = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `JRQ-${year}${month}-${rand}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// generatePaymentInvoice
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.subscriptionId
 * @param {string} params.razorpayPaymentId
 * @param {string} params.planType
 * @param {string} params.billingCycle
 * @param {number} params.totalPaise        — total amount charged (incl. GST)
 * @param {Date}   params.paymentDate
 * @param {string} [params.customerGstin]   — optional customer GST number
 */
export async function generatePaymentInvoice({
  userId, subscriptionId, razorpayPaymentId,
  planType, billingCycle, totalPaise, paymentDate, customerGstin = null,
}) {
  try {
    const user = await User.findById(userId)
      .select('email name')
      .lean();

    if (!user) {
      logger.warn({ userId }, 'generatePaymentInvoice: user not found — skipping');
      return null;
    }

    // Work backwards from total to get subtotal (total already includes GST)
    const subtotalPaise = Math.round(totalPaise / (1 + GST_RATE));
    const totalGstPaise = totalPaise - subtotalPaise;

    // Business state determines CGST+SGST vs IGST
    // Default: intra-state (CGST+SGST). Set BUSINESS_STATE env for inter-state detection.
    const businessState   = process.env.BUSINESS_STATE || 'MH'; // Maharashtra default
    const isInterState    = customerGstin && customerGstin.slice(0, 2) !== businessState;

    const cgstPaise = isInterState ? 0 : Math.round(totalGstPaise / 2);
    const sgstPaise = isInterState ? 0 : totalGstPaise - cgstPaise;
    const igstPaise = isInterState ? totalGstPaise : 0;

    const invoice = await PaymentInvoice.create({
      invoiceNumber:     _generateInvoiceNumber(),
      userId,
      subscriptionId,
      razorpayPaymentId,
      planType,
      billingCycle,
      subtotalPaise,
      cgstPaise,
      sgstPaise,
      igstPaise,
      totalPaise,
      customerName:      user.name  || null,
      customerEmail:     user.email,
      customerGstin:     customerGstin || null,
      businessName:      process.env.BUSINESS_NAME    || 'Juriq Technologies Pvt. Ltd.',
      businessGstin:     process.env.BUSINESS_GSTIN   || null,
      businessAddress:   process.env.BUSINESS_ADDRESS || null,
      businessState,
      paymentDate:       paymentDate || new Date(),
      status:            'issued',
    });

    logger.info({ invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber, userId }, 'Payment invoice generated');
    return invoice;

  } catch (err) {
    // Non-fatal — payment has already been recorded; invoice can be regenerated
    logger.error({ err, userId, razorpayPaymentId }, 'generatePaymentInvoice: failed (non-fatal)');
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getInvoiceById — securely scoped to userId
// ─────────────────────────────────────────────────────────────────────────────
export async function getInvoiceById(invoiceId, userId) {
  return PaymentInvoice.findOne({ _id: invoiceId, userId }).lean();
}

// getInvoicesForUser — paginated list
export async function getInvoicesForUser(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [invoices, total] = await Promise.all([
    PaymentInvoice.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PaymentInvoice.countDocuments({ userId }),
  ]);
  return { invoices, total, page, pages: Math.ceil(total / limit) };
}
