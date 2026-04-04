import express from 'express';
import { requestPasswordReset, resetPassword } from '../controllers/forgotPasswordController.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Basic rate limiting for forgot password
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 forgot password requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

// Temporarily disabled for debugging
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password/:token', resetPassword);

export default router;
