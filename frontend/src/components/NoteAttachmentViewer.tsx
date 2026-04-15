/**
 * NoteAttachmentViewer.tsx
 *
 * Rich WhatsApp-like attachment renderer for case notes.
 * Replaces the previous plain <a> link list.
 *
 * Rendering rules:
 *   image    → lazy thumbnail with click-to-expand lightbox
 *   video    → HTML5 <video controls> with Cloudinary poster
 *   audio    → HTML5 <audio controls>
 *   document → file icon + name + size + download button
 *
 * Uses IntersectionObserver for lazy loading.
 * All media failures fall back gracefully.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    FileText, Film, Music, Image as ImageIcon,
    Download, Trash2, Maximize2, X, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttachmentType = 'image' | 'video' | 'document' | 'audio';

export interface NoteAttachment {
    // Legacy fields (always present on existing notes)
    fileUrl: string;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    // New fields (present after the attachment feature is live)
    attachmentId?: string;
    type?: AttachmentType;
    uploadedAt?: string;
    cloudinaryPublicId?: string;
}

interface NoteAttachmentViewerProps {
    attachments: NoteAttachment[];
    /** If true, shows a delete button for each attachment */
    canDelete?: boolean;
    onDelete?: (attachment: NoteAttachment) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveType(att: NoteAttachment): AttachmentType {
    if (att.type) return att.type;
    const mime = att.mimeType || '';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
}

function humanSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Build a Cloudinary optimised thumbnail URL.
 * Falls back to the original URL if not a Cloudinary URL.
 */
function cloudinaryThumb(url: string, width = 320): string {
    if (!url.includes('res.cloudinary.com')) return url;
    return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
}

/**
 * Build a Cloudinary video poster URL (image from first frame).
 * Falls back gracefully.
 */
function cloudinaryVideoPoster(url: string): string | undefined {
    if (!url.includes('res.cloudinary.com')) return undefined;
    // Replace /video/upload/ with /video/upload/so_0/ and change extension to jpg
    return url
        .replace('/video/upload/', '/video/upload/so_0,w_640,q_auto/')
        .replace(/\.(mp4|mov|webm)$/, '.jpg');
}

// ─── Lazy Image subcomponent ──────────────────────────────────────────────────

const LazyImage: React.FC<{
    src: string;
    alt: string;
    onClick: () => void;
}> = ({ src, alt, onClick }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && imgRef.current) {
                    imgRef.current.src = src;
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [src]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-muted/30 rounded overflow-hidden cursor-pointer group"
            onClick={onClick}
        >
            <img
                ref={imgRef}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
            />
            {!loaded && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon size={24} className="text-muted-foreground/30 animate-pulse" />
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <ImageIcon size={22} className="text-muted-foreground/30" />
                    <span className="text-[10px] text-muted-foreground">Image unavailable</span>
                </div>
            )}
            {/* Expand hint on hover */}
            {loaded && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Maximize2 size={20} className="text-white drop-shadow" />
                </div>
            )}
        </div>
    );
};

// ─── Lightbox ─────────────────────────────────────────────────────────────────

