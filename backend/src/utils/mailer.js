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


export async function sendInvoiceEmail({ to, subject, message: _message, invoice, client }) {
  const transport = await getTransport();
  if (!transport) { throw new Error('SMTP transport not configured'); }

  const from = process.env.MAIL_FROM || 'no-reply@juriq.local';

  // Auto-generate comprehensive email content
  const autoGeneratedSubject = `Invoice ${invoice.invoiceNumber} - Legal Services - Due ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`;
  const autoGeneratedMessage = generateInvoiceEmailContent(invoice, client);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e0e0e0; padding-bottom: 20px;">
          <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">INVOICE</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 16px;">Legal Services Invoice</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #2c3e50; margin-bottom: 20px; font-size: 20px;">Dear ${client?.name || 'Valued Client'},</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #3498db;">
            <p style="margin: 0; color: #2c3e50; line-height: 1.6;">
              ${autoGeneratedMessage}
            </p>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px;">Invoice Details</h3>
          <table cellpadding="12" cellspacing="0" border="0" style="border-collapse: collapse; width: 100%; background-color: #f8f9fa; border-radius: 6px;">
            <tr>
              <td style="border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057; width: 30%;">Invoice Number:</td>
              <td style="border-bottom: 1px solid #dee2e6; color: #2c3e50; font-weight: bold;">${invoice.invoiceNumber}</td>
            </tr>
            <tr>
              <td style="border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">Issue Date:</td>
              <td style="border-bottom: 1px solid #dee2e6; color: #2c3e50;">${new Date(invoice.issueDate).toLocaleDateString('en-IN')}</td>
            </tr>
            <tr>
              <td style="border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057;">Due Date:</td>
              <td style="border-bottom: 1px solid #dee2e6; color: #e74c3c; font-weight: bold;">${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; color: #495057;">Status:</td>
              <td style="color: #2c3e50; font-weight: bold; text-transform: capitalize;">${invoice.status}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px;">Services Provided</h3>
          <table cellpadding="12" cellspacing="0" border="1" style="border-collapse: collapse; width: 100%; border-color: #dee2e6;">
            <thead style="background-color: #f8f9fa;">
              <tr>
                <th align="left" style="padding: 12px; font-weight: bold; color: #495057; border-bottom: 2px solid #dee2e6;">Description</th>
                <th align="center" style="padding: 12px; font-weight: bold; color: #495057; border-bottom: 2px solid #dee2e6;">Quantity</th>
                <th align="right" style="padding: 12px; font-weight: bold; color: #495057; border-bottom: 2px solid #dee2e6;">Unit Price (₹)</th>
                <th align="right" style="padding: 12px; font-weight: bold; color: #495057; border-bottom: 2px solid #dee2e6;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map(i => `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #2c3e50;">${i.description}</td>
                  <td align="center" style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #2c3e50;">${i.quantity}</td>
                  <td align="right" style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #2c3e50;">₹${i.unitPrice.toLocaleString('en-IN')}</td>
                  <td align="right" style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #2c3e50; font-weight: bold;">₹${i.amount.toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <div style="text-align: right;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; display: inline-block; min-width: 300px;">
              <div style="margin-bottom: 8px;">
                <span style="color: #495057;">Subtotal:</span>
                <span style="float: right; font-weight: bold; color: #2c3e50;">₹${invoice.subtotal.toLocaleString('en-IN')}</span>
              </div>
              ${invoice.taxRate > 0 ? `
                <div style="margin-bottom: 8px;">
                  <span style="color: #495057;">Tax (${invoice.taxRate}%):</span>
                  <span style="float: right; font-weight: bold; color: #2c3e50;">₹${invoice.taxAmount.toLocaleString('en-IN')}</span>
                </div>
              ` : ''}
              ${invoice.discountAmount > 0 ? `
                <div style="margin-bottom: 8px;">
                  <span style="color: #495057;">Discount:</span>
                  <span style="float: right; font-weight: bold; color: #27ae60;">-₹${invoice.discountAmount.toLocaleString('en-IN')}</span>
                </div>
              ` : ''}
              <div style="border-top: 2px solid #3498db; padding-top: 12px; margin-top: 12px;">
                <span style="font-size: 18px; font-weight: bold; color: #2c3e50;">Total Amount:</span>
                <span style="float: right; font-size: 20px; font-weight: bold; color: #e74c3c;">₹${invoice.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        ${invoice.notes ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px;">Additional Notes</h3>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #f39c12;">
              <p style="margin: 0; color: #2c3e50; line-height: 1.6;">${invoice.notes}</p>
            </div>
          </div>
        ` : ''}

        ${invoice.terms ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px;">Terms & Conditions</h3>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #9b59b6;">
              <p style="margin: 0; color: #2c3e50; line-height: 1.6;">${invoice.terms}</p>
            </div>
          </div>
        ` : ''}

        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 6px; border-left: 4px solid #27ae60; margin-bottom: 30px;">
          <h3 style="color: #27ae60; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Payment Instructions</h3>
          <p style="margin: 0; color: #2c3e50; line-height: 1.6;">
            Please remit payment by <strong>${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</strong> to avoid any late fees. 
            For payment queries or to discuss payment arrangements, please contact us immediately.
          </p>
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="color: #7f8c8d; margin: 0; font-size: 14px;">
            Thank you for choosing our legal services. We appreciate your business and look forward to continuing our professional relationship.
          </p>
          <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 12px;">
            This is an automated invoice. Please contact us if you have any questions.
          </p>
        </div>
      </div>
    </div>
  `;

  await transport.sendMail({
    from,
    to,
    subject: subject || autoGeneratedSubject,
    text: generatePlainTextInvoice(invoice, client, autoGeneratedMessage),
    html,
  });
  return { ok: true };
}

function generateInvoiceEmailContent(invoice, _client) {
  const daysUntilDue = Math.ceil((new Date(invoice.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

  let urgencyText = '';
  if (isOverdue) {
    urgencyText = `This invoice is overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''}. `;
  } else if (isDueSoon) {
    urgencyText = `This invoice is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. `;
  }

  const totalAmount = `₹${invoice.total.toLocaleString('en-IN')}`;
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN');

  return `We hope this email finds you well. ${urgencyText}Please find attached your invoice ${invoice.invoiceNumber} for legal services provided. The total amount due is ${totalAmount} and payment is due by ${dueDate}. We have provided detailed breakdown of all services rendered below for your review and records.`;
}

function generatePlainTextInvoice(invoice, client, message) {
  return `
INVOICE - ${invoice.invoiceNumber}

Dear ${client?.name || 'Valued Client'},

${message}

INVOICE DETAILS:
Invoice Number: ${invoice.invoiceNumber}
Issue Date: ${new Date(invoice.issueDate).toLocaleDateString('en-IN')}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}
Status: ${invoice.status}

SERVICES PROVIDED:
${(invoice.items || []).map(i => `- ${i.description} (Qty: ${i.quantity}, Rate: ₹${i.unitPrice.toLocaleString('en-IN')}, Amount: ₹${i.amount.toLocaleString('en-IN')})`).join('\n')}

PAYMENT SUMMARY:
Subtotal: ₹${invoice.subtotal.toLocaleString('en-IN')}
${invoice.taxRate > 0 ? `Tax (${invoice.taxRate}%): ₹${invoice.taxAmount.toLocaleString('en-IN')}` : ''}
${invoice.discountAmount > 0 ? `Discount: -₹${invoice.discountAmount.toLocaleString('en-IN')}` : ''}
TOTAL AMOUNT: ₹${invoice.total.toLocaleString('en-IN')}

${invoice.notes ? `NOTES: ${invoice.notes}` : ''}
${invoice.terms ? `TERMS: ${invoice.terms}` : ''}

PAYMENT INSTRUCTIONS:
Please remit payment by ${new Date(invoice.dueDate).toLocaleDateString('en-IN')} to avoid any late fees.

Thank you for choosing our legal services.
  `.trim();
}


