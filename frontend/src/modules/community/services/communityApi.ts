/**
 * communityApi.ts
 *
 * Axios-like REST client interface for the Juriq Community module.
 * Reuses the existing robust `api` utility from `@/lib/api`.
 * 
 * Automatically unwraps backend envelopes { ok: true, ... } to shield
 * React components and hooks from API wrapper formats.
 */

import api from '@/lib/api';

// ── Types & Interfaces ────────────────────────────────────────────────────────

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
}

export interface Participant {
  _id: string;
  name: string;
  email: string;
  role: 'lawyer' | 'assistant' | 'admin' | 'user';
  avatarUrl?: string;
}

export interface Conversation {
  _id: string;
  type: 'private' | 'channel' | 'support' | 'announcement' | 'group';
  name?: string;
  description?: string;
  avatarUrl?: string;
  channelSlug?: string;
  participants: Participant[];
  isEncrypted: boolean;
  isArchived: boolean;
  isReadOnly: boolean;
  lastMessage?: {
    messageId: string;
    senderId: string;
    preview: string;
    sentAt: string;
  };
  pinnedMessages: string[];
  createdBy: string;
  supportTicketId?: string;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  isMuted?: boolean;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  userName?: string;
}

export interface MessageAttachment {
  cloudinaryPublicId: string;
  secureUrl: string;
  resourceType: string;
  mimeType: string;
  sizeBytes: number;
  filename: string;
  thumbnailUrl?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: Participant | string; // Populate user
  content: string; // Decrypted content
  messageType: 'text' | 'image' | 'voice' | 'file' | 'system';
  replyTo?: string | Message;
  reactions: MessageReaction[];
  readBy: string[];
  deliveryStatus: 'sent' | 'delivered' | 'read';
  isEdited: boolean;
  isDeleted: boolean;
  isForwarded: boolean;
  isPinned: boolean;
  attachments?: MessageAttachment[];
  clientMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  _id: string;
  slug: string;
  name: string;
  description: string;
  type: 'general' | 'announcement' | 'support' | 'feedback';
  isReadOnly: boolean;
  allowReactions: boolean;
  memberCount: number;
  isJoined?: boolean;
}

