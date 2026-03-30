import logger from './logger.js';
import https from 'https';
import http from 'http';

/**
 * Service to keep the Render free-tier instance awake.
 * It pings its own public health endpoint every 14 minutes.
 */
export const startKeepAlive = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    logger.debug('Keep-alive disabled (not in production)');
    return;
  }

  // Derive target URL from environment
  // We prefer GOOGLE_CALLBACK_URL because it's guaranteed to be the public entry point
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
  if (!callbackUrl) {
    logger.warn('GOOGLE_CALLBACK_URL not set; trying to derive backend URL from FRONTEND_URL or defaulting to localhost (disabled)');
    return;
  }

  try {
    const url = new URL(callbackUrl);
    // Ping the /health path on the same host
    const pingUrl = `${url.protocol}//${url.host}/health`;
    
    logger.info({ pingUrl }, '🚀 Initializing Render keep-alive system');

    // Ping every 14 minutes (Render sleeps after 15m)
    setInterval(() => {
      const client = url.protocol === 'https:' ? https : http;
      
      client.get(pingUrl, (res) => {
        if (res.statusCode === 200) {
          logger.debug({ status: 200, url: pingUrl }, '✅ Keep-alive: Service poked successfully');
        } else {
          logger.warn({ status: res.statusCode, url: pingUrl }, '⚠️ Keep-alive: Poking service returned non-200');
        }
      }).on('error', (err) => {
        logger.error({ err: err.message, url: pingUrl }, '❌ Keep-alive: Poke failed');
      });
    }, 14 * 60 * 1000);

  } catch (err) {
    logger.error({ err: err.message }, 'Failed to initialize keep-alive');
  }
};
