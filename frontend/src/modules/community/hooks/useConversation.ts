/**
 * useConversation.ts
 *
 * Exposes methods and reactive state for a specific active conversation.
 */

import { useCommunity } from '../contexts/CommunityContext';
import { useEffect, useCallback } from 'react';

export function useConversation(conversationId?: string) {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    sendMessage,
    sendTyping,
    loadingMessages,
    typingUsers,
    markAsRead,
  } = useCommunity();

  // Sync conversation select if conversationId argument is passed
  useEffect(() => {
    if (conversationId) {
      const match = conversations.find(c => c._id === conversationId);
      if (match && activeConversation?._id !== conversationId) {
        setActiveConversation(match);
      }
    }
  }, [conversationId, conversations, activeConversation, setActiveConversation]);

  const triggerTyping = useCallback(() => {
    if (activeConversation) {
      sendTyping(activeConversation._id);
    }
  }, [activeConversation, sendTyping]);

  const activeTypingUsers = activeConversation ? (typingUsers[activeConversation._id] || []) : [];

  return {
    conversation: activeConversation,
    messages,
    loading: loadingMessages,
    typingUsers: activeTypingUsers,
    sendMessage,
    triggerTyping,
    markAsRead: () => activeConversation && markAsRead(activeConversation._id),
  };
}

export default useConversation;
