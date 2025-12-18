import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/mailer.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, barNumber, firm } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      role: role || 'lawyer',
      barNumber: barNumber?.trim(),
      firm: firm?.trim(),
      passwordHash: User.hashPassword(password),
    });

    // Generate token for immediate login
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        barNumber: user.barNumber,
        firm: user.firm,
      }
    });
  } catch (e) {
    console.error('Registration error:', e);
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log(`Login attempt failed: User not found for email: ${normalizedEmail}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user has a password hash
    if (!user.passwordHash) {
      console.error(`Login attempt failed: User ${user._id} has no passwordHash`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password with better error handling
    let isValidPassword = false;
    try {
      isValidPassword = await user.verifyPassword(password);
    } catch (verifyError) {
      console.error(`Password verification error for user ${user._id}:`, verifyError);
      // If password hash is malformed, we'll get an error here
      // Check if it's a bcrypt error
      if (verifyError.message && verifyError.message.includes('Invalid hash')) {
        console.error(`User ${user._id} has an invalid password hash. This user may need to reset their password.`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      throw verifyError; // Re-throw if it's an unexpected error
    }

    if (!isValidPassword) {
      console.log(`Login attempt failed: Invalid password for user: ${normalizedEmail}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Password is valid, generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log(`Login successful for user: ${normalizedEmail}`);
    return res.json({
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        barNumber: user.barNumber,
        firm: user.firm,
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    console.error('Login error stack:', e.stack);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  // Clear the token cookie with all possible configurations to ensure it's removed
  const cookieOptions = [
    { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' },
    { httpOnly: true, sameSite: 'none', secure: true, path: '/' },
    { path: '/' },
    { path: '/', domain: undefined },
  ];

  // Clear cookie with all configurations
  cookieOptions.forEach(options => {
    res.clearCookie('token', options);
  });

  // Also set expired cookie to override any existing cookie
  res.cookie('token', '', {
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });

  return res.json({ ok: true, message: 'Logged out successfully' });
});

// Request password reset: generates token and stores on user with 1h expiry
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    // Normalize email to match login behavior
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Do not reveal existence; respond OK
      return res.json({ ok: true });
    }
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // Attempt to send an email if SMTP is configured; do not fail the request if email send fails
    const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:8080';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    try {
      const result = await sendPasswordResetEmail({ to: email, resetUrl });
      if (result?.previewUrl) {
        console.log('Password reset email preview URL:', result.previewUrl);
      }
    } catch (e) {
      // Silently ignore email errors in API response; log for server operators
      console.error('Failed to send password reset email:', e?.message || e);
    }

    // Return ok; include token in dev to ease testing
    const includeToken = (process.env.NODE_ENV !== 'production');
    return res.json({ ok: true, ...(includeToken ? { token } : {}) });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with token
router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    user.passwordHash = User.hashPassword(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    // Add cache control headers to prevent browser caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const user = await User.findById(req.user.userId);
    if (!user) {
      // Clear any invalid cookies
      res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });
      return res.status(401).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        barNumber: user.barNumber,
        firm: user.firm,
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    // Clear any invalid cookies
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
    return res.status(401).json({ error: 'Authentication failed' });
  }
});

export default router;


