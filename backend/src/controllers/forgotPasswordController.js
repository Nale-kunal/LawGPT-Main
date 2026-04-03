import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com', // Replace with your SMTP host
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'contact@juriq.in',
    pass: process.env.SMTP_PASS, // from environment variables ONLY
  },
});

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    // ALWAYS return the exact message to prevent email enumeration
    const successMessage = { message: 'If account exists, password reset link sent' };

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json(successMessage);
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash before storing
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // Save tokens and expiry (15 mins)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Use environment variable for frontend URL to support local testing vs production
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendBaseUrl}/reset-password/${rawToken}`;
    const mailOptions = {
      from: '"Juriq Support" <contact@juriq.in>',
      to: user.email,
      subject: 'Password Reset',
      text: `You requested a password reset. Please use the following link to reset your password:\n\n${resetUrl}\n\nThis link expires in 15 minutes. If you did not request this, please ignore this email.`,
      html: `<p>You requested a password reset.</p><p>Please use the following link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 15 minutes. If you did not request this, please ignore this email.</p>`,
    };

    await transporter.sendMail(mailOptions);

    return res.json(successMessage);
  } catch (error) {
    console.error('Forgot password error (controller):', error);
    // Even on error, we don't reveal much
    return res.status(500).json({ error: 'Failed to process request' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // 1. Hash incoming token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // 2. Find user
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    // 3. If NOT found
    if (!user) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    // 4. If found: hash new password using EXISTING logic
    const passwordHash = await User.hashPassword(password);
    user.passwordHash = passwordHash;
    
    // Clear tokens
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    
    await user.save();

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error (controller):', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
};