const Lightbox: React.FC<{ src: string; alt: string; onClose: () => void }> = ({ src, alt, onClose }) => {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <button
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full p-2"
                onClick={onClose}
            >
                <X size={20} />
            </button>
            <img
                src={src}
                alt={alt}
                className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

// ─── Individual attachment renderers ─────────────────────────────────────────

const ImageAttachment: React.FC<{
    att: NoteAttachment;
    onDelete?: () => void;
    canDelete?: boolean;
}> = ({ att, onDelete, canDelete }) => {
    const [lightbox, setLightbox] = useState(false);
    const thumbSrc = cloudinaryThumb(att.fileUrl, 300);

    return (
        <>
            <div className="relative group rounded-lg overflow-hidden border border-border/40 bg-muted/10 aspect-video">
                <LazyImage
                    src={thumbSrc}
                    alt={att.fileName}
                    onClick={() => setLightbox(true)}
                />
                {/* Action bar */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1.5 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white/80 truncate flex-1 mr-2">{att.fileName}</span>
                    <div className="flex items-center gap-1 shrink-0">
                        <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-white/70 hover:text-white transition-colors"
                            title="Open original"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink size={12} />
                        </a>
                        {canDelete && onDelete && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Remove attachment"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {lightbox && (
                <Lightbox
                    src={att.fileUrl}
                    alt={att.fileName}
                    onClose={() => setLightbox(false)}
                />
            )}
        </>
    );
};

const VideoAttachment: React.FC<{
    att: NoteAttachment;
    onDelete?: () => void;
    canDelete?: boolean;
}> = ({ att, onDelete, canDelete }) => {
    const poster = cloudinaryVideoPoster(att.fileUrl);

    return (
        <div className="rounded-lg overflow-hidden border border-border/40 bg-black relative group">
            <video
                controls
                preload="metadata"
                poster={poster}
                className="w-full max-h-[260px] bg-black"
            >
                <source src={att.fileUrl} type={att.mimeType || 'video/mp4'} />
                Your browser does not support the video player.
            </video>
            <div className="flex items-center justify-between px-2 py-1.5 bg-muted/20 border-t border-border/30">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Film size={11} className="text-primary shrink-0" />
                    <span className="text-[11px] text-foreground/70 truncate">{att.fileName}</span>
                    {att.fileSize && <span className="text-[10px] text-muted-foreground shrink-0">· {humanSize(att.fileSize)}</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <a href={att.fileUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary" title="Open">
                        <ExternalLink size={12} />
                    </a>
                    {canDelete && onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const AudioAttachment: React.FC<{
    att: NoteAttachment;
    onDelete?: () => void;
    canDelete?: boolean;
}> = ({ att, onDelete, canDelete }) => (
    <div className="flex flex-col gap-1 p-2.5 rounded-lg border border-border/40 bg-muted/10">
        <div className="flex items-center gap-2 mb-1">
            <Music size={13} className="text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground/80 truncate flex-1">{att.fileName}</span>
            {att.fileSize && <span className="text-[10px] text-muted-foreground shrink-0">{humanSize(att.fileSize)}</span>}
            {canDelete && onDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    title="Remove"
                >
                    <Trash2 size={12} />
                </button>
            )}
        </div>
        <audio controls preload="metadata" className="w-full h-8">
            <source src={att.fileUrl} type={att.mimeType || 'audio/mpeg'} />
        </audio>
    </div>
);

const DocumentAttachment: React.FC<{
    att: NoteAttachment;
    onDelete?: () => void;
    canDelete?: boolean;
}> = ({ att, onDelete, canDelete }) => {
    const isPdf = att.mimeType === 'application/pdf' || att.fileName.toLowerCase().endsWith('.pdf');

    return (
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors group">
            {/* Icon */}
            <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${isPdf ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                <FileText size={18} className={isPdf ? 'text-red-400' : 'text-blue-400'} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{att.fileName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    {att.fileSize && (
                        <span className="text-[10px] text-muted-foreground">{humanSize(att.fileSize)}</span>
                    )}
                    {att.mimeType && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-normal">
                            {att.mimeType.split('/').pop()?.toUpperCase()}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
                <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="Open"
                >
                    <ExternalLink size={13} />
                </a>
                <a
                    href={att.fileUrl}
                    download={att.fileName}
                    className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="Download"
                >
                    <Download size={13} />
                </a>
                {canDelete && onDelete && (
                    <button
                        type="button"
                        onClick={onDelete}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const NoteAttachmentViewer: React.FC<NoteAttachmentViewerProps> = ({
    attachments,
    canDelete = false,
    onDelete,
}) => {
    const [deleting, setDeleting] = useState<string | null>(null);

    const handleDelete = useCallback(async (att: NoteAttachment) => {
        if (!onDelete) return;
        const key = att.attachmentId || att.fileUrl;
        if (!window.confirm(`Remove attachment "${att.fileName}"?`)) return;
        setDeleting(key);
        try {
            await onDelete(att);
        } finally {
            setDeleting(null);
        }
    }, [onDelete]);

    if (!attachments || attachments.length === 0) return null;

    const images = attachments.filter(a => resolveType(a) === 'image');
    const videos = attachments.filter(a => resolveType(a) === 'video');
    const audios = attachments.filter(a => resolveType(a) === 'audio');
    const docs = attachments.filter(a => resolveType(a) === 'document');

    return (
        <div className="mt-4 pt-4 border-t border-border/30 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Attachments
                <span className="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground/60">
                    ({attachments.length})
                </span>
            </p>

            {/* Images grid */}
            {images.length > 0 && (
                <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {images.map((att, i) => {
                        const key = att.attachmentId || att.fileUrl + i;
                        const isDeleting = deleting === (att.attachmentId || att.fileUrl);
                        return (
                            <div key={key} className={`transition-opacity ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}>
                                <ImageAttachment
                                    att={att}
                                    canDelete={canDelete}
                                    onDelete={canDelete ? () => handleDelete(att) : undefined}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
                <div className="space-y-2">
                    {videos.map((att, i) => {
                        const key = att.attachmentId || att.fileUrl + i;
                        const isDeleting = deleting === (att.attachmentId || att.fileUrl);
                        return (
                            <div key={key} className={`transition-opacity ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}>
                                <VideoAttachment
                                    att={att}
                                    canDelete={canDelete}
                                    onDelete={canDelete ? () => handleDelete(att) : undefined}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Audio */}
            {audios.length > 0 && (
                <div className="space-y-2">
                    {audios.map((att, i) => {
                        const key = att.attachmentId || att.fileUrl + i;
                        const isDeleting = deleting === (att.attachmentId || att.fileUrl);
                        return (
                            <div key={key} className={`transition-opacity ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}>
                                <AudioAttachment
                                    att={att}
                                    canDelete={canDelete}
                                    onDelete={canDelete ? () => handleDelete(att) : undefined}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Documents */}
            {docs.length > 0 && (
                <div className="space-y-1.5">
                    {docs.map((att, i) => {
                        const key = att.attachmentId || att.fileUrl + i;
                        const isDeleting = deleting === (att.attachmentId || att.fileUrl);
                        return (
                            <div key={key} className={`transition-opacity ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}>
                                <DocumentAttachment
                                    att={att}
                                    canDelete={canDelete}
                                    onDelete={canDelete ? () => handleDelete(att) : undefined}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NoteAttachmentViewer;
