import express from 'express';
import { checkNotBanned } from '../middleware/communityAccess.js';
import {
  getUserSessions,
  revokeSession,
  revokeAllSessions,
} from '../controllers/sessionController.js';

const router = express.Router();

// List active devices/sessions
router.get('/', checkNotBanned, getUserSessions);

// Revoke a specific session
router.post('/revoke/:sessionId', checkNotBanned, revokeSession);

// Revoke all sessions (except possibly the current, but here all for full nuclear security)
router.post('/revoke-all', checkNotBanned, revokeAllSessions);

export default router;
