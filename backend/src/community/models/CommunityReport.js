import mongoose from 'mongoose';

/**
 * CommunityReport
 *
 * Persists every report (message or user) submitted by a community member.
 * Designed for:
 *   - Admin moderation queue (filter by status, category, date)
 *   - Duplicate-report detection (reporterId + targetId + type index)
 *   - Rate-limit signal (count reports by reporterId in a time window)
 *   - Audit trail (who reported what, when, and what action was taken)
 *
 * Security properties:
 *   - reporterId is always set server-side from req.user.userId (never from body)
 *   - reason is XSS-sanitised and capped at 500 chars at the route layer
 *   - category is strictly validated via enum — no free-form injection
 *   - Compound TTL index not set (reports are permanent audit records)
 */

const REPORT_CATEGORIES = [
  'spam',
  'harassment',
  'hate_speech',
  'misinformation',
  'confidential_data',  // sharing client info / case-specific advice
  'copyright',
  'impersonation',
  'self_harm',
  'other',
];

const communityReportSchema = new mongoose.Schema(
  {
    // ── Reporter ─────────────────────────────────────────────────────────────
    reporterId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    // ── Report target ─────────────────────────────────────────────────────────
    targetType: {
      type:     String,
      enum:     ['message', 'user'],
      required: true,
    },
    targetMessageId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'CommunityMessage',
      default: null,
    },
    targetUserId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    // ── Report content ────────────────────────────────────────────────────────
    category: {
      type:     String,
      enum:     REPORT_CATEGORIES,
      required: true,
    },
    // sanitised free-text detail (optional, max 500 chars enforced at route layer)
    detail: {
      type:      String,
      maxlength: 500,
      default:   '',
    },

    // ── Conversation context (for message reports) ─────────────────────────────
    conversationId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Conversation',
      default: null,
    },

    // ── Resolution ────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['pending', 'under_review', 'actioned', 'dismissed', 'duplicate'],
      default: 'pending',
      index:   true,
    },
    reviewedBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    adminNote:  { type: String, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Admin queue: newest unresolved first
communityReportSchema.index({ status: 1, createdAt: -1 });

// Duplicate detection: one active report per reporter+target pair
communityReportSchema.index(
  { reporterId: 1, targetMessageId: 1 },
  { unique: false, sparse: true }
);
communityReportSchema.index(
  { reporterId: 1, targetUserId: 1 },
  { unique: false, sparse: true }
);

// Rate-limit window query: reports by reporter in time window
communityReportSchema.index({ reporterId: 1, createdAt: -1 });

// Lookup all reports against a given target
communityReportSchema.index({ targetMessageId: 1, status: 1 });
communityReportSchema.index({ targetUserId: 1, status: 1 });

export { REPORT_CATEGORIES };
export default mongoose.model('CommunityReport', communityReportSchema);
