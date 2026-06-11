import express from 'express';
import { checkNotBanned, requireParticipant } from '../middleware/communityAccess.js';
import {
  listConversations,
  createPrivateConversation,
  getConversationDetails,
  getMessages,
  leaveConversation,
  pinConversation,
} from '../controllers/conversationController.js';

const router = express.Router();

// List user's conversations
router.get('/', listConversations);

// Create private conversation with another user
router.post('/', checkNotBanned, createPrivateConversation);

// Get a specific conversation's details
router.get('/:conversationId', requireParticipant, getConversationDetails);

// Get paginated messages in a conversation
router.get('/:conversationId/messages', requireParticipant, getMessages);

// Leave or archive a conversation
router.delete('/:conversationId', requireParticipant, leaveConversation);

// Pin/unpin conversation
router.patch('/:conversationId/pin', requireParticipant, pinConversation);

export default router;
