import { logger } from '@/lib/logger';
import React, { useState } from 'react';
import { Conversation } from '../services/communityApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Pin, MessageSquarePlus, MessageSquare, Volume2, ShieldAlert, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelect: (conv: Conversation) => void;
  onCreateChat: (type: 'private' | 'group', participants: string[], name?: string) => Promise<void>;
  loading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversation,
  onSelect,
  onCreateChat,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatType, setNewChatType] = useState<'private' | 'group'>('private');
  const [newChatName, setNewChatName] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');

  const filtered = conversations.filter(c => {
    const name = c.name || c.participants.map(p => p.name).join(', ') || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.channelSlug || '').includes(searchQuery.toLowerCase());
  });

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmails.trim()) return;
    
    // In a real system, you would translate emails or names to user IDs.
    // For now, we split emails and pass them as participant placeholder array.
    const mockUserIds = inviteEmails.split(',').map(s => s.trim());
    try {
      await onCreateChat(newChatType, mockUserIds, newChatType === 'group' ? newChatName : undefined);
      setIsNewChatOpen(false);
      setInviteEmails('');
      setNewChatName('');
    } catch (err) {
      logger.error(err);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'channel': return <Volume2 className="h-3.5 w-3.5 text-indigo-500" />;
      case 'support': return <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />;
      case 'announcement': return <Sparkles className="h-3.5 w-3.5 text-sky-500 animate-pulse" />;
      default: return <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-md border-r">
      {/* Top Search bar + New button */}
      <div className="p-3 border-b flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-primary flex items-center gap-1.5">
            💬 Juriq Chat
          </h2>
          <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-muted text-primary">
                <MessageSquarePlus className="h-4.5 w-4.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Start a New Conversation</DialogTitle>
                <DialogDescription className="sr-only">
                  Start a private direct chat or a group conversation with multiple legal professionals.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateChat} className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newChatType === 'private' ? 'default' : 'outline'}
                    onClick={() => setNewChatType('private')}
                    className="flex-1 h-8 text-xs font-bold"
                  >
                    Direct Message
                  </Button>
                  <Button
                    type="button"
                    variant={newChatType === 'group' ? 'default' : 'outline'}
                    onClick={() => setNewChatType('group')}
                    className="flex-1 h-8 text-xs font-bold"
                  >
                    Group Chat
                  </Button>
                </div>

                {newChatType === 'group' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Group Name</label>
                    <Input
                      placeholder="e.g. Legal Research Team"
                      value={newChatName}
                      onChange={e => setNewChatName(e.target.value)}
                      className="h-8.5 text-xs"
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Invite Participants (Email or Name)
                  </label>
                  <Input
                    placeholder="Enter email addresses, comma separated"
                    value={inviteEmails}
                    onChange={e => setInviteEmails(e.target.value)}
                    className="h-8.5 text-xs"
                    required
                  />
                </div>

                <Button type="submit" className="w-full h-9 text-xs font-bold mt-2">
                  Launch Chat
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs border-transparent hover:border-accent hover:border-2 transition-all"
          />
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-xs text-muted-foreground italic">
            Syncing chats...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-muted-foreground italic">
            No chats found
          </div>
        ) : (
          filtered.map(conv => {
            const isActive = activeConversation?._id === conv._id;
            const displayName =
              conv.name ||
              conv.participants
                .filter(p => p.email !== 'me') // UI name parsing fallback
                .map(p => p.name)
                .join(', ') ||
              'Private Room';
            
            const initials = displayName.substring(0, 2).toUpperCase();
            const unread = conv.unreadCount || 0;
            const lastMsgPreview = conv.lastMessage?.preview || 'No messages yet';

            return (
              <button
                key={conv._id}
                onClick={() => onSelect(conv)}
                className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-all duration-300 hover:bg-muted/40 ${
                  isActive ? 'bg-primary/10 border-l-4 border-primary shadow-inner' : ''
                }`}
              >
                <Avatar className="h-9 w-9 rounded-xl">
                  {conv.avatarUrl && <AvatarImage src={conv.avatarUrl} />}
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-black rounded-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-xs truncate text-foreground flex items-center gap-1.5">
                      {displayName}
                      {renderIcon(conv.type)}
                    </span>
                    {conv.pinnedMessages.length > 0 && <Pin className="h-3 w-3 text-muted-foreground" />}
                  </div>

                  <p className="text-[10px] text-muted-foreground truncate h-4">
                    {lastMsgPreview}
                  </p>
                </div>

                {unread > 0 && (
                  <Badge className="bg-primary hover:bg-primary text-[9px] h-4.5 min-w-4.5 rounded-full flex items-center justify-center p-1.5 font-bold shadow-md">
                    {unread}
                  </Badge>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;
