import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Draggable from 'react-draggable';
import { useNavigate } from 'react-router-dom';
import { generateCaseNoteDocument, type CaseNoteExportData } from '@/lib/export/export-engine';

import { getApiUrl, apiRequest } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import {
    X, Filter, Plus, MessageSquare, Edit2, Trash2,
    Pin, Lock, FileText, Paperclip, ChevronRight, ChevronDown,
    Maximize2, Minus, Download, FileSpreadsheet,
    Hash, Clock, User, Bookmark, Shield, CornerDownRight, Bold, Italic,
    List, Heading1, Link2, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLegalData, type Hearing } from '@/contexts/LegalDataContext';


// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------
export interface Note {
    _id: string;
    caseId: string;
    hearingId?: string;
    authorId: { _id: string; name: string; email: string };
    title?: string;
    content: string;
    noteType: 'general' | 'hearing' | 'evidence' | 'strategy' | 'internal';
    evidenceTags: string[];
    isPinned: boolean;
    isPrivate: boolean;
    parentNoteId?: string;
    attachments: { fileUrl: string; fileName: string; fileSize: number; mimeType: string }[];
    createdAt: string;
    editedAt?: string;
    isDeleted: boolean;
    replies?: Note[];
}

// -----------------------------------------------------------------
// Type colour config (rich, dark-mode-friendly)
// -----------------------------------------------------------------
const TYPE_CONFIG: Record<string, { label: string; className: string; dotColor: string }> = {
    general: { label: 'General', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30', dotColor: 'bg-slate-400' },
    hearing: { label: 'Hearing', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dotColor: 'bg-blue-400' },
    evidence: { label: 'Evidence', className: 'bg-violet-500/15 text-violet-400 border-violet-500/30', dotColor: 'bg-violet-400' },
    strategy: { label: 'Strategy', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dotColor: 'bg-amber-400' },
    internal: { label: 'Internal', className: 'bg-rose-500/15 text-rose-400 border-rose-500/30', dotColor: 'bg-rose-400' },
};

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------
const findNoteByIdRecursive = (items: Note[], id: string): Note | undefined => {
    for (const item of items) {
        if (item._id === id) return item;
        if (item.replies && item.replies.length > 0) {
            const found = findNoteByIdRecursive(item.replies, id);
            if (found) return found;
        }
    }
    return undefined;
};

const updateNoteInList = (notes: Note[], updatedNote: Note): Note[] => {
    return notes.map(note => {
        if (note._id === updatedNote._id) {
            return { ...note, ...updatedNote };
        }
        if (note.replies && note.replies.length > 0) {
            return { ...note, replies: updateNoteInList(note.replies, updatedNote) };
        }
        return note;
    });
};

const authorName = (authorId: Note['authorId']): string =>
    typeof authorId === 'object' && authorId !== null ? authorId.name : 'Unknown User';

const noteRefId = (id: string) => `NR-${id.slice(-8).toUpperCase()}`;

// -----------------------------------------------------------------
// Structured content renderer
// Converts plain text into legal-document-style structured HTML
// -----------------------------------------------------------------
const LegalContentRenderer = ({ content }: { content: string }) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
            elements.push(<div key={idx} className="h-3" />);
            return;
        }

        // Section heading: ends with colon (e.g. "Action Items:")
        if (/^[A-Z][^a-z]{0,3}.*:$/.test(trimmed) || /^#+\s/.test(trimmed)) {
            const text = trimmed.replace(/^#+\s/, '').replace(/:$/, '');
            elements.push(
                <h4 key={idx} className="legal-section-heading">
                    {text}
                </h4>
            );
            return;
        }

        // Bullet list item
        if (/^[-•*]\s+/.test(trimmed)) {
            const text = trimmed.replace(/^[-•*]\s+/, '');
            elements.push(
                <div key={idx} className="legal-bullet-item">
                    <span className="legal-bullet-dot">•</span>
                    <span>{text}</span>
                </div>
            );
            return;
        }

        // Numbered list item
        if (/^\d+\.\s+/.test(trimmed)) {
            elements.push(
                <div key={idx} className="legal-bullet-item">
                    <span className="legal-bullet-number">{trimmed.match(/^\d+/)![0]}.</span>
                    <span>{trimmed.replace(/^\d+\.\s+/, '')}</span>
                </div>
            );
            return;
        }

        // Risk flag (lines containing ⚠️ or "[RISK]" or "Risk:")
        if (/(\[RISK\]|⚠️|Risk:|WARNING:)/i.test(trimmed)) {
            elements.push(
                <div key={idx} className="legal-risk-flag">
                    <span className="text-amber-400 font-bold text-xs mr-1">⚠️</span>
                    <span>{trimmed.replace(/(\[RISK\]|⚠️)/g, '').trim()}</span>
                </div>
            );
            return;
        }

        // Regular paragraph
        elements.push(
            <p key={idx} className="legal-body-text">{trimmed}</p>
        );
    });

    return <div className="legal-content-body">{elements}</div>;
};

