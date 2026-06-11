import nodemailer from 'nodemailer';

let cachedTransport = null;

function getTransport() {
  if (cachedTransport) { return cachedTransport; }
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // No SMTP configured — email sending unavailable.
    // In development, set SMTP_* env vars to enable email.
    return null;
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cachedTransport;
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const transport = getTransport();
  if (!transport) { throw new Error('SMTP transport not configured'); }

  const from = process.env.MAIL_FROM || 'contact@juriq.in';

  const html = `
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
                We received a request to reset the password for your Juriq account associated with <strong>${to}</strong>.
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
                      you can safely ignore this email — your account remains secure.
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
  `.trim();

  const text = [
    'Password Reset Request — Juriq',
    '',
    `We received a request to reset the password for your Juriq account (${to}).`,
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
  ].join('\n');

  await transport.sendMail({
    from: `"Juriq Security" <${from}>`,
    to,
    subject: 'Password Reset Request — Juriq',
    text,
    html,
  });
  return { ok: true };
}
