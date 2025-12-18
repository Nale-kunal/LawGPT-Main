import express from 'express';
import Case from '../models/Case.js';
import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';
import TimeEntry from '../models/TimeEntry.js';
import Alert from '../models/Alert.js';
import Activity from '../models/Activity.js';
import { requireAuth } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();
router.use(requireAuth);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    console.log('Dashboard stats request for user:', userId);
    console.log('Date range:', startOfMonth, 'to', endOfMonth);

    // Get cases statistics
    const totalCases = await Case.countDocuments({ owner: userId });
    const activeCases = await Case.countDocuments({ owner: userId, status: 'active' });
    const todaysCases = await Case.countDocuments({
      owner: userId,
      hearingDate: {
        $gte: today,
        $lt: tomorrow
      }
    });
    const urgentCases = await Case.countDocuments({ owner: userId, priority: 'urgent' });

    // Get clients count
    const totalClients = await Client.countDocuments({ owner: userId });

    // Calculate revenue from ALL invoices this month (not just paid ones for better visibility)
    const allInvoicesThisMonth = await Invoice.find({
      owner: userId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Also get paid invoices specifically
    const paidInvoicesThisMonth = await Invoice.find({
      owner: userId,
      status: 'paid',
      paidAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const totalInvoiceRevenue = allInvoicesThisMonth.reduce((total, invoice) => total + (invoice.total || 0), 0);
    const paidInvoiceRevenue = paidInvoicesThisMonth.reduce((total, invoice) => total + (invoice.total || 0), 0);

    // Calculate previous month for comparison
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const allInvoicesPrevMonth = await Invoice.find({
      owner: userId,
      createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
    });

    const prevMonthRevenue = allInvoicesPrevMonth.reduce((total, invoice) => total + (invoice.total || 0), 0);
    const revenueGrowth = prevMonthRevenue > 0 ? ((totalInvoiceRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1) : 0;

    // Get billable time entries for this month
    const billableTimeEntries = await TimeEntry.find({
      owner: userId,
      billable: true,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const monthlyBillableMinutes = billableTimeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
    const monthlyBillableHours = monthlyBillableMinutes / 60;
    const monthlyBillableAmount = billableTimeEntries.reduce((total, entry) => total + ((entry.duration || 0) * (entry.hourlyRate || 0)), 0);

    console.log('Revenue calculation:', {
      totalInvoiceRevenue,
      paidInvoiceRevenue,
      monthlyBillableAmount,
      monthlyBillableHours
    });

    res.json({
      totalCases,
      activeCases,
      todaysCases,
      urgentCases,
      totalClients,
      revenue: {
        currentMonth: totalInvoiceRevenue, // Show total invoice revenue for better visibility
        growth: revenueGrowth,
        invoiced: totalInvoiceRevenue,
        paid: paidInvoiceRevenue,
        billable: monthlyBillableAmount,
        billableHours: monthlyBillableHours
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get recent activity - with fallback to show existing data if no Activity records exist
router.get('/activity', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('Fetching recent activity for user:', userId);
    
    // Try to get activities from Activity model first
    const recentActivities = await Activity.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    console.log('Found activities:', recentActivities.length);

    if (recentActivities.length > 0) {
      const activities = recentActivities.map(activity => ({
        id: activity._id.toString(),
        type: activity.type,
        message: activity.message,
        timestamp: activity.createdAt,
        metadata: activity.metadata
      }));
      
      return res.json(activities);
    }

    // Fallback: Generate activities from recent data if no Activity records exist
    const activities = [];

    // Get recent cases (last 7 days)
    const recentCases = await Case.find({
      owner: userId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(3);

    recentCases.forEach(case_ => {
      activities.push({
        id: `case-${case_._id}`,
        type: 'case_created',
        message: `New case ${case_.caseNumber} created for ${case_.clientName}`,
        timestamp: case_.createdAt,
        metadata: {
          caseNumber: case_.caseNumber,
          clientName: case_.clientName,
          priority: case_.priority
        }
      });
    });

    // Get recent clients (last 7 days)
    const recentClients = await Client.find({
      owner: userId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(2);

    recentClients.forEach(client => {
      activities.push({
        id: `client-${client._id}`,
        type: 'client_registered',
        message: `New client ${client.name} registered`,
        timestamp: client.createdAt,
        metadata: {
          clientName: client.name,
          email: client.email
        }
      });
    });

    // Get recent invoices (last 7 days)
    const recentInvoices = await Invoice.find({
      owner: userId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(2);

    for (const invoice of recentInvoices) {
      const client = await Client.findById(invoice.clientId);
      activities.push({
        id: `invoice-${invoice._id}`,
        type: 'invoice_created',
        message: `Invoice ${invoice.invoiceNumber} created for ${client?.name || 'client'}`,
        timestamp: invoice.createdAt,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          clientName: client?.name,
          amount: invoice.total,
          currency: invoice.currency
        }
      });
    }

    // Get recent time entries (last 3 days)
    const recentTimeEntries = await TimeEntry.find({
      owner: userId,
      createdAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(2);

    for (const timeEntry of recentTimeEntries) {
      const case_ = await Case.findById(timeEntry.caseId);
      const durationText = timeEntry.duration >= 60 
        ? `${Math.floor(timeEntry.duration / 60)}h ${timeEntry.duration % 60}m` 
        : `${timeEntry.duration}m`;
      
      activities.push({
        id: `time-${timeEntry._id}`,
        type: 'time_logged',
        message: `${durationText} logged for ${case_?.caseNumber || 'case'}`,
        timestamp: timeEntry.createdAt,
        metadata: {
          duration: timeEntry.duration,
          durationText: durationText,
          description: timeEntry.description,
          caseNumber: case_?.caseNumber,
          billable: timeEntry.billable
        }
      });
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log('Generated fallback activities:', activities.length);
    res.json(activities.slice(0, 10));
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// Get important notifications (today, tomorrow, urgent) - no duplicates, no fake data
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

    console.log('Fetching notifications for user:', userId);

    // Get alerts for today and tomorrow
    const upcomingAlerts = await Alert.find({
      owner: userId,
      alertTime: {
        $gte: today,
        $lt: dayAfterTomorrow
      }
    }).sort({ alertTime: 1 });

    // Get cases with hearings today
    const todaysHearings = await Case.find({
      owner: userId,
      hearingDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ hearingTime: 1 });

    // Get cases with hearings tomorrow
    const tomorrowsHearings = await Case.find({
      owner: userId,
      hearingDate: {
        $gte: tomorrow,
        $lt: dayAfterTomorrow
      }
    }).sort({ hearingTime: 1 });

    // Get urgent cases with hearings in next 7 days (exclude today and tomorrow to avoid duplicates)
    const urgentCases = await Case.find({
      owner: userId,
      priority: 'urgent',
      hearingDate: {
        $gte: dayAfterTomorrow,
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    }).sort({ hearingDate: 1 });

    // Get overdue invoices
    const overdueInvoices = await Invoice.find({
      owner: userId,
      status: { $in: ['sent', 'overdue'] },
      dueDate: { $lt: today }
    }).sort({ dueDate: 1 }).limit(5);

    console.log('Notifications found:', {
      todaysHearings: todaysHearings.length,
      tomorrowsHearings: tomorrowsHearings.length,
      urgentCases: urgentCases.length,
      overdueInvoices: overdueInvoices.length,
      alerts: upcomingAlerts.length
    });

    const notifications = {
      alerts: upcomingAlerts,
      urgentCases,
      overdueInvoices,
      todaysHearings,
      tomorrowsHearings,
      summary: {
        totalUnread: upcomingAlerts.filter(a => !a.isRead).length,
        urgentCount: urgentCases.length,
        overdueCount: overdueInvoices.length,
        todayHearings: todaysHearings.length,
        tomorrowHearings: tomorrowsHearings.length
      }
    };

    res.json(notifications);
  } catch (error) {
    console.error('Dashboard notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router;