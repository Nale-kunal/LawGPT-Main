/**
 * Legal Research Cron Job.
 * Schedules automatic data refresh using node-cron.
 * Runs daily at 02:00 AM server time.
 *
 * Errors are isolated — a failed cron job will NOT crash the server.
 * Uses the existing logger utility for consistency.
 */

import { runFullRefresh } from '../services/legalDataService.js';
import logger from '../utils/logger.js';

export async function runLegalCron() {
    logger.info('[legalCron] Starting scheduled legal data refresh…');
    try {
        await runFullRefresh();
        // Embedding generation is triggered inside runFullRefresh (non-blocking)
        logger.info('[legalCron] Scheduled legal data refresh complete');
    } catch (err) {
        logger.error({ err }, '[legalCron] Scheduled refresh failed');
    }
}
