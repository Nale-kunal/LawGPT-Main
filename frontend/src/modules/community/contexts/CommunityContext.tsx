/**
 * CommunityContext.tsx
 *
 * Central React Context that manages:
 *  - Socket.IO connection lifecycle, auto-reconnect, and heartbeat.
 *  - Real-time event dispatching (messages, typing, presence, reactions).
 *  - Global community UI states (conversations, active chat, messages, unread counters).
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import communityApi, { Conversation, Message, Participant } from '../services/communityApi';
import { generateClientMessageId } from '../services/cryptoService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';

interface CommunityContextType {
  socket: Socket | null;
  isConnected: boolean;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  onlineUsers: Record<string, 'online' | 'away' | 'offline'>;
  typingUsers: Record<string, string[]>; // conversationId -> Array of User Names
  unreadCount: number;
  loadingConversations: boolean;
  loadingMessages: boolean;
  
  setActiveConversation: (conv: Conversation | null) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (convId: string) => Promise<void>;
  sendMessage: (content: string, type?: 'text' | 'image' | 'voice' | 'file', attachments?: any[]) => Promise<void>;
  sendTyping: (convId: string) => void;
  markAsRead: (convId: string) => void;
  createConversation: (type: string, participantIds: string[], name?: string, description?: string) => Promise<Conversation>;
  archiveConversation: (convId: string) => Promise<void>;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);


export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversationState] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, 'online' | 'away' | 'offline'>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const { toast } = useToast();
  
  // Refs for tracking active state
  const activeConversationRef = useRef<Conversation | null>(null);
  const typingTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  const setActiveConversation = (conv: Conversation | null) => {
    activeConversationRef.current = conv;
    setActiveConversationState(conv);
    if (conv) {
      fetchMessages(conv._id);
      markAsRead(conv._id);
    } else {
      setMessages([]);
    }
  };

  // ── Fetch Conversations (REST) ──────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const data = await communityApi.getConversations();
      setConversations(data || []);
    } catch (err) {
      logger.error('Failed to load conversations', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // ── Fetch Messages (REST) ───────────────────────────────────────────────────
  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    try {
      const response = await communityApi.getConversationMessages(convId, { limit: 50 });
      setMessages(response.messages || []);
    } catch (err) {
      logger.error('Failed to fetch messages', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // ── Mark as Read ────────────────────────────────────────────────────────────
  const markAsRead = useCallback((convId: string) => {
    // 1. Local update
    setConversations(prev =>
      prev.map(c => (c._id === convId ? { ...c, unreadCount: 0 } : c))
    );
    // 2. Socket emit
    if (socket && isConnected) {
      socket.emit('markRead', { conversationId: convId });
    }
  }, [socket, isConnected]);

  const { complianceStatus } = useAuth();

  // ── Initialize Socket.IO ────────────────────────────────────────────────────
  useEffect(() => {
    // Gate on compliance status
    if (complianceStatus !== 'accepted') {
      return;
    }

    // Connect unconditionally — the backend socket auth middleware handles
    // unauthenticated connection rejection. The session JWT is httpOnly and
    // is not readable via document.cookie, so we cannot gate here client-side.
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socketInstance = io(backendUrl, {
      path: '/socket.io/community',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socketInstance.on('connect', () => {
      logger.debug('🔌 Socket.IO community connected successfully');
      setIsConnected(true);
      
      // Auto-join active conversation room if set
      if (activeConversationRef.current) {
        socketInstance.emit('joinConversation', { conversationId: activeConversationRef.current._id });
      }
    });

    socketInstance.on('disconnect', (reason) => {
      logger.debug('🔌 Socket.IO community disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      logger.error('🔌 Socket.IO community connection error:', error.message);
      setIsConnected(false);

      // Prevent rapid infinite reconnection loops on auth rejection or limit issues
      const authErrorCodes = ['SOCKET_AUTH_REQUIRED', 'SOCKET_AUTH_INVALID', 'SOCKET_AUTH_REVOKED', 'SOCKET_LIMIT_EXCEEDED'];
      if (authErrorCodes.includes(error.message) || error.message.includes('auth') || error.message.includes('Authentication')) {
        logger.warn('🔌 Authentication/Authorization rejected connection. Halting auto-reconnect.', error.message);
        socketInstance.disconnect();
      }
    });

    // ── Real-Time Message Event ───────────────────────────────────────────────
    socketInstance.on('message', (message: Message) => {
      const activeConv = activeConversationRef.current;
      
      // 1. Update message list if it belongs to current active conversation
      if (activeConv && message.conversationId === activeConv._id) {
        setMessages(prev => {
          // Prevent duplicates (e.g. if client already appended optimistically)
          if (prev.some(m => m._id === message._id || (m.clientMessageId && m.clientMessageId === message.clientMessageId))) {
            return prev.map(m => (m.clientMessageId === message.clientMessageId ? message : m));
          }
          return [...prev, message];
        });
        
        // Auto-acknowledge reading
        socketInstance.emit('markRead', { conversationId: activeConv._id });
      } else {
        // 2. Play subtle sound or toast notification + increment unread count
        setConversations(prev =>
          prev.map(c =>
            c._id === message.conversationId
              ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: { messageId: message._id, senderId: typeof message.senderId === 'string' ? message.senderId : message.senderId._id, preview: message.content, sentAt: message.createdAt } }
              : c
          )
        );

        toast({
          title: `New message`,
          description: message.content.substring(0, 50),
        });
      }
    });

    // ── Real-Time Typing Indicators ───────────────────────────────────────────
    socketInstance.on('typingStart', (data: { conversationId: string; userId: string; userName: string }) => {
      const activeConv = activeConversationRef.current;
      if (!activeConv || data.conversationId !== activeConv._id) return;

      setTypingUsers(prev => {
        const list = prev[data.conversationId] || [];
        if (list.includes(data.userName)) return prev;
        return { ...prev, [data.conversationId]: [...list, data.userName] };
      });

      // Automatically stop typing indication after 3 seconds of inactivity
      const timerKey = `${data.conversationId}:${data.userId}`;
      if (typingTimerRef.current[timerKey]) clearTimeout(typingTimerRef.current[timerKey]);
      
      typingTimerRef.current[timerKey] = setTimeout(() => {
        setTypingUsers(prev => {
          const list = prev[data.conversationId] || [];
          return { ...prev, [data.conversationId]: list.filter(name => name !== data.userName) };
        });
      }, 3500);
    });

    socketInstance.on('typingStop', (data: { conversationId: string; userId: string; userName: string }) => {
      const activeConv = activeConversationRef.current;
      if (!activeConv || data.conversationId !== activeConv._id) return;

      const timerKey = `${data.conversationId}:${data.userId}`;
      if (typingTimerRef.current[timerKey]) {
        clearTimeout(typingTimerRef.current[timerKey]);
        delete typingTimerRef.current[timerKey];
      }

      setTypingUsers(prev => {
        const list = prev[data.conversationId] || [];
        return { ...prev, [data.conversationId]: list.filter(name => name !== data.userName) };
      });
    });

    // ── Presence Event ────────────────────────────────────────────────────────
    socketInstance.on('presenceUpdate', (data: { userId: string; status: 'online' | 'away' | 'offline' }) => {
      setOnlineUsers(prev => ({ ...prev, [data.userId]: data.status }));
    });

    socketInstance.on('userPresenceBatch', (batch: Record<string, 'online' | 'away' | 'offline'>) => {
      setOnlineUsers(prev => ({ ...prev, ...batch }));
    });

    // ── Reactions Realtime ─────────────────────────────────────────────────────
    socketInstance.on('reactionUpdate', (data: { messageId: string; reactions: any[] }) => {
      setMessages(prev =>
        prev.map(m => (m._id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    });

    setSocket(socketInstance);
    fetchConversations();

    return () => {
      socketInstance.disconnect();
      // Clear timers
      Object.values(typingTimerRef.current).forEach(clearTimeout);
    };
  }, [fetchConversations, toast, complianceStatus]);

  // ── Send Message ────────────────────────────────────────────────────────────
  const sendMessage = async (
    content: string,
    type: 'text' | 'image' | 'voice' | 'file' = 'text',
    attachments?: any[]
  ) => {
    const activeConv = activeConversationRef.current;
    if (!activeConv) return;

    const clientMsgId = generateClientMessageId();
    
    // Create optimistic temporary message to display immediately
    const tempMsg: Message = {
      _id: `temp-${clientMsgId}`,
      conversationId: activeConv._id,
      senderId: 'me', // handled UI side as local user
      content,
      messageType: type,
      reactions: [],
      readBy: [],
      deliveryStatus: 'sent',
      isEdited: false,
      isDeleted: false,
      isForwarded: false,
      isPinned: false,
      attachments,
      clientMessageId: clientMsgId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMsg]);

    // Send via Socket.IO if connected, fallback to REST
    if (socket && isConnected) {
      socket.emit('sendMessage', {
        conversationId: activeConv._id,
        content,
        messageType: type,
        attachments,
        clientMessageId: clientMsgId,
      });
    } else {
      try {
        const savedMsg = await communityApi.sendMessage({
          conversationId: activeConv._id,
          content,
          messageType: type,
          attachments,
          clientMessageId: clientMsgId,
        });
        
        // Swap optimistic message with the actual saved message
        setMessages(prev =>
          prev.map(m => (m.clientMessageId === clientMsgId ? savedMsg : m))
        );
      } catch (err) {
        logger.error('Failed to send message via REST fallback', err);
        // Mark optimistic message as failed
        setMessages(prev =>
          prev.map(m =>
            m.clientMessageId === clientMsgId ? { ...m, deliveryStatus: 'sent', content: '⚠️ Message failed to send. Click to retry.' } : m
          )
        );
      }
    }
  };

  // ── Send Typing Status ──────────────────────────────────────────────────────
  const sendTyping = (convId: string) => {
    if (socket && isConnected) {
      socket.emit('typingStart', { conversationId: convId });
    }
  };

  // ── Create Conversation ─────────────────────────────────────────────────────
  const createConversation = async (
    type: string,
    participantIds: string[],
    name?: string,
    description?: string
  ) => {
    const conv = await communityApi.createConversation({ type, participants: participantIds, name, description });
    setConversations(prev => [conv, ...prev]);
    setActiveConversation(conv);
    return conv;
  };

  // ── Archive Conversation ────────────────────────────────────────────────────
  const archiveConversation = async (convId: string) => {
    await communityApi.archiveConversation(convId);
    setConversations(prev => prev.filter(c => c._id !== convId));
    if (activeConversationRef.current?._id === convId) {
      setActiveConversation(null);
    }
  };

  // ── Unread message counter ─────────────────────────────────────────────────
  const unreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <CommunityContext.Provider
      value={{
        socket,
        isConnected,
        conversations,
        activeConversation,
        messages,
        onlineUsers,
        typingUsers,
        unreadCount,
        loadingConversations,
        loadingMessages,
        setActiveConversation,
        fetchConversations,
        fetchMessages,
        sendMessage,
        sendTyping,
        markAsRead,
        createConversation,
        archiveConversation,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};
