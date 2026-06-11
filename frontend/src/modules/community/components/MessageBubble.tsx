import React from 'react';
import { Message, MessageReaction } from '../services/communityApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, CheckCheck, Smile, CornerUpLeft, Trash2, ShieldAlert, Pin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReport?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  onReact,
  onReply,
  onDelete,
  onReport,
  onPin,
}) => {
  const senderName = typeof message.senderId === 'object' ? message.senderId.name : 'User';
  const senderAvatar = typeof message.senderId === 'object' ? message.senderId.avatarUrl : '';

  const timeString = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hasReactions = message.reactions && message.reactions.length > 0;

  // Group reactions by emoji
  const groupedReactions = (message.reactions || []).reduce<Record<string, number>>((acc, curr) => {
    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={`flex flex-col group mb-2.5 max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
      {/* Sender Name */}
      {!isMe && (
        <span className="text-[10px] text-muted-foreground font-medium mb-0.5 ml-2.5">
          {senderName}
        </span>
      )}

      {/* Bubble Container */}
      <div className="relative flex items-center gap-1">
        {/* Actions trigger (Left for Me, Right for Others) */}
        {isMe && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-1.5 flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full text-muted-foreground hover:text-primary hover:bg-muted"
              onClick={() => onReply(message)}
              title="Reply"
            >
              <CornerUpLeft className="h-3 w-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground hover:bg-muted">
                  <Smile className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-1 min-w-[120px]">
                <div className="flex gap-1 p-1">
                  {COMMON_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => onReact(message._id, emoji)}
                      className="hover:scale-125 transition-transform duration-100 p-1 text-sm rounded hover:bg-muted"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {onPin && (
                  <DropdownMenuItem onClick={() => onPin(message._id)} className="text-xs">
                    <Pin className="h-3.5 w-3.5 mr-2" /> Pin Message
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={() => onDelete(message._id)} className="text-destructive text-xs">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Message
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Bubble main box */}
        <div
          className={`px-3.5 py-2.5 rounded-2xl shadow-sm text-xs md:text-sm max-w-full leading-relaxed relative ${
            isMe
              ? 'bg-primary text-primary-foreground rounded-tr-none'
              : 'bg-card border border-border text-foreground rounded-tl-none'
          } ${message.isDeleted ? 'italic text-muted-foreground bg-muted/40 border-none' : ''}`}
        >
          {/* Reply Block Preview */}
          {message.replyTo && (
            <div
              className={`p-2 rounded-lg border-l-2 mb-2 text-xs flex flex-col ${
                isMe
                  ? 'bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground/90'
                  : 'bg-muted/50 border-primary text-muted-foreground'
              }`}
            >
              <span className="font-bold text-[10px]">
                {typeof message.replyTo === 'object'
                  ? (typeof message.replyTo.senderId === 'object' ? message.replyTo.senderId.name : 'User')
                  : 'Reply'}
              </span>
              <span className="line-clamp-1">
                {typeof message.replyTo === 'object' ? message.replyTo.content : 'Message'}
              </span>
            </div>
          )}

          {/* Text Message Content */}
          {message.isDeleted ? (
            <span>🚫 This message was deleted</span>
          ) : (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          )}

          {/* Attachments Display */}
          {message.attachments && message.attachments.length > 0 && !message.isDeleted && (
            <div className="mt-2 space-y-1.5 max-w-xs">
              {message.attachments.map((att, i) => (
                <div key={i} className="rounded-lg overflow-hidden border bg-background/5 p-1 flex flex-col">
                  {att.mimeType.startsWith('image/') ? (
                    <a href={att.secureUrl} target="_blank" rel="noopener noreferrer" className="block max-h-48 overflow-hidden rounded">
                      <img
                        src={att.secureUrl}
                        alt={att.filename}
                        className="object-cover w-full h-full max-h-40 hover:scale-105 transition-transform duration-300"
                      />
                    </a>
                  ) : att.mimeType.startsWith('audio/') ? (
                    <audio src={att.secureUrl} controls className="w-full max-w-[200px] h-8 mt-1 scale-90 origin-left" />
                  ) : (
                    <a
                      href={att.secureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1.5 p-1 hover:underline text-primary"
                    >
                      📎 {att.filename} ({Math.round(att.sizeBytes / 1024)} KB)
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer inside Bubble: Timestamp + Read receipts */}
          <div className="flex items-center justify-end gap-1.5 mt-1.5 -mb-0.5 ml-4">
            {message.isEdited && !message.isDeleted && (
              <span className={`text-[8px] opacity-75 font-semibold`}>edited</span>
            )}
            <span className={`text-[9px] opacity-80 font-mono`}>{timeString}</span>
            {isMe && !message.isDeleted && (
              <span className="opacity-90">
                {message.deliveryStatus === 'read' ? (
                  <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
                ) : message.deliveryStatus === 'delivered' ? (
                  <CheckCheck className="h-3.5 w-3.5 text-zinc-300" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-zinc-300" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Actions trigger (Right for Others) */}
        {!isMe && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1.5 flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full text-muted-foreground hover:text-primary hover:bg-muted"
              onClick={() => onReply(message)}
              title="Reply"
            >
              <CornerUpLeft className="h-3 w-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground hover:bg-muted">
                  <Smile className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="p-1 min-w-[120px]">
                <div className="flex gap-1 p-1">
                  {COMMON_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => onReact(message._id, emoji)}
                      className="hover:scale-125 transition-transform duration-100 p-1 text-sm rounded hover:bg-muted"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {onReport && (
                  <DropdownMenuItem onClick={() => onReport(message._id)} className="text-destructive text-xs">
                    <ShieldAlert className="h-3.5 w-3.5 mr-2" /> Report Abuse
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Message Reactions display */}
      {hasReactions && !message.isDeleted && (
        <div className={`flex flex-wrap gap-1 mt-1 max-w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
          {Object.entries(groupedReactions).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => onReact(message._id, emoji)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border bg-muted/60 text-[10px] hover:bg-accent hover:border-primary transition-all font-semibold"
            >
              <span>{emoji}</span>
              <span className="text-muted-foreground">{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
