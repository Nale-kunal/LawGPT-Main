import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth-jwt.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/v1/auth/verify-security-answer
 * Verify the user's security answer before account deletion
 */
router.post('/verify-security-answer', requireAuth, async (req, res) => {
    try {
        const { answer } = req.body;

        if (!answer) {
            return res.status(400).json({ error: 'Security answer is required' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.securityAnswerHash) {
            return res.status(400).json({ error: 'Security answer not set up for this account' });
        }

        // Compare the provided answer with the stored hash
        // We normalize the answer (lowercase, trim) for better user experience
        const normalizedAnswer = answer.toLowerCase().trim();
        const isMatch = await bcrypt.compare(normalizedAnswer, user.securityAnswerHash);

        if (!isMatch) {
            // Optional: Log attempt or increment failed attempts if brute force protection is added later
            logger.warn({ userId: user._id }, 'Security answer verification failed');
            return res.status(401).json({ 
                success: false, 
                error: 'Incorrect security answer' 
            });
        }

        logger.info({ userId: user._id }, 'Security answer verified successfully');

        return res.json({ 
            success: true, 
            message: 'Security answer verified' 
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Security answer verification error');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/v1/auth/security-question
 * Fetch the user's chosen security question
 */
router.get('/security-question', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.securityQuestion) {
            return res.status(400).json({ error: 'Security question not set up' });
        }

        return res.json({ 
            question: user.securityQuestion 
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Failed to fetch security question');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