// -----------------------------------------------------------------
// Left-panel NoteCard (compact list item)
// -----------------------------------------------------------------
const NoteListItem = ({
    note,
    isActive,
    onClick,
    onReply
}: {
    note: Note;
    isActive: boolean;
    onClick: () => void;
    onReply: (n: Note) => void;
}) => {
    const typeConf = TYPE_CONFIG[note.noteType] || TYPE_CONFIG.general;
    const name = authorName(note.authorId);

    return (
        <div
            onClick={onClick}
            className={`group px-3 py-2.5 cursor-pointer transition-all border-b border-border/30 hover:bg-muted/30 ${isActive ? 'bg-primary/8 border-l-2 border-l-primary pl-[10px]' : 'border-l-2 border-l-transparent'
                }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        {note.isPinned && <Pin size={9} className="text-amber-400 fill-amber-400 shrink-0" />}
                        {note.isPrivate && <Lock size={9} className="text-rose-400 shrink-0" />}
                        <p className={`text-xs font-semibold truncate leading-tight ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {note.title || note.content.substring(0, 40) + (note.content.length > 40 ? '…' : '')}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[90px]">{name}</span>
                        <span className="opacity-40">•</span>
                        <span>{format(new Date(note.createdAt), 'MMM d')}</span>
                        {note.replies && note.replies.length > 0 && (
                            <>
                                <span className="opacity-40">•</span>
                                <span className="flex items-center gap-0.5">
                                    <MessageSquare size={8} />{note.replies.length}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={`text-[9px] px-1.5 py-0 h-4 border font-medium ${typeConf.className}`}>
                        {typeConf.label}
                    </Badge>
                    <button
                        onClick={e => { e.stopPropagation(); onReply(note); }}
                        className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        title="Quick reply"
                    >
                        <MessageSquare size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// -----------------------------------------------------------------
// Reply Card (threaded, structured)
// -----------------------------------------------------------------
const ReplyCard = ({
    note,
    depth = 0,
    currentUserId,
    onReply,
    onEdit,
    onDelete,
    onOpen,
}: {
    note: Note;
    depth?: number;
    currentUserId?: string;
    onReply: (n: Note) => void;
    onEdit: (n: Note) => void;
    onDelete: (n: Note) => void;
    onOpen: (n: Note) => void;
}) => {
    const [expanded, setExpanded] = useState(true);
    const isAuthor = currentUserId === (typeof note.authorId === 'object' && note.authorId !== null ? note.authorId._id : note.authorId);
    const hasReplies = note.replies && note.replies.length > 0;
    const name = authorName(note.authorId);
    const indentPx = Math.min(depth, 3) * 24;

    return (
        <div style={{ marginLeft: `${indentPx}px` }} className="mt-2">
            <div className="bg-muted/20 border border-border/40 rounded-md px-3 py-2.5 hover:border-border/70 transition-colors">
                {/* Reply Header */}
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-[11px]">
                        {hasReplies && (
                            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
                                {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            </button>
                        )}
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <User size={10} className="text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">{name}</span>
                        <span className="text-muted-foreground text-[10px]" title={format(new Date(note.createdAt), 'PPpp')}>
                            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </span>
                        {note.editedAt && <span className="text-[9px] italic text-muted-foreground">(edited)</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <button onClick={() => onReply(note)} className="hover:text-foreground transition-colors flex items-center gap-1">
                            <CornerDownRight size={10} /> Reply
                        </button>
                        {isAuthor && (
                            <>
                                <button onClick={() => onEdit(note)} className="hover:text-foreground transition-colors flex items-center gap-1">
                                    <Edit2 size={10} /> Edit
                                </button>
                                <button onClick={() => onDelete(note)} className="hover:text-destructive transition-colors flex items-center gap-1">
                                    <Trash2 size={10} /> Delete
                                </button>
                            </>
                        )}
                    </div>
                </div>
                {/* Reply Body */}
                <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap pl-7">{note.content}</p>
            </div>

            {/* Nested replies */}
            {expanded && hasReplies && (
                <div className="mt-1">
                    {note.replies!.map(reply => (
                        <ReplyCard
                            key={reply._id}
                            note={reply}
                            depth={depth + 1}
                            currentUserId={currentUserId}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onOpen={onOpen}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// -----------------------------------------------------------------
// Legacy NoteCard (still used in the floating panel mode)
// -----------------------------------------------------------------
const NoteCard = ({
    note,
    depth = 0,
    currentUserId,
    onReply,
    onEdit,
    onDelete,
    onPin,
    onOpen,
    forceShowActions = false
}: {
    note: Note;
    depth?: number;
    currentUserId?: string;
    onReply: (n: Note) => void;
    onEdit: (n: Note) => void;
    onDelete: (n: Note) => void;
    onPin: (n: Note, pinned: boolean) => void;
    onOpen: (n: Note) => void;
    forceShowActions?: boolean;
}) => {
    const [expanded, setExpanded] = useState(true);
    const isAuthor = currentUserId === (typeof note.authorId === 'object' && note.authorId !== null ? note.authorId._id : note.authorId);
    const hasReplies = note.replies && note.replies.length > 0;
    const name = authorName(note.authorId);
    const typeConf = TYPE_CONFIG[note.noteType] || TYPE_CONFIG.general;

    return (
        <div
            className={`text-[10px] cursor-pointer transition-all ${depth > 0 ? 'ml-3 mt-0.5 border-l-2 pl-2 border-border/50 bg-muted/5' : 'border rounded px-1.5 py-0.5 bg-card mt-0.5 hover:shadow-sm hover:border-primary/30'}`}
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('button') && !target.closest('a') && !target.closest('.badge')) {
                    onOpen(note);
                }
            }}
        >
            <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {hasReplies && (
                        <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="text-muted-foreground hover:text-foreground">
                            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                    )}
                    <span className="font-semibold text-[10px]">{name}</span>
                    <span className="text-muted-foreground text-[9px]" title={format(new Date(note.createdAt), 'PPpp')}>
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                    {note.editedAt && <span className="text-[9px] italic text-muted-foreground">(edited)</span>}
                    {note.isPrivate && <Lock size={10} className="text-rose-500" aria-label="Private Note" />}
                </div>
                <div className="flex items-center gap-1">
                    {note.isPinned && <Pin size={11} className="text-amber-500 fill-amber-500" />}
                    <Badge variant="secondary" className={`${typeConf.className} border text-[9px] px-1.5 py-0`}>
                        {typeConf.label}
                    </Badge>
                </div>
            </div>

            {note.title && <p className="font-semibold text-[11px] mt-1">{note.title}</p>}

            <p className="text-[9px] text-muted-foreground mt-0.5 leading-[1.1] line-clamp-1">
                {note.content}
            </p>

            {(depth === 0 || forceShowActions) && (
                <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
                    <button onClick={(e) => { e.stopPropagation(); onReply(note); }} className="flex items-center gap-0.5 hover:text-foreground transition-colors">
                        <MessageSquare size={10} /> Reply
                    </button>
                    {isAuthor && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(note); }} className="flex items-center gap-0.5 hover:text-foreground transition-colors">
                                <Edit2 size={10} /> Edit
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(note); }} className="flex items-center gap-0.5 hover:text-destructive transition-colors">
                                <Trash2 size={10} /> Delete
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onPin(note, !note.isPinned); }} className="flex items-center gap-0.5 hover:text-amber-500 transition-colors">
                                <Pin size={10} /> {note.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                        </>
                    )}
                </div>
            )}

            {expanded && hasReplies && (
                <div className="mt-1">
                    {note.replies!.map(reply => (
                        <NoteCard
                            key={reply._id}
                            note={reply}
                            depth={depth + 1}
                            currentUserId={currentUserId}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onPin={onPin}
                            onOpen={onOpen}
                            forceShowActions={forceShowActions}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// -----------------------------------------------------------------
// NoteDetailModal (used in floating panel mode)
// -----------------------------------------------------------------
const NoteDetailModal = ({
    note,
    isOpen,
    onClose,
    onEdit,
    onDelete,
    onReply,
    onPin,
    onOpen,
    currentUserId
}: {
    note: Note | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (n: Note) => void;
    onDelete: (n: Note) => void;
    onReply: (n: Note) => void;
    onPin: (n: Note, pinned: boolean) => void;
    onOpen: (n: Note) => void;
    currentUserId?: string;
}) => {
    if (!note) return null;
    const isAuthor = currentUserId === (typeof note.authorId === 'object' && note.authorId !== null ? note.authorId._id : note.authorId);
    const name = authorName(note.authorId);
    const typeConf = TYPE_CONFIG[note.noteType] || TYPE_CONFIG.general;

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            {note.title && <DialogTitle className="text-base font-semibold">{note.title}</DialogTitle>}
                            <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-medium text-foreground">{name}</span>
                                <span>{format(new Date(note.createdAt), 'MMM d, yyyy · h:mm a')}</span>
                                {note.editedAt && <span className="italic">(edited)</span>}
                                {note.isPrivate && <span className="flex items-center gap-1 text-rose-500"><Lock size={10} /> Private</span>}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {note.isPinned && <Pin size={14} className="text-amber-500 fill-amber-500" />}
                            <Badge className={`border text-xs ${typeConf.className}`}>{typeConf.label}</Badge>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
                    <div className="space-y-4">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{note.content}</p>

                        {(note.evidenceTags?.length > 0 || (note.attachments && note.attachments.length > 0)) && (
                            <div className="border-t pt-3 space-y-3">
                                {note.evidenceTags?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2">Evidence Tags</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {note.evidenceTags.map(tag => (
                                                <Badge key={tag} variant="outline" className="text-xs gap-1">
                                                    <Hash size={9} /> {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {note.attachments && note.attachments.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2">Attachments</p>
                                        <div className="space-y-1">
                                            {note.attachments.map((att, i) => (
                                                <a key={i} href={att.fileUrl} target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-2 text-sm text-blue-400 hover:underline">
                                                    <Paperclip size={12} />{att.fileName}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {note.replies && note.replies.length > 0 && (
                            <div className="border-t pt-3">
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-3">
                                    {note.replies.length} {note.replies.length === 1 ? 'Reply' : 'Replies'}
                                </p>
                                <div className="space-y-2">
                                    {note.replies.map(reply => (
                                        <NoteCard
                                            key={reply._id}
                                            note={reply}
                                            depth={1}
                                            currentUserId={currentUserId}
                                            onReply={onReply}
                                            onEdit={onEdit}
                                            onDelete={() => { }}
                                            onPin={() => { }}
                                            onOpen={onOpen}
                                            forceShowActions={true}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t p-6 flex justify-between items-center bg-muted/10">
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { onReply(note); onClose(); }}>
                            <MessageSquare size={13} className="mr-1" /> Reply
                        </Button>
                        {isAuthor && (
                            <Button size="sm" variant="outline" onClick={() => { onEdit(note); onClose(); }}>
                                <Edit2 size={13} className="mr-1" /> Edit
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {isAuthor && (
                            <>
                                <Button size="sm" variant="outline" onClick={() => { onPin(note, !note.isPinned); onClose(); }}>
                                    <Pin size={13} className="mr-1" /> {note.isPinned ? 'Unpin' : 'Pin'}
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => { onDelete(note); onClose(); }}>
                                    <Trash2 size={13} className="mr-1" /> Delete
                                </Button>
                            </>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// -----------------------------------------------------------------
// Add / Edit Note Modal (legal drafting editor)
// -----------------------------------------------------------------
const AddNoteModal = ({
    isOpen,
    onClose,
    onSubmit,
    _caseId,
    hearings,
    initialData,
    parentNote
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: unknown) => Promise<void>;
    _caseId: string;
    hearings: Hearing[];
    initialData?: Note | null;
    parentNote?: Note | null;
}) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [noteType, setNoteType] = useState('general');
    const [hearingId, setHearingId] = useState<string>('none');
    const [tagsInput, setTagsInput] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [isPinned, setIsPinned] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || '');
                setContent(initialData.content);
                setNoteType(initialData.noteType);
                setHearingId(initialData.hearingId || 'none');
                setTagsInput(initialData.evidenceTags?.join(', ') || '');
                setIsPrivate(initialData.isPrivate);
                setIsPinned(initialData.isPinned);
            } else {
                setTitle('');
                setContent('');
                setNoteType(parentNote ? 'internal' : 'general');
                setHearingId('none');
                setTagsInput('');
                setIsPrivate(true);
                setIsPinned(false);
            }
        }
    }, [isOpen, initialData, parentNote]);

    const insertFormat = (prefix: string, suffix = '') => {
        const ta = document.getElementById('note-content-editor') as HTMLTextAreaElement;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = content.substring(start, end);
        const replacement = prefix + selected + suffix;
        setContent(content.substring(0, start) + replacement + content.substring(end));
        setTimeout(() => {
            ta.focus();
            ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        }, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setIsSubmitting(true);
        /* console.log('[AddNoteModal] Submitting note data:', {
            title: title.trim(),
            noteType,
            hearingId
        }); */
        try {
            await onSubmit({
                title: title.trim(),
                content: content.trim(),
                noteType,
                hearingId: hearingId === 'none' ? undefined : hearingId,
                evidenceTags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
                isPrivate,
                isPinned,
                parentNoteId: parentNote?._id
            });
            onClose();
        } catch (_error) {
            console.error('[AddNoteModal] Save error:', _error);
            toast({ title: 'Error', description: 'Failed to save note', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl h-[min(900px,95vh)] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle className="text-base font-bold">
                        {initialData ? 'Edit Note' : parentNote ? 'Reply to Note' : 'New Case Note'}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {initialData ? 'Update the details of your note.' : 'Draft a new legal note or reply.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden bg-background min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
                        <div className="space-y-5 pb-8">
                            {parentNote && (
                                <div className="bg-muted/40 border border-border/40 rounded-lg p-3 text-sm italic text-muted-foreground shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 not-italic text-primary/70">Replying to:</p>
                                    <div className="border-l-2 border-primary/30 pl-3">
                                        "{parentNote.content.substring(0, 240)}{parentNote.content.length > 240 ? '…' : ''}"
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title <span className="font-normal normal-case">(optional)</span></Label>
                                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief descriptive title" maxLength={150} className="text-sm bg-background/50" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Note Type</Label>
                                    <Select value={noteType} onValueChange={setNoteType}>
                                        <SelectTrigger className="text-sm bg-background/50"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="general">General</SelectItem>
                                            <SelectItem value="hearing">Hearing</SelectItem>
                                            <SelectItem value="evidence">Evidence</SelectItem>
                                            <SelectItem value="strategy">Strategy</SelectItem>
                                            <SelectItem value="internal">Internal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Content *</Label>
                                {/* Formatting toolbar */}
                                <div className="flex items-center gap-1 p-1.5 border border-b-0 border-border/60 rounded-t-md bg-muted/30">
                                    <button type="button" title="Bold" onClick={() => insertFormat('**', '**')} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                        <Bold size={13} />
                                    </button>
                                    <button type="button" title="Italic" onClick={() => insertFormat('_', '_')} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                        <Italic size={13} />
                                    </button>
                                    <div className="w-px h-4 bg-border/50 mx-0.5" />
                                    <button type="button" title="Section heading" onClick={() => insertFormat('', ':')} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                        <Heading1 size={13} />
                                    </button>
                                    <button type="button" title="Bullet point" onClick={() => insertFormat('• ')} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                        <List size={13} />
                                    </button>
                                    <div className="w-px h-4 bg-border/50 mx-0.5" />
                                    <span className="text-[10px] text-muted-foreground ml-1">Use "Heading:" for section titles • "- item" for bullets</span>
                                </div>
                                <Textarea
                                    id="note-content-editor"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder={"Observation:\nWrite your legal observation here...\n\nAction Items:\n- Item one\n- Item two\n\nRisk: Note any risks here"}
                                    rows={8}
                                    required
                                    className="rounded-t-none text-sm leading-relaxed font-mono resize-y min-h-[120px] max-h-[40vh]"
                                />
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-[10px] text-muted-foreground">{content.length.toLocaleString()} / 10,000 characters</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Linked Hearing</Label>
                                    <Select value={hearingId} onValueChange={setHearingId}>
                                        <SelectTrigger className="text-sm bg-background/50"><SelectValue placeholder="None" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {hearings?.map(h => (
                                                <SelectItem key={h.id} value={h.id}>
                                                    {format(new Date(h.hearingDate), 'MMM d, yyyy')} — {h.hearingType}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evidence Tags</Label>
                                    <Input
                                        value={tagsInput}
                                        onChange={e => setTagsInput(e.target.value)}
                                        placeholder="FIR discrepancy, CCTV missing…"
                                        className="text-sm bg-background/50"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">Comma-separated tag names</p>
                                </div>
                            </div>

                            <div className="flex gap-6 py-2 border-y border-border/40 my-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="isPrivate" checked={isPrivate} onCheckedChange={(v) => setIsPrivate(!!v)} />
                                    <Label htmlFor="isPrivate" className="text-sm font-medium cursor-pointer text-foreground/80">Private / Internal</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="isPinned" checked={isPinned} onCheckedChange={(v) => setIsPinned(!!v)} />
                                    <Label htmlFor="isPinned" className="text-sm font-medium cursor-pointer text-foreground/80">Pin to Top</Label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 border-t mt-auto bg-muted/10 gap-3 shrink-0">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="h-9 px-4">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || !content.trim()} className="h-9 px-6 bg-primary hover:bg-primary/95 shadow-md">
                            {isSubmitting ? 'Saving…' : initialData ? 'Save Changes' : parentNote ? 'Post Reply' : 'Create Note'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

// -----------------------------------------------------------------
// Main Panel Props
// -----------------------------------------------------------------
export interface CaseNotesPanelProps {
    isOpen: boolean;
    onClose?: () => void;
    caseId: string;
    hearings: Hearing[];
    defaultHearingId?: string;
    inline?: boolean;
}

// -----------------------------------------------------------------
// CaseNotesPanel — Main Export
// -----------------------------------------------------------------
export const CaseNotesPanel = ({
    isOpen,
    onClose,
    caseId,
    hearings = [],
    defaultHearingId,
    inline = false
}: CaseNotesPanelProps) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [filterHearing, setFilterHearing] = useState(defaultHearingId || 'all');
    const [sortOrder, setSortOrder] = useState('newest');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [replyingTo, setReplyingTo] = useState<Note | null>(null);
    const [detailNote, setDetailNote] = useState<Note | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [isFullscreen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const positionRef = React.useRef(position);
    const [directReplyText, setDirectReplyText] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);

    const { user } = useAuth();
    const { cases } = useLegalData();
    const activeCase = cases.find(c => c.id === caseId);
    const { toast } = useToast();
    const navigate = useNavigate();
    const nodeRef = React.useRef<HTMLDivElement>(null);

    // -- Data Fetching ----------------------------------------------
    const fetchNotes = useCallback(async () => {
        try {
            setLoading(true);
            const baseUrl = getApiUrl(`/api/v1/cases/${caseId}/notes`);
            const params = new URLSearchParams();
            if (filterType !== 'all') params.append('noteType', filterType);
            if (filterHearing !== 'all') params.append('hearingId', filterHearing);

            // Add cache-buster to prevent stale data
            params.append('_t', Date.now().toString());

            const query = params.toString();
            const url = query ? `${baseUrl}?${query}` : baseUrl;
            const data = await apiRequest(url, { credentials: 'include' });
            setNotes(data);
        } catch (error) {
            console.error('Failed to fetch case notes', error);
            toast({ title: 'Error Loading Notes', description: 'Failed to load case notes.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [caseId, filterType, filterHearing, toast]);

    useEffect(() => {
        if (isOpen && caseId) {
            fetchNotes();
            if (defaultHearingId) setFilterHearing(defaultHearingId);
        }
    }, [isOpen, caseId, filterType, filterHearing, defaultHearingId, fetchNotes]);

    // Sync detail note when notes array changes (after pin/reply/edit)
    useEffect(() => {
        if (detailNote) {
            const updated = findNoteByIdRecursive(notes, detailNote._id);
            if (updated) setDetailNote(updated);
        }
    }, [notes, detailNote, detailNote?._id]);

    // -- CRUD Handlers ----------------------------------------------
    const handleSaveNote = async (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        let method = 'POST';
        let url = getApiUrl(`/api/v1/cases/${caseId}/notes`);
        if (editingNote) { method = 'PUT'; url += `/${editingNote._id}`; }

        // console.log(`[CaseNotesPanel] Saving note. Method: ${method}, Type: ${data.noteType}`);
        try {
            const response = await apiRequest(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            toast({ title: 'Success', description: `Note ${editingNote ? 'updated' : 'created'} successfully` });
            setEditingNote(null);
            setReplyingTo(null);

            // Optimistically update the list and detail view immediately
            if (editingNote) {
                setNotes(prev => updateNoteInList(prev, response));
            }

            if (editingNote && detailNote && editingNote._id === detailNote._id) {
                setDetailNote(response);
            }

            fetchNotes();
        } catch {
            toast({ title: 'Error Saving Note', description: 'Failed to save case note.', variant: 'destructive' });
        }
    };

    const handleDirectReply = async () => {
        if (!directReplyText.trim() || !detailNote || isSendingReply) return;
        setIsSendingReply(true);
        try {
            await apiRequest(getApiUrl(`/api/v1/cases/${caseId}/notes`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: directReplyText.trim(), noteType: 'internal', parentNoteId: detailNote._id })
            });
            setDirectReplyText('');
            const updated = findNoteByIdRecursive(notes, detailNote._id);
            if (updated) setDetailNote(updated);
        } catch {
            toast({ title: 'Error', description: 'Failed to send reply', variant: 'destructive' });
        } finally {
            setIsSendingReply(false);
        }
    };

    const handleDelete = async (note: Note) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        try {
            await apiRequest(getApiUrl(`/api/v1/cases/${caseId}/notes/${note._id}`), {
                method: 'DELETE', credentials: 'include'
            });
            toast({ title: 'Deleted', description: 'Note removed' });
            if (detailNote?._id === note._id) setDetailNote(null);
            fetchNotes();
        } catch {
            toast({ title: 'Error', description: 'Failed to delete note', variant: 'destructive' });
        }
    };

    const handlePin = async (note: Note, pinned: boolean) => {
        try {
            await apiRequest(getApiUrl(`/api/v1/cases/${caseId}/notes/${note._id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ isPinned: pinned })
            });
            fetchNotes();
        } catch {
            toast({ title: 'Error', description: 'Failed to toggle pin', variant: 'destructive' });
        }
    };

    // -- Export -----------------------------------------------------
    const prepareExportData = (): CaseNoteExportData | null => {
        if (!detailNote) return null;
        const linkedHearing = hearings?.find(h => h.id === detailNote.hearingId);
        const parentNote = notes.find(n => n._id === detailNote.parentNoteId);
        return {
            caseNumber: activeCase?.caseNumber || 'NOT SPECIFIED',
            caseParties: {
                petitioner: activeCase?.clientName || 'Petitioner/Plaintiff',
                respondent: activeCase?.opposingParty || 'Opposite Party / Defendant',
            },
            note: {
                title: detailNote.title || (detailNote.parentNoteId ? 'Reply' : 'Untitled Note'),
                content: detailNote.content,
                authorName: typeof detailNote.authorId === 'object' ? detailNote.authorId.name : 'Unknown User',
                createdDateTime: format(new Date(detailNote.createdAt), 'PPP p'),
                noteType: detailNote.noteType,
                isPrivate: detailNote.isPrivate,
                isPinned: detailNote.isPinned,
                evidenceTags: detailNote.evidenceTags || [],
            },
            hearing: linkedHearing ? {
                date: format(new Date(linkedHearing.hearingDate), 'MMM d, yyyy'),
                stage: linkedHearing.hearingType || 'N/A',
                court: activeCase?.courtName || 'N/A',
            } : undefined,
            parentNoteTitle: parentNote?.title || (parentNote ? 'Original Note' : undefined),
            replies: detailNote.replies?.map(r => ({
                authorName: typeof r.authorId === 'object' ? r.authorId.name : 'User',
                content: r.content,
                createdDateTime: format(new Date(r.createdAt), 'MMM d, p'),
            })),
        };
    };

    const handleExportPDF = async () => {
        const data = prepareExportData();
        if (!data) return;
        try {
            await generateCaseNoteDocument(data, 'pdf');
            toast({ title: 'Success', description: 'PDF generated successfully' });
        } catch {
            toast({ title: 'Export Error', description: 'Failed to generate PDF', variant: 'destructive' });
        }
    };

    const handleExportWord = async () => {
        const data = prepareExportData();
        if (!data) return;
        try {
            await generateCaseNoteDocument(data, 'docx');
            toast({ title: 'Success', description: 'Word document generated successfully' });
        } catch {
            toast({ title: 'Export Error', description: 'Failed to generate Word document', variant: 'destructive' });
        }
    };

    // -- Helpers ----------------------------------------------------
    const openAddNote = () => { setEditingNote(null); setReplyingTo(null); setModalOpen(true); };
    const openDetail = (note: Note) => {
        setDetailNote(note);
        if (!isFullscreen && !inline) setDetailOpen(true);
    };

    const onDrag = (_e: unknown, data: { x: number; y: number }) => {
        positionRef.current = { x: data.x, y: data.y };
        setPosition({ x: data.x, y: data.y });
    };
    const onStop = useCallback((_e: unknown, data: { x: number; y: number }) => {
        let { x, y } = data;
        const width = isMinimized ? 280 : 380;
        const height = isMinimized ? 40 : 520;
        if (x < 0) x = 0; if (y < 0) y = 0;
        if (x + width > window.innerWidth) x = window.innerWidth - width;
        if (y + height > window.innerHeight) y = window.innerHeight - height;
        positionRef.current = { x, y };
        setPosition({ x, y });
    }, [isMinimized]);

    // Re-clamp position when layout mode changes (fullscreen / minimized / inline).
    // We read the current position from a ref to avoid including `position` in deps
    // (that would create an infinite loop: setPosition → position changes → effect
    // fires → onStop → setPosition → repeat).
    useEffect(() => {
        if (isFullscreen || inline) {
            setPosition({ x: 0, y: 0 });
            positionRef.current = { x: 0, y: 0 };
        } else {
            // Clamp the stored position to the current viewport without triggering a drag event
            const cur = positionRef.current;
            const width = isMinimized ? 280 : 380;
            const height = isMinimized ? 40 : 520;
            let { x, y } = cur;
            if (x < 0) x = 0; if (y < 0) y = 0;
            if (x + width > window.innerWidth) x = window.innerWidth - width;
            if (y + height > window.innerHeight) y = window.innerHeight - height;
            positionRef.current = { x, y };
            setPosition({ x, y });
        }
    }, [isFullscreen, isMinimized, inline]);

    const sortedNotes = useMemo(() => {
        const sorted = [...notes];
        if (sortOrder === 'oldest') sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        sorted.sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));
        return sorted;
    }, [notes, sortOrder]);

    const panelSizeClass = isFullscreen
        ? 'fixed top-[64px] bottom-4 left-4 right-4 z-[50] bg-background shadow-2xl rounded-xl border border-border flex flex-col overflow-hidden'
        : isMinimized
            ? 'fixed bottom-6 right-6 z-[50] w-[280px] bg-background shadow-2xl rounded-xl border border-border flex flex-col overflow-hidden'
            : 'fixed bottom-6 right-6 z-[50] w-[380px] h-[520px] max-h-[85vh] bg-background shadow-2xl rounded-xl border border-border flex flex-col overflow-hidden';

    if (!inline && !isOpen) {
        return (
            <AddNoteModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleSaveNote}
                _caseId={caseId}
                hearings={hearings}
                initialData={editingNote}
                parentNote={replyingTo}
            />
        );
    }

    // -- Linked hearing name ----------------------------------------
    const linkedHearingName = detailNote?.hearingId
        ? hearings?.find(h => h.id === detailNote.hearingId)
        : null;

    // -- Panel content ----------------------------------------------
    const panelContent = (
        <div
            ref={nodeRef}
            id="case-notes-panel"
            className={inline ? 'flex-1 w-full flex flex-col h-full min-h-[400px] relative max-w-none' : panelSizeClass}
        >
            {/* -- Floating panel header --------------------------- */}
            {!inline && onClose && (
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40 cursor-grab active:cursor-grabbing handle transition-colors hover:bg-muted/60">
                    <h2 className="text-xs font-semibold flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" /> Case Notes
                        {notes.length > 0 && <span className="text-muted-foreground font-normal">({notes.length})</span>}
                    </h2>
                    <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" onClick={() => setIsMinimized(!isMinimized)} className="rounded-full h-5 w-5"><Minus className="w-3 h-3" /></Button>
                        {!inline && (
                            <Button variant="ghost" size="icon" onClick={() => { navigate('/dashboard/notes'); if (onClose) onClose(); }} className="rounded-full h-5 w-5"><Maximize2 className="w-3 h-3" /></Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-5 w-5"><X className="w-3.5 h-3.5" /></Button>
                    </div>
                </div>
            )}

            {/* -- Floating panel compact controls ---------------- */}
            {!isMinimized && !isFullscreen && !inline && (
                <>
                    <div className="px-3 py-2 border-b bg-muted/20 space-y-1.5">
                        <Button onClick={openAddNote} className="w-full h-7 text-xs" size="sm">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Note
                        </Button>
                        <div className="flex gap-1.5 items-center">
                            <Filter size={11} className="text-muted-foreground shrink-0" />
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="h-7 text-[11px] flex-1"><SelectValue placeholder="All Types" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="hearing">Hearing</SelectItem>
                                    <SelectItem value="evidence">Evidence</SelectItem>
                                    <SelectItem value="strategy">Strategy</SelectItem>
                                    <SelectItem value="internal">Internal</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={sortOrder} onValueChange={setSortOrder}>
                                <SelectTrigger className="h-7 text-[11px] w-[90px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest</SelectItem>
                                    <SelectItem value="oldest">Oldest</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <ScrollArea className="flex-1 px-3 py-2 bg-background">
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">Loading notes…</div>
                        ) : sortedNotes.length === 0 ? (
                            <div className="text-center py-8 px-4">
                                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-muted-foreground text-xs font-medium">No notes found</p>
                            </div>
                        ) : (
                            <div className="space-y-0.5 pb-2">
                                {sortedNotes.map(note => (
                                    <NoteCard
                                        key={note._id}
                                        note={note}
                                        currentUserId={user?.id}
                                        onReply={(n) => { setEditingNote(null); setReplyingTo(n); setModalOpen(true); }}
                                        onEdit={(n) => { setReplyingTo(null); setEditingNote(n); setModalOpen(true); }}
                                        onDelete={handleDelete}
                                        onPin={handlePin}
                                        onOpen={openDetail}
                                    />
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </>
            )}

            {/* -- INLINE / FULLSCREEN: Two-panel layout ------------ */}
            {!isMinimized && (isFullscreen || inline) && (
                <div className="flex flex-1 w-full overflow-hidden border-t">

                    {/* Left Panel — 320px Notes List */}
                    <div className="w-[320px] border-r bg-muted/5 flex flex-col h-full shrink-0">
                        {/* Left panel header */}
                        <div className="px-3 py-2.5 border-b bg-muted/10">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notes</h2>
                                <Button onClick={openAddNote} size="sm" variant="outline" className="h-7 text-[11px] px-2.5">
                                    <Plus className="w-3.5 h-3.5 mr-1" /> New
                                </Button>
                            </div>
                            <div className="flex gap-1.5">
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger className="h-7 text-[11px] flex-1"><SelectValue placeholder="All Types" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="general">General</SelectItem>
                                        <SelectItem value="hearing">Hearing</SelectItem>
                                        <SelectItem value="evidence">Evidence</SelectItem>
                                        <SelectItem value="strategy">Strategy</SelectItem>
                                        <SelectItem value="internal">Internal</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={sortOrder} onValueChange={setSortOrder}>
                                    <SelectTrigger className="h-7 text-[11px] w-[80px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">Newest</SelectItem>
                                        <SelectItem value="oldest">Oldest</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Note list */}
                        <ScrollArea className="flex-1">
                            {loading ? (
                                <div className="text-center py-10 text-xs text-muted-foreground">Loading…</div>
                            ) : sortedNotes.length === 0 ? (
                                <div className="text-center py-10 px-4">
                                    <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                                    <p className="text-xs text-muted-foreground">No notes yet. Create your first note.</p>
                                </div>
                            ) : (
                                <div>
                                    {sortedNotes.map(note => (
                                        <NoteListItem
                                            key={note._id}
                                            note={note}
                                            isActive={detailNote?._id === note._id}
                                            onClick={() => setDetailNote(note)}
                                            onReply={(n) => { setEditingNote(null); setReplyingTo(n); setModalOpen(true); }}
                                        />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Right Panel — Note Detail / Draft View */}
                    <div className="flex-1 bg-background flex flex-col overflow-hidden relative">
                        {detailNote ? (
                            <>
                                <ScrollArea className="flex-1 w-full">
                                    {/* Outer scroll wrapper — centers the 900px content area */}
                                    <div className="px-6 py-6 w-full">
                                        <div className="max-w-[900px] mx-auto">

                                            {/* -- In-reply-to context ----------------- */}
                                            {detailNote.parentNoteId && (
                                                <div
                                                    className="mb-4 bg-muted/20 border border-dashed border-border/50 rounded-md p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                                                    onClick={() => {
                                                        const parent = findNoteByIdRecursive(notes, detailNote.parentNoteId!);
                                                        if (parent) setDetailNote(parent);
                                                    }}
                                                >
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                                                        <CornerDownRight size={10} /> In reply to
                                                    </p>
                                                    <p className="text-xs italic line-clamp-2 opacity-70">
                                                        {findNoteByIdRecursive(notes, detailNote.parentNoteId!)?.content || 'Original Note'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* -- Legal Document Header --------------- */}
                                            <div
                                                className="rounded-lg border"
                                                style={{
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                                                    padding: '28px 36px 24px',
                                                }}
                                            >
                                                {/* Title row */}
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="flex-1">
                                                        <h1 className="text-xl font-bold text-foreground leading-tight mb-1">
                                                            {detailNote.title || (detailNote.parentNoteId ? 'Reply Note' : 'Untitled Note')}
                                                        </h1>
                                                        <p className="text-[11px] text-muted-foreground font-mono">
                                                            Ref: {noteRefId(detailNote._id)}
                                                        </p>
                                                    </div>
                                                    {/* Action buttons + Badges (top-right) */}
                                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                            {(() => {
                                                                const conf = TYPE_CONFIG[detailNote.noteType] || TYPE_CONFIG.general; return (
                                                                    <Badge className={`border font-semibold text-xs px-2.5 py-0.5 ${conf.className}`}>{conf.label}</Badge>
                                                                );
                                                            })()}
                                                            {detailNote.isPrivate && (
                                                                <Badge className="border text-xs px-2 py-0.5 bg-rose-500/10 text-rose-400 border-rose-500/30">
                                                                    <Shield size={9} className="mr-1" /> Private
                                                                </Badge>
                                                            )}
                                                            {detailNote.isPinned && (
                                                                <Badge className="border text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 border-amber-500/30">
                                                                    <Pin size={9} className="mr-1 fill-current" /> Pinned
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {/* Action icons */}
                                                        <div className="flex items-center gap-0.5">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" title="Export">
                                                                        <Download size={13} />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40 text-[11px]">
                                                                    <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                                                                        <FileText size={14} className="text-red-500" /> Export as PDF
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={handleExportWord} className="gap-2">
                                                                        <FileSpreadsheet size={14} className="text-blue-500" /> Export as Word
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingNote(null); setReplyingTo(detailNote); setModalOpen(true); }} title="Reply">
                                                                <MessageSquare size={13} />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setEditingNote(detailNote); setModalOpen(true); }} title="Edit">
                                                                <Edit2 size={13} />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(detailNote)} title="Delete">
                                                                <Trash2 size={13} />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className={`h-7 w-7 ${detailNote.isPinned ? 'text-amber-400' : 'text-muted-foreground'} hover:text-amber-400`} onClick={() => handlePin(detailNote, !detailNote.isPinned)} title={detailNote.isPinned ? 'Unpin' : 'Pin'}>
                                                                <Pin size={13} className={detailNote.isPinned ? 'fill-current' : ''} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Metadata grid (2-column) */}
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[12px] pb-4 mb-4 border-b border-border/30">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <User size={11} className="shrink-0" />
                                                        <span className="font-medium text-foreground/80">Author</span>
                                                        <span className="font-semibold text-foreground">{authorName(detailNote.authorId)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Bookmark size={11} className="shrink-0" />
                                                        <span className="font-medium text-foreground/80">Case</span>
                                                        <span className="font-semibold text-foreground">{activeCase?.caseNumber || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Clock size={11} className="shrink-0" />
                                                        <span className="font-medium text-foreground/80">Recorded</span>
                                                        <span className="text-foreground/80">{format(new Date(detailNote.createdAt), 'MMMM d, yyyy · h:mm a')}</span>
                                                    </div>
                                                    {detailNote.editedAt && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Edit2 size={11} className="shrink-0" />
                                                            <span className="font-medium text-foreground/80">Last Edited</span>
                                                            <span className="text-foreground/80">{format(new Date(detailNote.editedAt), 'MMM d, yyyy · h:mm a')}</span>
                                                        </div>
                                                    )}
                                                    {linkedHearingName && (
                                                        <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                                                            <Hash size={11} className="shrink-0" />
                                                            <span className="font-medium text-foreground/80">Linked Hearing</span>
                                                            <span className="text-foreground/80">
                                                                {format(new Date(linkedHearingName.hearingDate), 'MMM d, yyyy')} — {linkedHearingName.hearingType}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {detailNote.evidenceTags?.length > 0 && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Link2 size={11} className="shrink-0" />
                                                            <span className="font-medium text-foreground/80">Evidence Refs</span>
                                                            <span className="text-foreground/80">{detailNote.evidenceTags.length} linked</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* -- Note Body ----------------------- */}
                                                <LegalContentRenderer content={detailNote.content} />

                                                {/* -- Evidence Tags Block -------------- */}
                                                {detailNote.evidenceTags?.length > 0 && (
                                                    <div className="mt-6 pt-4 border-t border-border/30">
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
                                                            Evidence Tags
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {detailNote.evidenceTags.map(tag => (
                                                                <div key={tag} className="flex items-center gap-1.5 bg-muted/30 border border-border/40 rounded-md px-2.5 py-1 text-xs text-foreground/80">
                                                                    <Hash size={10} className="text-primary/60" />
                                                                    {tag}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* -- Attachments --------------------- */}
                                                {detailNote.attachments && detailNote.attachments.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-border/30">
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Attachments</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {detailNote.attachments.map((att, i) => (
                                                                <a key={i} href={att.fileUrl} target="_blank" rel="noreferrer"
                                                                    className="flex items-center gap-2 p-2 rounded-md border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors text-xs text-foreground/80">
                                                                    <Paperclip size={11} className="text-primary shrink-0" />
                                                                    <span className="truncate">{att.fileName}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* -- Reply Thread Section ----------------- */}
                                            <div className="mt-6 max-w-[900px]">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="flex-1 h-px bg-border/40" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 shrink-0 flex items-center gap-1.5">
                                                        <MessageSquare size={11} />
                                                        Discussion
                                                        {detailNote.replies && detailNote.replies.length > 0 && (
                                                            <span className="font-normal">({detailNote.replies.length})</span>
                                                        )}
                                                    </span>
                                                    <div className="flex-1 h-px bg-border/40" />
                                                </div>

                                                {detailNote.replies && detailNote.replies.length > 0 ? (
                                                    <div className="pb-10">
                                                        {detailNote.replies.map(reply => (
                                                            <ReplyCard
                                                                key={reply._id}
                                                                note={reply}
                                                                depth={0}
                                                                currentUserId={user?.id}
                                                                onReply={(n) => { setReplyingTo(n); setModalOpen(true); }}
                                                                onEdit={(n) => { setEditingNote(n); setModalOpen(true); }}
                                                                onDelete={handleDelete}
                                                                onOpen={(n) => setDetailNote(n)}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 bg-muted/5 rounded-lg border border-dashed border-border/40 mb-6">
                                                        <MessageSquare size={22} className="text-muted-foreground/20 mx-auto mb-2" />
                                                        <p className="text-[11px] text-muted-foreground italic">No replies yet — type below to start the discussion</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>

                                {/* -- Inline Reply Editor (sticky bottom) --------- */}
                                <div className="border-t border-border/10 bg-background/95 backdrop-blur sticky bottom-0 z-10">
                                    <div className="max-w-[900px] mx-auto px-6 py-3">
                                        <div className="flex items-end gap-2 bg-muted/20 border border-border/40 rounded-2xl px-4 py-2 min-h-[48px] focus-within:border-primary/40 transition-colors shadow-sm">
                                            <Textarea
                                                placeholder="Write a reply…"
                                                className="resize-none flex-1 text-sm border-0 shadow-none focus-visible:ring-0 focus:ring-0 focus:outline-none p-0 bg-transparent leading-6 min-h-[24px] max-h-[300px] rounded-none mt-1 outline-none"
                                                style={{ height: '24px' }}
                                                value={directReplyText}
                                                onChange={(e) => setDirectReplyText(e.target.value)}
                                                onInput={(e) => {
                                                    const el = e.currentTarget;
                                                    el.style.height = '24px';
                                                    el.style.height = Math.min(el.scrollHeight, 300) + 'px';
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleDirectReply();
                                                    }
                                                }}
                                                disabled={isSendingReply}
                                            />
                                            <div className="flex items-center gap-1.5 pl-2 pb-0.5 self-end">
                                                <button
                                                    type="button"
                                                    title="Bold"
                                                    onClick={() => {
                                                        const sel = window.getSelection()?.toString();
                                                        setDirectReplyText(prev => prev + (sel ? `**${sel}**` : '**bold**'));
                                                    }}
                                                    className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <Bold size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Bullet"
                                                    onClick={() => setDirectReplyText(prev => prev + '\n• ')}
                                                    className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <List size={15} />
                                                </button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="shrink-0 h-9 w-9 text-primary hover:text-primary hover:bg-primary/10 rounded-full"
                                                    onClick={handleDirectReply}
                                                    disabled={!directReplyText.trim() || isSendingReply}
                                                >
                                                    {isSendingReply
                                                        ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                                                        : <Send size={18} />
                                                    }
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Empty State */
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10">
                                <div className="bg-muted/20 border border-border/30 p-10 rounded-2xl mb-4 flex flex-col items-center gap-3">
                                    <FileText size={36} className="opacity-20 text-primary" />
                                    <div className="text-center">
                                        <h3 className="text-sm font-semibold text-foreground mb-1">Select a Note to View</h3>
                                        <p className="text-xs max-w-[260px] text-center opacity-60 leading-relaxed">
                                            Choose a note from the sidebar. It will appear here as a structured legal document.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div >
            )}
        </div >
    );

    return (
        <>
            {inline ? panelContent : (
                <Draggable nodeRef={nodeRef} handle=".handle" bounds="body" disabled={isFullscreen} position={position} onDrag={onDrag} onStop={onStop}>
                    {panelContent}
                </Draggable>
            )}

            <AddNoteModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleSaveNote}
                _caseId={caseId}
                hearings={hearings}
                initialData={editingNote}
                parentNote={replyingTo}
            />
            <NoteDetailModal
                note={detailNote}
                isOpen={detailOpen}
                onClose={() => setDetailOpen(false)}
                onEdit={(n) => { setReplyingTo(null); setEditingNote(n); setModalOpen(true); }}
                onDelete={handleDelete}
                onReply={(n) => { setEditingNote(null); setReplyingTo(n); setModalOpen(true); }}
                onPin={handlePin}
                onOpen={(n) => setDetailNote(n)}
                currentUserId={user?.id}
            />
        </>
    );
};

// -----------------------------------------------------------------
// Global legal document styles (injected once)
// -----------------------------------------------------------------
const LEGAL_STYLES = `
.legal-content-body {
    padding: 0;
}
.legal-body-text {
    font-size: 15px;
    line-height: 1.3;
    letter-spacing: 0.15px;
    color: var(--foreground);
    margin-bottom: 0px;
}
.legal-section-heading {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin-top: 24px;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    color: var(--foreground);
    opacity: 0.85;
}
.legal-bullet-item {
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 5px;
    padding-left: 4px;
}
.legal-bullet-dot {
    color: var(--primary);
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
}
.legal-bullet-number {
    color: var(--primary);
    font-weight: 600;
    font-size: 13px;
    flex-shrink: 0;
    min-width: 20px;
}
.legal-risk-flag {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 13px;
    line-height: 1.5;
    padding: 8px 12px;
    margin: 12px 0;
    background: rgba(245,158,11,0.07);
    border-left: 3px solid rgb(245,158,11);
    border-radius: 0 6px 6px 0;
    color: var(--foreground);
}
`;

if (typeof document !== 'undefined' && !document.getElementById('legal-notes-styles')) {
    const style = document.createElement('style');
    style.id = 'legal-notes-styles';
    style.textContent = LEGAL_STYLES;
    document.head.appendChild(style);
}




