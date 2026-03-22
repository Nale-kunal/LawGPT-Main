/**
 * Legal Research Cron Job.
 * Schedules automatic data refresh using node-cron.
 * Runs daily at 02:00 AM server time.
 *
 * Errors are isolated — a failed cron job will NOT crash the server.
 * Uses the existing logger utility for consistency.
 */

import cron from 'node-cron';
import { runFullRefresh } from '../services/legalDataService.js';
import logger from '../utils/logger.js';

let isInitialized = false;

/**
 * Start the legal data cron job.
 * Safe to call multiple times — only initialises once.
 */
export function startLegalCron() {
    if (isInitialized) {return;}
    isInitialized = true;

    // Schedule: every day at 02:00 AM
    cron.schedule('0 2 * * *', async () => {
        logger.info('[legalCron] Starting scheduled legal data refresh…');
        try {
            await runFullRefresh();
            // Embedding generation is triggered inside runFullRefresh (non-blocking)
            logger.info('[legalCron] Scheduled legal data refresh complete');
        } catch (err) {
            logger.error({ err }, '[legalCron] Scheduled refresh failed');
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Kolkata', // IST
    });

    logger.info('[legalCron] Legal data cron scheduled — daily at 02:00 IST');
}