export interface SupportTicket {
  _id: string;
  conversationId: string | Conversation;
  userId: Participant | string;
  assignedAdminId?: Participant | string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'investigating' | 'resolved' | 'closed' | 'duplicate' | 'pending_user_response';
  category: string;
  tags: string[];
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackItem {
  _id: string;
  userId: Participant | { _id: string; name: string };
  category: 'ui_ux' | 'performance' | 'ai' | 'billing' | 'community' | 'mobile' | 'security' | 'integrations';
  title: string;
  content: string;
  isPublic: boolean;
  upvotes: string[]; // user ids
  downvotes: string[]; // user ids
  adminReply?: {
    content: string;
    repliedBy: string;
    repliedAt: string;
  };
  status: 'open' | 'under_review' | 'planned' | 'implemented' | 'declined';
  conversationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudinarySignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export interface CommunityNotification {
  _id: string;
  userId: string;
  type: 'mention' | 'reply' | 'reaction' | 'announcement' | 'support_update';
  title: string;
  body: string;
  isRead: boolean;
  conversationId?: string;
  messageId?: string;
  createdAt: string;
}

// ── REST Client Methods with Automatic Envelope Unwrapping ────────────────────

export const communityApi = {
  // Conversations
  getConversations: async (): Promise<Conversation[]> => {
    const res = await api.get<{ ok: boolean; conversations: Conversation[] }>('/api/v1/community/conversations');
    return res.conversations || [];
  },
  
  createConversation: async (data: { type: string; participants: string[]; name?: string; description?: string }): Promise<Conversation> => {
    const res = await api.post<{ ok: boolean; conversation: Conversation }>('/api/v1/community/conversations', data);
    return res.conversation;
  },
  
  getConversationDetails: async (id: string): Promise<Conversation> => {
    const res = await api.get<{ ok: boolean; conversation: Conversation }>(`/api/v1/community/conversations/${id}`);
    return res.conversation;
  },
  
  getConversationMessages: async (id: string, params?: { cursor?: string; limit?: number }) => {
    let query = '';
    if (params) {
      const qParts = [];
      if (params.cursor) qParts.push(`cursor=${params.cursor}`);
      if (params.limit) qParts.push(`limit=${params.limit}`);
      if (qParts.length > 0) query = `?${qParts.join('&')}`;
    }
    const res = await api.get<{ ok: boolean; messages: Message[]; nextCursor: string | null }>(
      `/api/v1/community/conversations/${id}/messages${query}`
    );
    return { messages: res.messages || [], nextCursor: res.nextCursor };
  },
  
  archiveConversation: async (id: string) => {
    const res = await api.delete<{ ok: boolean }>(`/api/v1/community/conversations/${id}`);
    return { success: res.ok };
  },

  // Messages
  sendMessage: async (data: {
    conversationId: string;
    content: string;
    messageType?: 'text' | 'image' | 'voice' | 'file';
    replyTo?: string;
    attachments?: MessageAttachment[];
    clientMessageId?: string;
  }): Promise<Message> => {
    const res = await api.post<{ ok: boolean; message: Message }>('/api/v1/community/messages', data);
    return res.message;
  },
  
  editMessage: async (id: string, content: string): Promise<Message> => {
    const res = await api.patch<{ ok: boolean; message: Message }>(`/api/v1/community/messages/${id}`, { content });
    return res.message;
  },
  
  deleteMessage: async (id: string) => {
    const res = await api.delete<{ ok: boolean }>(`/api/v1/community/messages/${id}`);
    return { success: res.ok };
  },
  
  reactToMessage: async (id: string, emoji: string): Promise<Message> => {
    const res = await api.post<{ ok: boolean; message: Message }>(`/api/v1/community/messages/${id}/react`, { emoji });
    return res.message;
  },
  
  pinMessage: async (id: string): Promise<Conversation> => {
    const res = await api.post<{ ok: boolean; conversation: Conversation }>(`/api/v1/community/messages/${id}/pin`);
    return res.conversation;
  },

  // Channels
  getChannels: async (): Promise<Channel[]> => {
    const res = await api.get<{ ok: boolean; channels: Channel[] }>('/api/v1/community/channels');
    return res.channels || [];
  },
  
  joinChannel: async (slug: string) => {
    const res = await api.post<{ ok: boolean; conversationId: string }>(`/api/v1/community/channels/${slug}/join`);
    return { success: res.ok, conversationId: res.conversationId };
  },
  
  leaveChannel: async (slug: string) => {
    const res = await api.delete<{ ok: boolean }>(`/api/v1/community/channels/${slug}/leave`);
    return { success: res.ok };
  },
  
  createChannel: async (data: { slug: string; name: string; description: string; type: string }): Promise<Channel> => {
    const res = await api.post<{ ok: boolean; channel: Channel }>('/api/v1/community/channels', data);
    return res.channel;
  },

  // Support Tickets
  createTicket: async (data: { category: string; priority: string; title: string; description: string }): Promise<SupportTicket> => {
    const res = await api.post<{ ok: boolean; ticket: SupportTicket }>('/api/v1/community/support', data);
    return res.ticket;
  },
  
  getTickets: async (): Promise<SupportTicket[]> => {
    const res = await api.get<{ ok: boolean; tickets: SupportTicket[] }>('/api/v1/community/support/my');
    return res.tickets || [];
  },
  
  updateTicketStatus: async (id: string, status: string): Promise<SupportTicket> => {
    const res = await api.patch<{ ok: boolean; ticket: SupportTicket }>(`/api/v1/community/support/${id}/status`, { status });
    return res.ticket;
  },

  // Feedback
  submitFeedback: async (data: { category: string; title: string; content: string; isPublic: boolean }): Promise<FeedbackItem> => {
    const res = await api.post<{ ok: boolean; feedback: FeedbackItem }>('/api/v1/community/feedback', data);
    return res.feedback;
  },
  
  getFeedback: async (): Promise<FeedbackItem[]> => {
    const res = await api.get<{ ok: boolean; feedback: FeedbackItem[] }>('/api/v1/community/feedback');
    return res.feedback || [];
  },
  
  voteFeedback: async (id: string, direction: 'up' | 'down'): Promise<FeedbackItem> => {
    const res = await api.post<{ ok: boolean; feedback: FeedbackItem }>(`/api/v1/community/feedback/${id}/vote`, { direction });
    return res.feedback;
  },

  // Reports
  reportMessage: async (messageId: string, reason: string) => {
    const res = await api.post<{ ok: boolean }>('/api/v1/community/reports/message', { messageId, reason });
    return { success: res.ok };
  },
  
  reportUser: async (targetUserId: string, reason: string) => {
    const res = await api.post<{ ok: boolean }>('/api/v1/community/reports/user', { targetUserId, reason });
    return { success: res.ok };
  },

  // Notifications
  getNotifications: async (params?: { page?: number; limit?: number }) => {
    let query = '';
    if (params) {
      const qParts = [];
      if (params.page) qParts.push(`page=${params.page}`);
      if (params.limit) qParts.push(`limit=${params.limit}`);
      if (qParts.length > 0) query = `?${qParts.join('&')}`;
    }
    const res = await api.get<{ ok: boolean; notifications: CommunityNotification[]; hasMore: boolean }>(
      `/api/v1/community/notifications${query}`
    );
    return { notifications: res.notifications || [], hasMore: res.hasMore };
  },
  
  markNotificationRead: async (id: string): Promise<CommunityNotification> => {
    const res = await api.patch<{ ok: boolean; notification: CommunityNotification }>(`/api/v1/community/notifications/${id}/read`);
    return res.notification;
  },
  
  markAllNotificationsRead: async () => {
    const res = await api.patch<{ ok: boolean }>('/api/v1/community/notifications/read-all');
    return { success: res.ok };
  },

  // Cloudinary direct uploads helper
  getUploadSignature: async (resourceType: string): Promise<CloudinarySignature> => {
    const res = await api.post<{ ok: boolean; signature: CloudinarySignature }>('/api/v1/community/uploads/sign', { resourceType });
    return res.signature;
  },

  // Admin Community Endpoints
  getAdminStats: async () => {
    const res = await api.get<{ ok: boolean; stats: any }>('/api/v1/admin/community/stats');
    return res.stats;
  },
  
  getAdminTickets: async (): Promise<SupportTicket[]> => {
    const res = await api.get<{ ok: boolean; tickets: SupportTicket[] }>('/api/v1/admin/community/tickets');
    return res.tickets || [];
  },
  
  getAdminReports: async () => {
    const res = await api.get<{ ok: boolean; reports: any[] }>('/api/v1/admin/community/reports');
    return res.reports || [];
  },
  
  getAdminOnlineUsers: async () => {
    const res = await api.get<{ ok: boolean; users: any[] }>('/api/v1/admin/community/online');
    return res.users || [];
  },
};

export default communityApi;
