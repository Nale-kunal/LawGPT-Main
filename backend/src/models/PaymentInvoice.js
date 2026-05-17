/**
 * PaymentInvoice.js — GST-ready billing invoice for Razorpay payments (spec #7)
 * Separate from the legal-billing Invoice model.
 */
import mongoose from 'mongoose';

const paymentInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber:     { type: String, required: true, unique: true, index: true },
    userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriptionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
    razorpayPaymentId: { type: String, required: true, index: true },

    planType:          { type: String, required: true },
    billingCycle:      { type: String, required: true },

    // All amounts in paise
    subtotalPaise:     { type: Number, required: true },
    cgstPaise:         { type: Number, default: 0 },   // 9% CGST (intra-state)
    sgstPaise:         { type: Number, default: 0 },   // 9% SGST (intra-state)
    igstPaise:         { type: Number, default: 0 },   // 18% IGST (inter-state)
    totalPaise:        { type: Number, required: true },

    // Customer snapshot at time of payment
    customerName:      { type: String, default: null },
    customerEmail:     { type: String, required: true },
    customerGstin:     { type: String, default: null },

    // Business info from env
    businessName:      { type: String, default: null },
    businessGstin:     { type: String, default: null },
    businessAddress:   { type: String, default: null },
    businessState:     { type: String, default: null },

    paymentDate:       { type: Date, required: true },
    status:            { type: String, enum: ['issued', 'void'], default: 'issued' },
  },
  { timestamps: true }
);

export default mongoose.model('PaymentInvoice', paymentInvoiceSchema);
