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
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
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
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  // Clear the token cookie with all possible configurations
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
  
  // Also clear with different path configurations to be safe
  res.clearCookie('token', { path: '/' });
  res.clearCookie('token');
  
  return res.json({ ok: true });
});

// Request password reset: generates token and stores on user with 1h expiry
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
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


