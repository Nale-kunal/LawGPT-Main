/**
 * NoteAttachmentUploader.tsx
 *
 * Self-contained attachment uploader for case notes.
 * - Renders a 📎 button + optional drag-and-drop zone
 * - Client-side pre-validation (MIME type + file size)
 * - Per-file upload progress via XHR
 * - Does NOT block note creation if an upload fails (retry available)
 * - When noteId is not yet known (new note), files are staged locally
 *   and the parent calls uploadStagedFiles() after the note is created.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Paperclip, X, Loader2, AlertCircle, RotateCcw, FileText, Film, Music, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiUrl, getCsrfToken } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttachmentType = 'image' | 'video' | 'document' | 'audio';

export interface StagedAttachment {
    /** Stable client-side key */
    localId: string;
    file: File;
    /** Set after successful upload */
    uploaded?: UploadedAttachment;
    status: 'pending' | 'uploading' | 'done' | 'error';
    progress: number;
    error?: string;
}

export interface UploadedAttachment {
    attachmentId: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    type: AttachmentType;
    uploadedAt: string;
    cloudinaryPublicId?: string;
}

interface NoteAttachmentUploaderProps {
    caseId: string;
    /** Provided when editing an existing note. Undefined for new notes. */
    noteId?: string;
    staged: StagedAttachment[];
    onChange: (staged: StagedAttachment[]) => void;
    /** Called with successfully uploaded attachment objects (when noteId is known) */
    onUploaded?: (attachments: UploadedAttachment[]) => void;
    disabled?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES_TOTAL = 10;

const ALLOWED_TYPES: Record<string, AttachmentType> = {
    'image/jpeg': 'image',
    'image/jpg': 'image',
    'image/png': 'image',
    'image/webp': 'image',
    'image/gif': 'image',
    'video/mp4': 'video',
    'video/quicktime': 'video',
    'video/webm': 'video',
    'application/pdf': 'document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
    'application/msword': 'document',
    'text/plain': 'document',
    'audio/mpeg': 'audio',
    'audio/mp3': 'audio',
    'audio/wav': 'audio',
    'audio/ogg': 'audio',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uid(): string {
    return Math.random().toString(36).slice(2, 10);
}

function IconForType({ type }: { type: AttachmentType }) {
    const cls = 'shrink-0';
    if (type === 'image') return <Image size={14} className={cls} />;
    if (type === 'video') return <Film size={14} className={cls} />;
    if (type === 'audio') return <Music size={14} className={cls} />;
    return <FileText size={14} className={cls} />;
}

// ─── Upload via XHR (to track progress) ─────────────────────────────────────

function uploadFileXHR(
    file: File,
    url: string,
    onProgress: (pct: number) => void,
    signal: AbortSignal
): Promise<UploadedAttachment[]> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('files', file);

        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve(data.attachments || []);
                } catch {
                    reject(new Error('Invalid server response'));
                }
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error(err.error || `Upload failed (${xhr.status})`));
                } catch {
                    reject(new Error(`Upload failed (${xhr.status})`));
                }
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        signal.addEventListener('abort', () => xhr.abort());

        xhr.open('POST', url);
        // Don't set Content-Type — browser sets multipart/form-data boundary automatically
        // MUST set the CSRF token header or the backend will reject with 403
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
        }
        xhr.send(formData);
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export const NoteAttachmentUploader: React.FC<NoteAttachmentUploaderProps> = ({
    caseId,
    noteId,
    staged,
    onChange,
    onUploaded,
    disabled = false,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortRefs = useRef<Map<string, AbortController>>(new Map());
    const [isDragOver, setIsDragOver] = useState(false);

    const uploadUrl = noteId
        ? getApiUrl(`/api/v1/cases/${caseId}/notes/${noteId}/attachments`)
        : null;

    /** Validate a single file client-side before adding to staged list */
    const validateFile = (file: File): string | null => {
        if (!ALLOWED_TYPES[file.type]) {
            return `"${file.name}" is not a supported file type. Allowed: images, videos (mp4/mov), PDFs, DOCX, TXT, audio.`;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return `"${file.name}" exceeds the ${MAX_FILE_SIZE_MB} MB limit (${humanSize(file.size)}).`;
        }
        const currentCount = staged.filter(s => s.status !== 'error').length;
        if (currentCount >= MAX_FILES_TOTAL) {
            return `A note can have at most ${MAX_FILES_TOTAL} attachments.`;
        }
        return null;
    };

    /** Start uploading a single staged item (when noteId is available) */
    const uploadItem = useCallback(async (item: StagedAttachment) => {
        if (!uploadUrl) return; // staging only — will be uploaded after note creation

        const controller = new AbortController();
        abortRefs.current.set(item.localId, controller);

        // Mark as uploading
        onChange(prev => prev.map(s =>
            s.localId === item.localId ? { ...s, status: 'uploading', progress: 0 } : s
        ));

        try {
            const attachments = await uploadFileXHR(
                item.file,
                uploadUrl,
                (pct) => {
                    onChange(prev => prev.map(s =>
                        s.localId === item.localId ? { ...s, progress: pct } : s
                    ));
                },
                controller.signal
            );

            if (attachments.length > 0) {
                const uploaded = attachments[0];
                onChange(prev => prev.map(s =>
                    s.localId === item.localId
                        ? { ...s, status: 'done', progress: 100, uploaded }
                        : s
                ));
                onUploaded?.(attachments);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Upload failed';
            onChange(prev => prev.map(s =>
                s.localId === item.localId
                    ? { ...s, status: 'error', error: msg }
                    : s
            ));
        } finally {
            abortRefs.current.delete(item.localId);
        }
    }, [uploadUrl, onChange, onUploaded]);

    /** Add files to staged list (and auto-upload if noteId is known) */
    const addFiles = useCallback((files: FileList | File[]) => {
        const arr = Array.from(files);
        const newItems: StagedAttachment[] = [];
        const rejections: string[] = [];

        for (const file of arr) {
            const err = validateFile(file);
            if (err) { rejections.push(err); continue; }
            const item: StagedAttachment = {
                localId: uid(),
                file,
                status: noteId ? 'uploading' : 'pending',
                progress: 0,
            };
            newItems.push(item);
        }

        if (rejections.length > 0) {
            // Show first rejection as a simple alert (non-breaking)
            alert(rejections[0]);
        }

        if (newItems.length > 0) {
            onChange(prev => [...prev, ...newItems]);
            if (noteId) {
                // Upload immediately
                for (const item of newItems) uploadItem(item);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteId, staged.length, onChange, uploadItem]);

    /** Expose so parent can upload staged files after note creation */
    // This is handled by parent calling uploadStagedFiles from the hook below

    const removeItem = (localId: string) => {
        // Cancel in-flight XHR if any
        abortRefs.current.get(localId)?.abort();
        abortRefs.current.delete(localId);
        onChange(prev => prev.filter(s => s.localId !== localId));
    };

    const retryItem = (item: StagedAttachment) => {
        if (!uploadUrl) return;
        onChange(prev => prev.map(s =>
            s.localId === item.localId ? { ...s, status: 'uploading', progress: 0, error: undefined } : s
        ));
        uploadItem({ ...item, status: 'uploading', progress: 0 });
    };

    // ── Drag-and-drop Handlers ─────────────────────────────────────────────────

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
    const onDragLeave = () => setIsDragOver(false);
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (!disabled && e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-2">
            {/* Button row */}
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2.5 gap-1.5 text-muted-foreground hover:text-foreground"
                    disabled={disabled || staged.filter(s => s.status !== 'error').length >= MAX_FILES_TOTAL}
                    onClick={() => fileInputRef.current?.click()}
                    id="note-attachment-btn"
                >
                    <Paperclip size={13} />
                    Attach Files
                </Button>
                <span className="text-[10px] text-muted-foreground">
                    Max {MAX_FILE_SIZE_MB} MB · Images, videos, PDFs, DOCX, audio
                </span>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf,.docx,.doc,text/plain,audio/mpeg,audio/wav,audio/ogg"
                    className="hidden"
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                    disabled={disabled}
                    id="note-attachment-file-input"
                />
            </div>

            {/* Drag-and-drop zone — only shown when no files yet */}
            {staged.length === 0 && (
                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`
                        border-2 border-dashed rounded-lg px-4 py-3 text-center text-[11px]
                        text-muted-foreground transition-colors cursor-default
                        ${isDragOver ? 'border-primary/60 bg-primary/5' : 'border-border/40 bg-muted/10'}
                    `}
                >
                    {isDragOver ? 'Drop to attach…' : 'or drag & drop files here'}
                </div>
            )}

            {/* Staged file list */}
            {staged.length > 0 && (
                <div className="space-y-1.5">
                    {staged.map(item => {
                        const fileType: AttachmentType = ALLOWED_TYPES[item.file.type] ?? 'document';
                        return (
                            <div
                                key={item.localId}
                                className={`
                                    flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs
                                    ${item.status === 'error'
                                        ? 'border-destructive/40 bg-destructive/5'
                                        : 'border-border/40 bg-muted/20'
                                    }
                                `}
                            >
                                {/* Icon */}
                                <span className="text-muted-foreground">
                                    <IconForType type={fileType} />
                                </span>

                                {/* Name + metadata */}
                                <div className="flex-1 min-w-0">
                                    <p className="truncate font-medium text-foreground/80 leading-tight">
                                        {item.file.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {humanSize(item.file.size)}
                                        {item.status === 'uploading' && ` · ${item.progress}%`}
                                        {item.status === 'done' && ' · Uploaded'}
                                        {item.status === 'pending' && ' · Pending (will upload on save)'}
                                    </p>
                                    {/* Progress bar */}
                                    {item.status === 'uploading' && (
                                        <div className="w-full h-0.5 bg-muted rounded mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded transition-all"
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                    )}
                                    {/* Error message */}
                                    {item.status === 'error' && item.error && (
                                        <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-1">
                                            <AlertCircle size={10} /> {item.error}
                                        </p>
                                    )}
                                </div>

                                {/* Status / action icons */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {item.status === 'uploading' && (
                                        <Loader2 size={13} className="animate-spin text-primary" />
                                    )}
                                    {item.status === 'error' && noteId && (
                                        <button
                                            type="button"
                                            onClick={() => retryItem(item)}
                                            className="text-muted-foreground hover:text-primary transition-colors"
                                            title="Retry upload"
                                        >
                                            <RotateCcw size={13} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeItem(item.localId)}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                        title="Remove"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/**
 * Upload all pending/errored staged files for a newly created note.
 * Call this immediately after the POST /notes response gives you a noteId.
 */
export async function uploadStagedFiles(
    staged: StagedAttachment[],
    caseId: string,
    noteId: string,
    onItemDone: (localId: string, att: UploadedAttachment) => void,
    onItemError: (localId: string, error: string) => void
): Promise<UploadedAttachment[]> {
    const url = getApiUrl(`/api/v1/cases/${caseId}/notes/${noteId}/attachments`);
    const pending = staged.filter(s => s.status === 'pending' || s.status === 'error');
    const results: UploadedAttachment[] = [];

    for (const item of pending) {
        const controller = new AbortController();
        try {
            const atts = await uploadFileXHR(item.file, url, () => { }, controller.signal);
            if (atts.length > 0) {
                results.push(atts[0]);
                onItemDone(item.localId, atts[0]);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Upload failed';
            onItemError(item.localId, msg);
        }
    }
    return results;
}

export default NoteAttachmentUploader;
