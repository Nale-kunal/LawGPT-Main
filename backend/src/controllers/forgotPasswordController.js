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
      subject: 'Password Reset Request — Juriq',
      text: [
        'Password Reset Request — Juriq',
        '',
        `We received a request to reset the password for your Juriq account (${user.email}).`,
        '',
        'Click the link below to set a new password.',
        'This link is valid for 15 minutes and can only be used once.',
        '',
        resetUrl,
        '',
        'If you did not request a password reset, you can safely ignore this email.',
        'Your account remains secure.',
        '',
        '© Juriq Legal Intelligence Platform',
      ].join('\n'),
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Juriq Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Juriq</h1>
              <p style="margin:6px 0 0;color:#a0b3d4;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Legal Intelligence Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:22px;font-weight:600;">Password Reset Request</h2>
              <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.7;">
                We received a request to reset the password for your Juriq account associated with <strong>${user.email}</strong>.
              </p>
              <p style="margin:0 0 28px;color:#4a5568;font-size:15px;line-height:1.7;">
                Click the button below to set a new password. This link is valid for <strong>15 minutes</strong> and can only be used once.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="border-radius:8px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 8px;color:#718096;font-size:13px;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin:0 0 32px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#667eea;font-size:13px;text-decoration:underline;">${resetUrl}</a>
              </p>

              <!-- Warning box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#fff8e1;border-left:4px solid #f6ad15;border-radius:0 8px 8px 0;padding:16px 20px;">
                    <p style="margin:0;color:#744210;font-size:13px;line-height:1.6;">
                      ⏱ <strong>This link expires in 15 minutes.</strong> If you did not request a password reset,
                      you can safely ignore this email &mdash; your account remains secure.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#718096;font-size:13px;line-height:1.6;">
                For security reasons, never share this link with anyone. Juriq support will never ask for your reset link.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f7f8fa;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px;color:#a0aec0;font-size:12px;">
                &copy; ${new Date().getFullYear()} Juriq. All rights reserved.
              </p>
              <p style="margin:0;color:#a0aec0;font-size:12px;">
                This is an automated email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
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
