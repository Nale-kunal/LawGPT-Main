import express from 'express';
import { checkNotBanned, requireParticipant, requireModerator } from '../middleware/communityAccess.js';
import {
  editMessage,
  deleteMessage,
  pinMessage,
  forwardMessage,
  searchMessages,
} from '../controllers/messageController.js';

const router = express.Router();

// Edit own message
router.patch('/:messageId', checkNotBanned, editMessage);

// Delete message (own or admin)
router.delete('/:messageId', deleteMessage);

// Pin/unpin message (moderator+)
router.patch('/:messageId/pin', pinMessage);

// Forward message to another conversation
router.post('/:messageId/forward', checkNotBanned, forwardMessage);

// Search messages in a conversation
router.get('/search/:conversationId', requireParticipant, searchMessages);

export default router;
