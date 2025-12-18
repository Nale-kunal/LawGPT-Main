import express from 'express';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import { requireAuth } from '../middleware/auth.js';
import { sendInvoiceEmail } from '../utils/mailer.js';
import { logActivity } from '../middleware/activityLogger.js';

// Helper function to generate email content
function generateInvoiceEmailContent(invoice, client) {
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

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const items = await Invoice.find({ owner: req.user.userId }).sort({ createdAt: -1 });
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const item = await Invoice.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, owner: req.user.userId };
    const created = await Invoice.create(data);
    
    // Get client info for activity log
    const client = await Client.findById(created.clientId);
    
    // Log activity
    await logActivity(
      req.user.userId,
      'invoice_created',
      `Invoice ${created.invoiceNumber} created for ${client?.name || 'client'}`,
      'invoice',
      created._id,
      {
        invoiceNumber: created.invoiceNumber,
        clientName: client?.name,
        amount: created.total,
        currency: created.currency,
        status: created.status
      }
    );
    
    res.status(201).json(created);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const original = await Invoice.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!original) return res.status(404).json({ error: 'Not found' });
    
    const updated = await Invoice.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      req.body,
      { new: true }
    );
    
    // Get client info for activity log
    const client = await Client.findById(updated.clientId);
    
    // Check if payment status changed
    if (original.status !== 'paid' && updated.status === 'paid') {
      await logActivity(
        req.user.userId,
        'payment_received',
        `Payment received for invoice ${updated.invoiceNumber}`,
        'invoice',
        updated._id,
        {
          invoiceNumber: updated.invoiceNumber,
          clientName: client?.name,
          amount: updated.total,
          currency: updated.currency
        }
      );
    } else {
      await logActivity(
        req.user.userId,
        'invoice_updated',
        `Invoice ${updated.invoiceNumber} updated`,
        'invoice',
        updated._id,
        {
          invoiceNumber: updated.invoiceNumber,
          clientName: client?.name,
          amount: updated.total,
          currency: updated.currency,
          status: updated.status
        }
      );
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

router.delete('/:id', async (req, res) => {
  const result = await Invoice.deleteOne({ _id: req.params.id, owner: req.user.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.post('/:id/send', async (req, res) => {
  const { to, subject, message } = req.body;
  const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!invoice) return res.status(404).json({ error: 'Not found' });

  // Get client information for personalized email
  const client = await Client.findOne({ _id: invoice.clientId, owner: req.user.userId });
  if (!client) return res.status(400).json({ error: 'Client not found for invoice' });

  let recipient = to;
  if (!recipient) {
    recipient = client.email;
  }

  try {
    const result = await sendInvoiceEmail({
      to: recipient,
      subject: subject || `Invoice ${invoice.invoiceNumber} - Legal Services - Due ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`,
      message: message || generateInvoiceEmailContent(invoice, client),
      invoice,
      client,
    });
    
    // Log activity
    await logActivity(
      req.user.userId,
      'invoice_sent',
      `Invoice ${invoice.invoiceNumber} sent to ${client.name}`,
      'invoice',
      invoice._id,
      {
        invoiceNumber: invoice.invoiceNumber,
        clientName: client.name,
        clientEmail: recipient,
        amount: invoice.total,
        currency: invoice.currency
      }
    );
    
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;


