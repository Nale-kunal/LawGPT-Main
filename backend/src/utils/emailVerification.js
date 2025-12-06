import crypto from 'crypto';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Generate a secure verification token
 * @returns {string} A cryptographically secure random token
 */
export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a verification token for storage
 * @param {string} token - The plain token to hash
 * @returns {string} The hashed token
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Check if a verification token has expired
 * @param {Date|string} sentAt - When the token was sent
 * @param {number} expiryHours - Hours until expiry (default 24)
 * @returns {boolean} True if expired
 */
export function isTokenExpired(sentAt, expiryHours = 24) {
  if (!sentAt) return true;

  const sentDate = sentAt instanceof Date ? sentAt : new Date(sentAt);
  const expiryTime = sentDate.getTime() + (expiryHours * 60 * 60 * 1000);

  return Date.now() > expiryTime;
}

/**
 * Check if user can request another verification email (rate limiting)
 * @param {Date|string} lastSentAt - When the last email was sent
 * @param {number} cooldownMinutes - Minutes to wait between emails (default 1)
 * @returns {boolean} True if can send another email
 */
export function canResendVerification(lastSentAt, cooldownMinutes = 1) {
  if (!lastSentAt) return true;

  const lastSent = lastSentAt instanceof Date ? lastSentAt : new Date(lastSentAt);
  const cooldownTime = lastSent.getTime() + (cooldownMinutes * 60 * 1000);

  return Date.now() > cooldownTime;
}

/**
 * Send verification email using SendGrid
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} token - Verification token
 * @returns {Promise<boolean>} True if sent successfully
 */
export async function sendVerificationEmail(email, name, token) {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/verify-email?token=${token}`;

  // In development, log to console instead of sending email
  if (process.env.NODE_ENV !== 'production' && !process.env.SENDGRID_API_KEY) {
    console.log('\n=== EMAIL VERIFICATION (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log('=====================================\n');
    return true;
  }

  // Send actual email using SendGrid
  try {
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
        name: process.env.SENDGRID_FROM_NAME || 'LegalPro'
      },
      subject: 'Verify Your LegalPro Account',
      text: `Hi ${name},\n\nThank you for registering with LegalPro. Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create a LegalPro account, please ignore this email.\n\nBest regards,\nThe LegalPro Team`,
      html: emailTemplate(name, verificationUrl)
    };

    await sgMail.send(msg);
    console.log(`✅ Verification email sent to ${email} via SendGrid`);
    return true;
  } catch (error) {
    console.error('❌ SendGrid email error:', error);

    // Log detailed error information
    if (error.response) {
      console.error('SendGrid response:', error.response.body);
    }

    // In development, log the URL even if email fails
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n=== EMAIL FAILED - VERIFICATION URL ===');
      console.log(`To: ${email}`);
      console.log(`Verification URL: ${verificationUrl}`);
      console.log('====================================\n');
    }

    throw error;
  }
}

/**
 * Email template for verification
 * @param {string} name - User's name
 * @param {string} verificationUrl - Verification URL
 * @returns {string} HTML email template
 */
function emailTemplate(name, verificationUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          padding: 0;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .content h2 {
          color: #333;
          font-size: 24px;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .content p {
          margin: 16px 0;
          color: #555;
        }
        .button { 
          display: inline-block; 
          padding: 14px 32px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white !important; 
          text-decoration: none; 
          border-radius: 6px;
          margin: 24px 0;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .link-container {
          background-color: #f8f9fa;
          padding: 16px;
          border-radius: 6px;
          margin: 20px 0;
          word-break: break-all;
        }
        .link-container p {
          margin: 0;
          font-size: 14px;
          color: #666;
        }
        .link-container a {
          color: #667eea;
          text-decoration: none;
        }
        .footer { 
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 13px; 
          color: #888;
          text-align: center;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 12px 16px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning p {
          margin: 0;
          color: #856404;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚖️ LegalPro</h1>
        </div>
        
        <div class="content">
          <h2>Welcome, ${name}!</h2>
          <p>Thank you for registering with LegalPro. We're excited to have you on board!</p>
          
          <p>To complete your registration and access all features, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <div class="link-container">
            <a href="${verificationUrl}">${verificationUrl}</a>
          </div>
          
          <div class="warning">
            <p><strong>⏰ This link expires in 24 hours.</strong></p>
          </div>
          
          <p>If you didn't create a LegalPro account, please ignore this email and no account will be created.</p>
          
          <div class="footer">
            <p>Best regards,<br><strong>The LegalPro Team</strong></p>
            <p style="margin-top: 16px; font-size: 12px;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
