import React, { useState, useEffect, useMemo } from 'react';
import Draggable from 'react-draggable';
import { getApiUrl, apiFetch, apiRequest } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import {
    X, Filter, Plus, MessageSquare, Edit2, Trash2,
    Pin, Lock, FileText, Paperclip, ChevronRight, ChevronDown,
    Maximize2, Minimize2, Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hearing } from '@/contexts/LegalDataContext';

// Types
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

// -----------------------------------------------------------------------------
// Helper: Recursive search for a note by ID in the tree
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Note Card Component
// -----------------------------------------------------------------------------
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
    const authorName = typeof note.authorId === 'object' && note.authorId !== null ? note.authorId.name : 'Unknown User';

    const typeConfig = {
        general: { color: 'bg-slate-100 text-slate-800', label: 'General' },
        hearing: { color: 'bg-blue-100 text-blue-800', label: 'Hearing' },
        evidence: { color: 'bg-purple-100 text-purple-800', label: 'Evidence' },
        strategy: { color: 'bg-amber-100 text-amber-800', label: 'Strategy' },
        internal: { color: 'bg-rose-100 text-rose-800', label: 'Internal' }
    };

    const currentType = typeConfig[note.noteType] || typeConfig.general;

    return (
        <div
            className={`text-[10px] cursor-pointer transition-all ${depth > 0 ? 'ml-3 mt-0.5 border-l-2 pl-2 border-border/50 bg-muted/5' : 'border rounded px-2 py-1 bg-card mt-1.5 hover:shadow-sm hover:border-primary/30'}`}
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
                    <span className="font-semibold text-[10px]">{authorName}</span>
                    <span className="text-muted-foreground text-[9px]" title={format(new Date(note.createdAt), 'PPpp')}>
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                    {note.editedAt && <span className="text-[9px] italic text-muted-foreground">(edited)</span>}
                    {note.isPrivate && <Lock size={10} className="text-rose-500" aria-label="Private Note" />}
                </div>
                <div className="flex items-center gap-1">
                    {note.isPinned && <Pin size={11} className="text-amber-500 fill-amber-500" />}
                    <Badge variant="secondary" className={`${currentType.color} border-0 text-[9px] px-1.5 py-0`}>
                        {currentType.label}
                    </Badge>
                </div>
            </div>

            {note.title && <p className="font-semibold text-[11px] mt-1">{note.title}</p>}

            <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">
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

// -----------------------------------------------------------------------------
// Note Detail Modal (full reading view)
// -----------------------------------------------------------------------------
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
    const authorName = typeof note.authorId === 'object' && note.authorId !== null ? note.authorId.name : 'Unknown User';

    const typeConfig: Record<string, { color: string; label: string }> = {
        general: { color: 'bg-slate-100 text-slate-800', label: 'General' },
        hearing: { color: 'bg-blue-100 text-blue-800', label: 'Hearing' },
        evidence: { color: 'bg-purple-100 text-purple-800', label: 'Evidence' },
        strategy: { color: 'bg-amber-100 text-amber-800', label: 'Strategy' },
        internal: { color: 'bg-rose-100 text-rose-800', label: 'Internal' }
    };
    const type = typeConfig[note.noteType] || typeConfig.general;

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader className="pb-2 border-b">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            {note.title && <DialogTitle className="text-base font-semibold">{note.title}</DialogTitle>}
                            <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-medium text-foreground">{authorName}</span>
                                <span>{format(new Date(note.createdAt), 'MMM d, yyyy · h:mm a')}</span>
                                {note.editedAt && <span className="italic">(edited)</span>}
                                {note.isPrivate && <span className="flex items-center gap-1 text-rose-500"><Lock size={10} /> Private</span>}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {note.isPinned && <Pin size={14} className="text-amber-500 fill-amber-500" />}
                            <Badge variant="secondary" className={`${type.color} border-0 text-xs`}>{type.label}</Badge>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 mt-3">
                    <div className="pr-2 space-y-4">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{note.content}</p>

                        {(note.evidenceTags?.length > 0 || (note.attachments && note.attachments.length > 0)) && (
                            <div className="border-t pt-3 space-y-2">
                                {note.evidenceTags?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1.5">Evidence Tags</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {note.evidenceTags.map(tag => (
                                                <Badge key={tag} variant="outline" className="text-xs"># {tag}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {note.attachments && note.attachments.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1.5">Attachments</p>
                                        <div className="space-y-1">
                                            {note.attachments.map((att, i) => (
                                                <a key={i} href={att.fileUrl} target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-2 text-sm text-blue-500 hover:underline">
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
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">
                                    {note.replies.length} {note.replies.length === 1 ? 'Reply' : 'Replies'}
                                </p>
                                <div className="space-y-3">
                                    {note.replies.map(reply => (
                                        <NoteCard
                                            key={reply._id}
                                            note={reply}
                                            depth={1}
                                            currentUserId={currentUserId}
                                            onReply={onReply}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onPin={onPin}
                                            onOpen={onOpen}
                                            forceShowActions={true}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="border-t pt-3 mt-3 flex justify-between items-center">
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

// -----------------------------------------------------------------------------
// Add/Edit Note Modal
// -----------------------------------------------------------------------------
const AddNoteModal = ({
    isOpen,
    onClose,
    onSubmit,
    caseId,
    hearings,
    initialData,
    parentNote
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    caseId: string;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            const data = {
                title: title.trim(),
                content: content.trim(),
                noteType,
                hearingId: hearingId === 'none' ? undefined : hearingId,
                evidenceTags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
                isPrivate,
                isPinned,
                parentNoteId: parentNote?._id
            };
            await onSubmit(data);
            onClose();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save note', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {initialData ? 'Edit Note' : parentNote ? 'Reply to Note' : 'Add Case Note'}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {initialData ? 'Update the details of your note.' : 'Provide details for your new note or reply.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {parentNote && (
                        <div className="bg-muted/40 p-3 rounded text-sm italic text-muted-foreground border border-border">
                            Replying to: "{parentNote.content.substring(0, 100)}{parentNote.content.length > 100 ? '...' : ''}"
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Title (Optional)</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief title" maxLength={150} />
                        </div>

                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={noteType} onValueChange={setNoteType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
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

                    <div className="space-y-2">
                        <Label>Content *</Label>
                        <Textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Write your note here..."
                            rows={5}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Link to Hearing (Optional)</Label>
                            <Select value={hearingId} onValueChange={setHearingId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select hearing" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {hearings?.map(h => (
                                        <SelectItem key={h.id} value={h.id}>
                                            {format(new Date(h.hearingDate), 'MMM d, yyyy')} - {h.hearingType}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Evidence Tags</Label>
                            <Input
                                value={tagsInput}
                                onChange={e => setTagsInput(e.target.value)}
                                placeholder="tag1, tag2..."
                            />
                            <p className="text-[10px] text-muted-foreground">Comma separated</p>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="isPrivate" checked={isPrivate} onCheckedChange={(v) => setIsPrivate(!!v)} />
                            <Label htmlFor="isPrivate" className="text-sm font-normal">Private Note</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="isPinned" checked={isPinned} onCheckedChange={(v) => setIsPinned(!!v)} />
                            <Label htmlFor="isPinned" className="text-sm font-normal">Pin to Top</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Note'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

// -----------------------------------------------------------------------------
// Main Slide-over Panel
// -----------------------------------------------------------------------------
export interface CaseNotesPanelProps {
    isOpen: boolean;
    onClose?: () => void;
    caseId: string;
    hearings: Hearing[];
    defaultHearingId?: string;
    inline?: boolean;
}

export const CaseNotesPanel = ({
    isOpen,
    onClose,
    caseId,
    hearings,
    defaultHearingId,
    inline = false
}: CaseNotesPanelProps) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [filterType, setFilterType] = useState('all');
    const [filterHearing, setFilterHearing] = useState(defaultHearingId || 'all');
    const [sortOrder, setSortOrder] = useState('newest');

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [replyingTo, setReplyingTo] = useState<Note | null>(null);
    const [detailNote, setDetailNote] = useState<Note | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [directReplyText, setDirectReplyText] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();
    const nodeRef = React.useRef<HTMLDivElement>(null);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const baseUrl = getApiUrl(`/api/v1/cases/${caseId}/notes`);
            const params = new URLSearchParams();
            if (filterType !== 'all') params.append('noteType', filterType);
            if (filterHearing !== 'all') params.append('hearingId', filterHearing);
            const query = params.toString();
            const url = query ? `${baseUrl}?${query}` : baseUrl;

            const data = await apiRequest(url, { credentials: 'include' });
            setNotes(data);
        } catch (error) {
            console.error('Failed to fetch case notes', error);
            toast({ title: 'Error', description: error instanceof Error ? error.message : 'Could not load notes', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && caseId) {
            fetchNotes();
            if (defaultHearingId) {
                setFilterHearing(defaultHearingId);
            }
        }
    }, [isOpen, caseId, filterType, filterHearing, defaultHearingId]);

    const handleSaveNote = async (data: any) => {
        let method = 'POST';
        let url = getApiUrl(`/api/v1/cases/${caseId}/notes`);

        if (editingNote) {
            method = 'PUT';
            url += `/${editingNote._id}`;
        }

        await apiRequest(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        toast({ title: 'Success', description: `Note ${editingNote ? 'updated' : 'created'} successfully` });
        fetchNotes();
    };

    const handleDirectReply = async () => {
        if (!directReplyText.trim() || !detailNote || isSendingReply) return;

        setIsSendingReply(true);
        try {
            await apiRequest(getApiUrl(`/api/v1/cases/${caseId}/notes`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    content: directReplyText.trim(),
                    noteType: 'internal',
                    parentNoteId: detailNote._id
                })
            });
            setDirectReplyText('');
            await fetchNotes();

            // Re-sync the current detail note if it was updated
            const updated = findNoteByIdRecursive(notes, detailNote._id);
            if (updated) setDetailNote(updated);

        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to send reply', variant: 'destructive' });
        } finally {
            setIsSendingReply(false);
        }
    };

    // Sync detailNote with notes array whenever notes change (e.g. after pinning, replying, editing)
    useEffect(() => {
        if (detailNote) {
            const updated = findNoteByIdRecursive(notes, detailNote._id);
            if (updated) {
                setDetailNote(updated);
            }
        }
    }, [notes, detailNote?._id]);

    const handleDelete = async (note: Note) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        try {
            await apiRequest(getApiUrl(`/api/v1/cases/${caseId}/notes/${note._id}`), {
                method: 'DELETE',
                credentials: 'include'
            });
            toast({ title: 'Deleted', description: 'Note removed' });
            if (detailNote?._id === note._id) setDetailNote(null);
            fetchNotes();
        } catch (error) {
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
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to toggle pin', variant: 'destructive' });
        }
    };

    const openAddNote = () => {
        setEditingNote(null);
        setReplyingTo(null);
        setModalOpen(true);
    };

    const openDetail = (note: Note) => {
        setDetailNote(note);
        if (!isFullscreen && !inline) {
            setDetailOpen(true);
        }
    };

    const onDrag = (_e: any, data: { x: number; y: number }) => {
        setPosition({ x: data.x, y: data.y });
    };

    const onStop = (_e: any, data: { x: number; y: number }) => {
        let { x, y } = data;
        const width = isMinimized ? 280 : 380;
        const height = isMinimized ? 40 : 520;

        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + width > window.innerWidth) x = window.innerWidth - width;
        if (y + height > window.innerHeight) y = window.innerHeight - height;

        setPosition({ x, y });
    };

    useEffect(() => {
        if (isFullscreen || inline) {
            setPosition({ x: 0, y: 0 });
        } else {
            onStop(null, position);
        }
    }, [isFullscreen, isMinimized, inline]);

    const sortedNotes = useMemo(() => {
        let sorted = [...notes];
        if (sortOrder === 'oldest') {
            sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        } else {
            sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
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
                caseId={caseId}
                hearings={hearings}
                initialData={editingNote}
                parentNote={replyingTo}
            />
        );
    }

    const panelContent = (
        <div
            ref={nodeRef}
            id="case-notes-panel"
            className={inline ? 'flex flex-col h-full min-h-[400px] relative' : panelSizeClass}
        >
            {!inline && onClose && (
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40 cursor-grab active:cursor-grabbing handle transition-colors hover:bg-muted/60">
                    <h2 className="text-xs font-semibold flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" /> Case Notes
                        {notes.length > 0 && <span className="text-muted-foreground font-normal">({notes.length})</span>}
                    </h2>
                    <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" onClick={() => setIsMinimized(!isMinimized)} className="rounded-full h-5 w-5" title={isMinimized ? 'Restore' : 'Minimize'}>
                            <Minus className="w-3 h-3" />
                        </Button>
                        {!inline && (
                            <Button variant="ghost" size="icon" onClick={() => { setIsFullscreen(!isFullscreen); setIsMinimized(false); }} className="rounded-full h-5 w-5" title={isFullscreen ? 'Restore' : 'Fullscreen'}>
                                {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-5 w-5" title="Close">
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            {!isMinimized && !isFullscreen && !inline && (
                <div className={`px-3 py-2 border-b bg-muted/20 space-y-1.5 ${inline ? 'rounded-t-md border-x border-t' : ''}`}>
                    <div className="flex gap-2">
                        <Button onClick={openAddNote} className="flex-1 h-7 text-xs" size="sm">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Note
                        </Button>
                    </div>
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
                        <Select value={filterHearing} onValueChange={setFilterHearing}>
                            <SelectTrigger className="h-7 text-[11px] flex-1"><SelectValue placeholder="All Hearings" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Hearings</SelectItem>
                                {hearings?.map(h => (
                                    <SelectItem key={h.id} value={h.id}>{format(new Date(h.hearingDate), 'MMM d, yyyy')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                            <SelectTrigger className="h-7 text-[11px] w-[90px]"><SelectValue placeholder="Sort" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest First</SelectItem>
                                <SelectItem value="oldest">Oldest First</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {!isMinimized && !isFullscreen && !inline && (
                <ScrollArea className={`flex-1 px-3 py-2 bg-background ${inline ? 'border-x border-b rounded-b-md' : ''}`}>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">Loading notes...</div>
                    ) : sortedNotes.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-muted-foreground text-xs font-medium">No notes found</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5 pb-4">
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
            )}

            {!isMinimized && (isFullscreen || inline) && (
                <div className="flex flex-1 overflow-hidden border-t">
                    <div className="w-[240px] border-r bg-muted/5 flex flex-col h-full shrink-0">
                        <div className="p-2 border-b flex flex-col gap-2">
                            <Button onClick={openAddNote} className="w-full h-8 text-[11px] justify-start" size="sm" variant="outline">
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> New Note
                            </Button>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="h-8 text-[11px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="hearing">Hearing</SelectItem>
                                    <SelectItem value="evidence">Evidence</SelectItem>
                                    <SelectItem value="strategy">Strategy</SelectItem>
                                    <SelectItem value="internal">Internal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <ScrollArea className="flex-1 p-2">
                            <div className="space-y-1">
                                {sortedNotes.length === 0 ? (
                                    <p className="text-center py-10 text-[10px] text-muted-foreground">No notes found</p>
                                ) : (
                                    sortedNotes.map(note => (
                                        <div
                                            key={note._id}
                                            onClick={() => setDetailNote(note)}
                                            className={`p-2 rounded-md cursor-pointer transition-all border ${detailNote?._id === note._id ? 'bg-primary/10 border-primary/20 shadow-sm' : 'border-transparent hover:bg-muted/50'}`}
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <h3 className={`text-[11px] font-semibold truncate ${detailNote?._id === note._id ? 'text-primary' : 'text-foreground'}`}>
                                                    {note.title || (note.content.length > 25 ? note.content.substring(0, 25) + '...' : note.content)}
                                                </h3>
                                                {note.isPinned && <Pin size={10} className="text-amber-500 fill-amber-500 shrink-0" />}
                                            </div>
                                            <div className="flex items-center justify-between gap-1.5 mt-1 opacity-70">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <span className="text-[9px] font-medium truncate max-w-[80px]">{typeof note.authorId === 'object' ? note.authorId.name : 'Unknown User'}</span>
                                                    <span className="text-[9px]">•</span>
                                                    <span className="text-[9px]">{format(new Date(note.createdAt), 'MMM d')}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 text-muted-foreground hover:text-primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingNote(null);
                                                        setReplyingTo(note);
                                                        setModalOpen(true);
                                                    }}
                                                    title="Reply"
                                                >
                                                    <MessageSquare size={10} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="flex-1 bg-background flex flex-col overflow-hidden relative">
                        {detailNote ? (
                            <>
                                <ScrollArea className="flex-1">
                                    <div className="p-4 md:p-6 max-w-none space-y-4">
                                        <div className="border-b pb-4 space-y-3">
                                            {detailNote.parentNoteId && (
                                                <div className="bg-muted/30 p-2 rounded border border-dashed border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                                                    onClick={() => {
                                                        const parent = findNoteByIdRecursive(notes, detailNote.parentNoteId!);
                                                        if (parent) setDetailNote(parent);
                                                    }}
                                                >
                                                    <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1"><MessageSquare size={10} /> In reply to</p>
                                                    <p className="text-[10px] italic line-clamp-2 opacity-70">
                                                        {findNoteByIdRecursive(notes, detailNote.parentNoteId!)?.content || 'Original Note'}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-1.5">
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                                        <span className="text-foreground font-semibold">{typeof detailNote.authorId === 'object' ? detailNote.authorId.name : 'Unknown User'}</span>
                                                        <span>•</span>
                                                        <span>{format(new Date(detailNote.createdAt), 'PPP p')}</span>
                                                        {detailNote.isPrivate && <Badge variant="destructive" className="h-4 px-1 text-[9px]">Private</Badge>}
                                                    </div>
                                                    <h1 className="text-lg font-bold text-foreground leading-tight">{detailNote.title || (detailNote.parentNoteId ? 'Reply' : 'Untitled Note')}</h1>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                    <div className="flex gap-1">
                                                        <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-bold h-5 uppercase">{detailNote.noteType}</Badge>
                                                        {detailNote.isPinned && <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 h-5 px-1.5 text-[9px] flex items-center gap-1"><Pin size={8} className="fill-current" /> Pinned</Badge>}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingNote(null); setReplyingTo(detailNote); setModalOpen(true); }} title="Reply">
                                                            <MessageSquare size={13} />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditingNote(detailNote); setModalOpen(true); }} title="Edit">
                                                            <Edit2 size={13} />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(detailNote)} title="Delete">
                                                            <Trash2 size={13} />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className={`h-7 w-7 ${detailNote.isPinned ? 'text-amber-500' : 'text-muted-foreground'}`} onClick={() => handlePin(detailNote, !detailNote.isPinned)} title={detailNote.isPinned ? 'Unpin' : 'Pin'}>
                                                            <Pin size={13} className={detailNote.isPinned ? 'fill-current' : ''} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap py-2 border-b border-border/50">{detailNote.content}</div>

                                        <div className="flex flex-wrap gap-1.5 pt-2">
                                            {detailNote.evidenceTags?.map(tag => (
                                                <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[9px] h-4">#{tag}</Badge>
                                            ))}
                                        </div>

                                        {detailNote.attachments && detailNote.attachments.length > 0 && (
                                            <div className="pt-4 border-t">
                                                <h4 className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest mb-2">Attachments</h4>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {detailNote.attachments.map((att, i) => (
                                                        <a key={i} href={att.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-1.5 rounded border bg-muted/20 hover:bg-muted/40 transition-colors">
                                                            <Paperclip size={11} className="text-primary" /><span className="text-[10px] font-medium truncate">{att.fileName}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-6 border-t mt-6">
                                            <h4 className="text-[11px] font-bold flex items-center gap-2 mb-4 uppercase tracking-wider text-muted-foreground">
                                                <MessageSquare size={14} className="text-primary" /> Discussion
                                                {detailNote.replies && detailNote.replies.length > 0 && <span className="font-normal">({detailNote.replies.length})</span>}
                                            </h4>
                                            {detailNote.replies && detailNote.replies.length > 0 ? (
                                                <div className="space-y-3 pb-10">
                                                    {detailNote.replies.map(reply => (
                                                        <NoteCard key={reply._id} note={reply} depth={0} currentUserId={user?.id} onReply={(n) => { setReplyingTo(n); setModalOpen(true); }} onEdit={(n) => { setEditingNote(n); setModalOpen(true); }} onDelete={handleDelete} onPin={handlePin} onOpen={(n) => setDetailNote(n)} forceShowActions={true} />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 bg-muted/5 rounded border border-dashed border-border/50">
                                                    <p className="text-[10px] text-muted-foreground italic">No replies yet. Type below to start the conversation.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </ScrollArea>

                                <div className="p-2 border-t bg-background/95 backdrop-blur sticky bottom-0 z-10">
                                    <div className="max-w-4xl mx-auto flex gap-2">
                                        <Textarea placeholder="Type a reply..." className="min-h-[36px] h-9 py-1.5 px-3 resize-none shadow-sm flex-1 text-[11px] border-muted" value={directReplyText} onChange={(e) => setDirectReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDirectReply(); } }} disabled={isSendingReply} />
                                        <Button size="icon" className="shrink-0 h-9 w-9" onClick={handleDirectReply} disabled={!directReplyText.trim() || isSendingReply}>
                                            {isSendingReply ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" /> : <MessageSquare size={16} />}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10">
                                <div className="bg-muted/30 p-8 rounded-full mb-4"><FileText size={42} className="opacity-20" /></div>
                                <h3 className="text-base font-medium text-foreground">Select a note to view</h3>
                                <p className="text-xs max-w-xs text-center mt-2 opacity-60">Choose a note from the sidebar to read its full content and view the discussion.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
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
                caseId={caseId}
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
