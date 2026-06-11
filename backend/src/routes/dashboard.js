import express from 'express';
import { requireAuth } from '../middleware/auth-jwt.js';
import logger from '../utils/logger.js';
import {
  queryDocuments,
  getDocumentById,
  COLLECTIONS
} from '../services/mongodb.js';

const router = express.Router();
router.use(requireAuth);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Get cases statistics
    const allCases = await queryDocuments(
      COLLECTIONS.CASES,
      [{ field: 'owner', operator: '==', value: userId }]
    );
    const totalCases = allCases.length;
    const activeCases = allCases.filter(c => c.status === 'active').length;
    const todaysCases = allCases.filter(c => {
      if (!c.hearingDate) { return false; }
      const hearingDate = c.hearingDate.toDate ? c.hearingDate.toDate() : new Date(c.hearingDate);
      return hearingDate >= today && hearingDate < tomorrow;
    }).length;
    const urgentCases = allCases.filter(c => c.priority === 'urgent').length;

    // Get clients count
    const allClients = await queryDocuments(
      COLLECTIONS.CLIENTS,
      [{ field: 'owner', operator: '==', value: userId }]
    );
    const totalClients = allClients.length;

    return res.json({
      totalCases,
      activeCases,
      todaysCases,
      urgentCases,
      totalClients,
      revenue: {
        currentMonth: 0,
        growth: 0,
        invoiced: 0,
        paid: 0,
        billable: 0,
        billableHours: 0
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Dashboard stats error');
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get recent activity - with fallback to show existing data if no Activity records exist
router.get('/activity', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Try to get activities from Activity collection first
    const allActivities = await queryDocuments(
      COLLECTIONS.ACTIVITIES,
      [{ field: 'owner', operator: '==', value: userId }],
      { field: 'createdAt', direction: 'desc' }
    );

    if (allActivities.length > 0) {
      const activities = allActivities.slice(0, 10).map(activity => ({
        id: activity.id,
        type: activity.type,
        message: activity.message,
        timestamp: activity.createdAt?.toDate ? activity.createdAt.toDate() : new Date(activity.createdAt),
        metadata: activity.metadata
      }));

      return res.json(activities);
    }

    // Fallback: Generate activities from recent data if no Activity records exist
    const activities = [];

    // Get recent cases (last 7 days)
    const allCases = await queryDocuments(
      COLLECTIONS.CASES,
      [{ field: 'owner', operator: '==', value: userId }],
      { field: 'createdAt', direction: 'desc' }
    );

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCases = allCases.filter(c => {
      if (!c.createdAt) { return false; }
      const created = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
      return created >= sevenDaysAgo;
    }).slice(0, 3);

    recentCases.forEach(case_ => {
      const createdAt = case_.createdAt?.toDate ? case_.createdAt.toDate() : new Date(case_.createdAt);
      activities.push({
        id: `case-${case_.id}`,
        type: 'case_created',
        message: `New case ${case_.caseNumber} created for ${case_.clientName}`,
        timestamp: createdAt,
        metadata: {
          caseNumber: case_.caseNumber,
          clientName: case_.clientName,
          priority: case_.priority
        }
      });
    });

    // Get recent clients (last 7 days)
    const allClients = await queryDocuments(
      COLLECTIONS.CLIENTS,
      [{ field: 'owner', operator: '==', value: userId }],
      { field: 'createdAt', direction: 'desc' }
    );

    const recentClients = allClients.filter(c => {
      if (!c.createdAt) { return false; }
      const created = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
      return created >= sevenDaysAgo;
    }).slice(0, 2);

    recentClients.forEach(client => {
      const createdAt = client.createdAt?.toDate ? client.createdAt.toDate() : new Date(client.createdAt);
      activities.push({
        id: `client-${client.id}`,
        type: 'client_registered',
        message: `New client ${client.name} registered`,
        timestamp: createdAt,
        metadata: {
          clientName: client.name,
          email: client.email
        }
      });
    });

    // Get recent hearings (last 7 days)
    const allHearings = await queryDocuments(
      COLLECTIONS.HEARINGS,
      [{ field: 'owner', operator: '==', value: userId }],
      { field: 'createdAt', direction: 'desc' }
    );

    const recentHearings = allHearings.filter(h => {
      if (!h.createdAt) { return false; }
      const created = h.createdAt.toDate ? h.createdAt.toDate() : new Date(h.createdAt);
      return created >= sevenDaysAgo;
    }).slice(0, 2);

    for (const hearing of recentHearings) {
      const caseRecord = hearing.caseId ? await getDocumentById(COLLECTIONS.CASES, hearing.caseId) : null;
      const createdAt = hearing.createdAt?.toDate ? hearing.createdAt.toDate() : new Date(hearing.createdAt);
      activities.push({
        id: `hearing-${hearing.id}`,
        type: 'hearing_scheduled',
        message: `Hearing scheduled for ${caseRecord?.caseNumber || 'case'}`,
        timestamp: createdAt,
        metadata: {
          caseNumber: caseRecord?.caseNumber,
          hearingDate: hearing.hearingDate
        }
      });
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.json(activities.slice(0, 10));
  } catch (error) {
    logger.error({ err: error }, 'Dashboard activity error');
    return res.status(500).json({ error: 'Failed to fetch recent activity' });
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

    // Get alerts for today and tomorrow
    const allAlerts = await queryDocuments(
      COLLECTIONS.ALERTS,
      [{ field: 'owner', operator: '==', value: userId }]
    );

    const upcomingAlerts = allAlerts.filter(alert => {
      if (!alert.alertTime) { return false; }
      const alertTime = alert.alertTime.toDate ? alert.alertTime.toDate() : new Date(alert.alertTime);
      return alertTime >= today && alertTime < dayAfterTomorrow;
    }).sort((a, b) => {
      const aTime = a.alertTime.toDate ? a.alertTime.toDate() : new Date(a.alertTime);
      const bTime = b.alertTime.toDate ? b.alertTime.toDate() : new Date(b.alertTime);
      return aTime - bTime;
    });

    // Get cases with hearings today
    const allCases = await queryDocuments(
      COLLECTIONS.CASES,
      [{ field: 'owner', operator: '==', value: userId }]
    );

    const todaysHearings = allCases.filter(c => {
      if (!c.hearingDate) { return false; }
      const hearingDate = c.hearingDate.toDate ? c.hearingDate.toDate() : new Date(c.hearingDate);
      return hearingDate >= today && hearingDate < tomorrow;
    }).sort((a, b) => {
      const aTime = a.hearingTime || '';
      const bTime = b.hearingTime || '';
      return aTime.localeCompare(bTime);
    });

    // Get cases with hearings tomorrow
    const tomorrowsHearings = allCases.filter(c => {
      if (!c.hearingDate) { return false; }
      const hearingDate = c.hearingDate.toDate ? c.hearingDate.toDate() : new Date(c.hearingDate);
      return hearingDate >= tomorrow && hearingDate < dayAfterTomorrow;
    }).sort((a, b) => {
      const aTime = a.hearingTime || '';
      const bTime = b.hearingTime || '';
      return aTime.localeCompare(bTime);
    });

    // Get urgent cases with hearings in next 7 days (exclude today and tomorrow to avoid duplicates)
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const urgentCases = allCases.filter(c => {
      if (c.priority !== 'urgent') { return false; }
      if (!c.hearingDate) { return false; }
      const hearingDate = c.hearingDate.toDate ? c.hearingDate.toDate() : new Date(c.hearingDate);
      return hearingDate >= dayAfterTomorrow && hearingDate <= sevenDaysLater;
    }).sort((a, b) => {
      const aDate = a.hearingDate.toDate ? a.hearingDate.toDate() : new Date(a.hearingDate);
      const bDate = b.hearingDate.toDate ? b.hearingDate.toDate() : new Date(b.hearingDate);
      return aDate - bDate;
    });

    const notifications = {
      alerts: upcomingAlerts,
      urgentCases,
      overdueInvoices: [],
      todaysHearings,
      tomorrowsHearings,
      summary: {
        totalUnread: upcomingAlerts.filter(a => !a.isRead).length,
        urgentCount: urgentCases.length,
        overdueCount: 0,
        todayHearings: todaysHearings.length,
        tomorrowHearings: tomorrowsHearings.length
      }
    };

    return res.json(notifications);
  } catch (error) {
    logger.error({ err: error }, 'Dashboard notifications error');
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router;