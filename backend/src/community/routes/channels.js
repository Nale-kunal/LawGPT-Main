import express from 'express';
import { requireRole } from '../../middleware/rbac.js';
import { checkNotBanned } from '../middleware/communityAccess.js';
import {
  listChannels,
  joinChannel,
  leaveChannel,
  createChannel,
  broadcastAnnouncement,
} from '../controllers/channelController.js';

const router = express.Router();

// List public channels
router.get('/', listChannels);

// Join a channel
router.post('/:slug/join', checkNotBanned, joinChannel);

// Leave a channel
router.delete('/:slug/leave', leaveChannel);

// Admin: Create channel
router.post('/', requireRole('admin'), createChannel);

// Admin: Broadcast announcement to a channel
router.post('/:slug/announce', requireRole('admin'), broadcastAnnouncement);

export default router;
