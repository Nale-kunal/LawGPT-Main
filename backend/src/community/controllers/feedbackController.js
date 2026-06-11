/**
 * feedbackController.js
 *
 * Community feedback and feature request board.
 */

import xss from 'xss';
import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import { createNotification } from '../services/communityNotificationService.js';
import { checkRateLimit } from '../socket/rateLimiter.js';
import logger from '../../utils/logger.js';

// ── Submit feedback ───────────────────────────────────────────────────────────
export async function submitFeedback(req, res) {
  try {
    const { title, content, category, isPublic = true, tags = [] } = req.body;
    const userId = req.user.userId;

    // Rate Limiting: 5 submissions per minute max
    const allowed = await checkRateLimit(userId, 'submitFeedback');
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded: too many feature proposals submitted. Please wait before submitting another.' });
    }

    if (!title?.trim() || !content?.trim() || !category) {
      return res.status(400).json({ error: 'title, content, and category are required' });
    }

    const feedback = await Feedback.create({
      userId,
      title:    xss(title.trim()),
      content:  xss(content.trim()),
      category,
      isPublic: !!isPublic,
      tags:     tags.slice(0, 5).map(t => xss(String(t)).slice(0, 50)),
    });

    res.status(201).json({ ok: true, feedback });
  } catch (err) {
    logger.error({ err }, 'submitFeedback error');
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
}

// ── List public feedback ──────────────────────────────────────────────────────
export async function listFeedback(req, res) {
  try {
    const { category, status, sort = 'votes', page = 1, limit = 20 } = req.query;
    const query = { isPublic: true };
    if (category) { query.category = category; }
    if (status) { query.status = status; }

    const sortMap = { votes: { voteScore: -1 }, recent: { createdAt: -1 } };
    const sortBy  = sortMap[sort] || { voteScore: -1 };

    const items = await Feedback.find(query)
      .sort(sortBy)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Math.min(Number(limit), 50))
      .populate('userId', 'name')
      .lean();

    const userId = req.user.userId;
    const enriched = items.map(item => ({
      ...item,
      hasUpvoted:   item.upvotes?.some(id => id.toString() === userId),
      hasDownvoted: item.downvotes?.some(id => id.toString() === userId),
      upvoteCount:  item.upvotes?.length || 0,
      downvoteCount: item.downvotes?.length || 0,
      // Don't expose full voter arrays
      upvotes:   undefined,
      downvotes: undefined,
    }));

    const total = await Feedback.countDocuments(query);
    res.json({ ok: true, feedback: enriched, total, page: Number(page) });
  } catch (err) {
    logger.error({ err }, 'listFeedback error');
    res.status(500).json({ error: 'Failed to load feedback' });
  }
}

// ── Vote on feedback ──────────────────────────────────────────────────────────
export async function voteFeedback(req, res) {
  try {
    const { feedbackId } = req.params;
    const { vote }       = req.body; // 'up' | 'down' | 'remove'
    const userId         = req.user.userId;

    if (!['up', 'down', 'remove'].includes(vote)) {
      return res.status(400).json({ error: 'vote must be up, down, or remove' });
    }

    const feedback = await Feedback.findById(feedbackId).lean();
    if (!feedback) { return res.status(404).json({ error: 'Feedback not found' }); }
    if (!feedback.isPublic) { return res.status(403).json({ error: 'Cannot vote on private feedback' }); }
    if (feedback.userId.toString() === userId) {
      return res.status(400).json({ error: 'Cannot vote on your own feedback' });
    }

    let update;
    if (vote === 'up') {
      update = {
        $addToSet: { upvotes: userId },
        $pull:     { downvotes: userId },
      };
    } else if (vote === 'down') {
      update = {
        $addToSet: { downvotes: userId },
        $pull:     { upvotes: userId },
      };
    } else {
      update = {
        $pull: { upvotes: userId, downvotes: userId },
      };
    }

    await Feedback.findByIdAndUpdate(feedbackId, update);

    // Recalculate vote score
    const updated = await Feedback.findById(feedbackId).select('upvotes downvotes').lean();
    const voteScore = (updated.upvotes?.length || 0) - (updated.downvotes?.length || 0);
    await Feedback.findByIdAndUpdate(feedbackId, { $set: { voteScore } });

    res.json({ ok: true, voteScore });
  } catch (err) {
    logger.error({ err }, 'voteFeedback error');
    res.status(500).json({ error: 'Failed to record vote' });
  }
}

// ── Admin: reply to feedback ──────────────────────────────────────────────────
export async function adminReplyFeedback(req, res) {
  try {
    const { feedbackId }        = req.params;
    const { content, status }   = req.body;

    const feedback = await Feedback.findById(feedbackId).lean();
    if (!feedback) { return res.status(404).json({ error: 'Feedback not found' }); }

    const update = {};
    if (content?.trim()) {
      update.adminReply = {
        content:   xss(content.trim()),
        repliedBy: req.user.userId,
        repliedAt: new Date(),
      };
    }
    if (status) { update.status = status; }

    await Feedback.findByIdAndUpdate(feedbackId, { $set: update });

    // Notify feedback author
    if (content?.trim()) {
      await createNotification({
        userId: feedback.userId,
        type:   'feedback_reply',
        title:  'Admin replied to your feedback',
        body:   content.trim().slice(0, 100),
      });
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'adminReplyFeedback error');
    res.status(500).json({ error: 'Failed to update feedback' });
  }
}
