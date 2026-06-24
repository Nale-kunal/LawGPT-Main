import { logger } from '@/lib/logger';
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCommunity } from '../contexts/CommunityContext';
import ConversationList from '../components/ConversationList';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import ChannelList from '../components/ChannelList';
import SupportPage from './SupportPage';
import FeedbackPage from './FeedbackPage';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { IssueReport } from '../components/IssueReport';
import communityApi, { Conversation, Message, Channel } from '../services/communityApi';
import { useToast } from '@/hooks/use-toast';
import { Hash, MessageSquare, Users, Pin, ShieldCheck, Scale, ExternalLink } from 'lucide-react';

const GUIDELINES_STORAGE_KEY = 'juriq_community_guidelines_ack_v1';

export const CommunityPage: React.FC = () => {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loadingConversations,
    loadingMessages,
    sendMessage,
    sendTyping,
    typingUsers,
    createConversation,
  } = useCommunity();

  const [activeTab, setActiveTab] = useState<'discussions' | 'support' | 'feedback'>('discussions');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  // Guidelines gate — show once per browser session, persist in localStorage
  const [guidelinesAcknowledged, setGuidelinesAcknowledged] = useState<boolean>(() => {
    try { return localStorage.getItem(GUIDELINES_STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [showGuidelinesGate, setShowGuidelinesGate] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, activeTab]);

  // Show guidelines gate when discussions tab first accessed and not yet acknowledged
  useEffect(() => {
    if (activeTab === 'discussions' && !guidelinesAcknowledged) {
      setShowGuidelinesGate(true);
    }
  }, [activeTab, guidelinesAcknowledged]);

  const handleAcknowledgeGuidelines = () => {
    try { localStorage.setItem(GUIDELINES_STORAGE_KEY, 'true'); } catch { /* storage unavailable */ }
    setGuidelinesAcknowledged(true);
    setShowGuidelinesGate(false);
  };

  // Load public channels
  const fetchChannels = async () => {
    setLoadingChannels(true);
    try {
      const data = await communityApi.getChannels();
      setChannels(data || []);
    } catch (err) {
      logger.error(err);
    } finally {
      setLoadingChannels(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleJoinChannel = async (slug: string) => {
    setLoadingSlug(slug);
    try {
      await communityApi.joinChannel(slug);
      toast({ title: 'Joined Channel', description: `You have successfully joined #${slug}` });
      fetchChannels();
      // Reload conversations list to show new room
      window.location.reload();
    } catch (err) {
      logger.error(err);
    } finally {
      setLoadingSlug(null);
    }
  };

  const handleLeaveChannel = async (slug: string) => {
    setLoadingSlug(slug);
    try {
      await communityApi.leaveChannel(slug);
      toast({ title: 'Left Channel', description: `You have left #${slug}` });
      fetchChannels();
    } catch (err) {
      logger.error(err);
    } finally {
      setLoadingSlug(null);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await communityApi.reactToMessage(messageId, emoji);
    } catch (err) {
      logger.error(err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await communityApi.deleteMessage(messageId);
      toast({ title: 'Deleted', description: 'Message soft deleted.' });
    } catch (err) {
      logger.error(err);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      await communityApi.pinMessage(messageId);
      toast({ title: 'Pinned', description: 'Message pinned in this conversation.' });
    } catch (err) {
      logger.error(err);
    }
  };

  const handleReportViolation = async (category: string, detail: string) => {
    if (!reportMessageId) return;
    try {
      await communityApi.reportMessage(reportMessageId, category, detail);
      toast({ title: 'Report Filed', description: 'Our moderation team will review the flagged content.' });
      setReportMessageId(null);
    } catch (err) {
      logger.error(err);
    }
  };

  const handleCreateChat = async (type: 'private' | 'group', participants: string[], name?: string) => {
    try {
      await createConversation(type, participants, name);
      toast({ title: 'Chat Created', description: 'New direct or group chat started successfully.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Could not resolve participants or create room.', variant: 'destructive' });
    }
  };

  // Header display details
  const activeTitle = activeConversation
    ? activeConversation.name || activeConversation.participants.map(p => p.name).join(', ')
    : '';

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full rounded-2xl overflow-hidden border bg-background/30 backdrop-blur-xl shadow-2xl">

      {/* ── Community Guidelines Gate — shown once before discussions access ── */}
      <Dialog
        open={showGuidelinesGate}
        onOpenChange={() => { /* intentionally non-dismissible — user must accept */ }}
      >
        <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <DialogTitle>Community Guidelines</DialogTitle>
            </div>
            <DialogDescription className="pt-1">
              Before joining the discussion, please acknowledge our community standards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 border rounded-md p-4 space-y-2">
              <p className="text-xs font-semibold text-foreground">By participating in Juriq's community, you agree to:</p>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>Communicate respectfully — no harassment, hate speech, or abusive language</li>
                <li>Not share confidential client information or case-specific legal advice</li>
                <li>Not post spam, promotional content, or off-topic material</li>
                <li>Not infringe third-party intellectual property rights</li>
                <li>Report content that violates these guidelines using the Report button</li>
                <li>Accept that Juriq may remove content or restrict access for violations</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Read the full{' '}
              <Link
                to="/dashboard/community-guidelines"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Community Guidelines <ExternalLink className="h-3 w-3" />
              </Link>
              {' '}before proceeding.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setActiveTab('support')} className="w-full sm:w-auto">
              Go Back
            </Button>
            <Button onClick={handleAcknowledgeGuidelines} className="w-full sm:w-auto">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              I Understand &amp; Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Top Consolidated Tab Bar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b bg-card/50 backdrop-blur-md px-5 py-3 gap-3 shrink-0">
        <div>
          <h1 className="text-sm font-black tracking-widest text-primary flex items-center gap-1.5 uppercase">
            <Users className="h-4.5 w-4.5" /> Lawyer Community
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Connect with legal professionals, get expert support, and request platform features.
          </p>
        </div>

        {/* User-friendly tab switcher (non-technical terms) */}
        <div className="flex bg-muted p-1 rounded-xl gap-1 shrink-0">
          <Button
            type="button"
            variant={activeTab === 'discussions' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 text-xs font-bold px-3.5 rounded-lg transition-all"
            onClick={() => setActiveTab('discussions')}
          >
            💬 Discussions
          </Button>
          <Button
            type="button"
            variant={activeTab === 'support' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 text-xs font-bold px-3.5 rounded-lg transition-all"
            onClick={() => setActiveTab('support')}
          >
            🛡️ Help Desk
          </Button>
          <Button
            type="button"
            variant={activeTab === 'feedback' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 text-xs font-bold px-3.5 rounded-lg transition-all"
            onClick={() => setActiveTab('feedback')}
          >
            💡 Suggestions
          </Button>
        </div>
      </div>

      {/* Main Tab Viewports */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'discussions' ? (
          <div className="flex-1 flex h-full overflow-hidden">
            {/* Left panel: Conversation List */}
            <div className="w-80 shrink-0 h-full border-r">
              <ConversationList
                conversations={conversations}
                activeConversation={activeConversation}
                onSelect={setActiveConversation}
                onCreateChat={handleCreateChat}
                loading={loadingConversations}
              />
            </div>

            {/* Center panel: Messaging Viewport */}
            <div className="flex-1 flex flex-col h-full bg-card/20 relative">
              {activeConversation ? (
                <>
                  {/* Header info */}
                  <div className="h-14 border-b bg-card/65 backdrop-blur-md px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        {activeConversation.type === 'channel' ? <Hash className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-xs md:text-sm text-foreground line-clamp-1">{activeTitle}</span>
                        {activeConversation.description && (
                          <span className="text-[10px] text-muted-foreground line-clamp-1">
                            {activeConversation.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeConversation.isEncrypted && (
                        <span className="text-[9px] uppercase tracking-wider text-emerald-500 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" /> Secure AES-256
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pinned Messages Header segment if present */}
                  {activeConversation.pinnedMessages && activeConversation.pinnedMessages.length > 0 && (
                    <div className="bg-amber-500/5 border-b border-amber-500/10 px-4 py-1.5 text-[10px] text-amber-500 font-semibold flex items-center gap-1.5">
                      <Pin className="h-3 w-3 shrink-0 rotate-45" />
                      <span className="truncate">This chat has pinned messages. Scroll up to review.</span>
                    </div>
                  )}

                  {/* Messages Viewport */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
                    {loadingMessages ? (
                      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic">
                        Retrieving secure conversation history...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-20">
                        <span className="text-3xl">👋</span>
                        <h3 className="font-black text-sm">Welcome to your secure chat!</h3>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          Start communicating inside this secure community room.
                        </p>
                      </div>
                    ) : (
                      messages.map(msg => (
                        <MessageBubble
                          key={msg._id}
                          message={msg}
                          isMe={msg.senderId === 'me' || (typeof msg.senderId === 'object' && msg.senderId.email === 'me')}
                          onReact={handleReact}
                          onReply={setReplyingTo}
                          onDelete={handleDeleteMessage}
                          onPin={handlePinMessage}
                          onReport={setReportMessageId}
                        />
                      ))
                    )}

                    {/* Typing indicators */}
                    {activeConversation && typingUsers[activeConversation._id] && typingUsers[activeConversation._id].length > 0 && (
                      <div className="text-[10px] text-muted-foreground italic font-semibold mt-1 ml-2.5 animate-pulse">
                        ✍️ {typingUsers[activeConversation._id].join(', ')} {typingUsers[activeConversation._id].length === 1 ? 'is' : 'are'} typing...
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Report violation dialog trigger */}
                  <Dialog open={!!reportMessageId} onOpenChange={(open) => !open && setReportMessageId(null)}>
                    {reportMessageId && (
                      <IssueReport
                        onSubmit={handleReportViolation}
                        targetType="message"
                        targetId={reportMessageId}
                        onClose={() => setReportMessageId(null)}
                      />
                    )}
                  </Dialog>

                  {/* Input panel */}
                  <ChatInput
                    onSend={sendMessage}
                    onTyping={() => activeConversation && sendTyping(activeConversation._id)}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                  />
                </>
              ) : (
                /* Empty Workspace viewport — lists public channels */
                <div className="flex-1 flex flex-col overflow-y-auto">
                  <div className="p-6 border-b bg-card/40 backdrop-blur-md">
                    <h2 className="text-lg font-black tracking-tight text-foreground">Explore Public Channels</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Browse announcements, legal discussion panels, support centers and community feedback.
                    </p>
                  </div>
                  
                  {loadingChannels ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic">
                      Scanning community index...
                    </div>
                  ) : (
                    <ChannelList
                      channels={channels}
                      onJoin={handleJoinChannel}
                      onLeave={handleLeaveChannel}
                      loadingSlug={loadingSlug}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'support' ? (
          <div className="flex-1 h-full overflow-y-auto bg-card/10">
            <SupportPage />
          </div>
        ) : (
          <div className="flex-1 h-full overflow-y-auto bg-card/10">
            <FeedbackPage />
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;
