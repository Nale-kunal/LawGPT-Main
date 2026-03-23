import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    MapPin,
    Plus,
    CheckCircle,
    Clock,
    X,
    Trash2,
} from 'lucide-react';
import { getApiUrl, apiFetch } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PipelineNode {
    nodeId: string;
    name: string;
    description?: string;
    color: string;
    type: 'system' | 'custom';
}

/** Minimal hearing shape we need — just the type fields */
interface HearingSummary {
    hearingType: string;
    customHearingType?: string; // set by backend when a custom pipeline node ID was used
}

interface HearingPipelinePanelProps {
    caseId: string;
    /** Pass the hearings array from the parent so the pipeline can colour nodes accordingly */
    hearings?: HearingSummary[];
    /** Called immediately whenever the custom nodes list changes (add/delete) */
    onCustomNodesChange?: (nodes: Array<{ nodeId: string; name: string }>) => void;
    /** Called when a node circle is clicked — receives the node's hearingType key */
    onNodeClick?: (hearingType: string) => void;
}

// ─── System node → hearing-type mapping ──────────────────────────────────────

const SYSTEM_NODE_HEARING_MAP: Record<string, string> = {
    sys_filed: '__always_complete__', // Case Filed is always green
    sys_first: 'first_hearing',
    sys_interim: 'interim_hearing',
    sys_evidence: 'evidence_hearing',
    sys_arguments: 'argument_hearing',
    sys_final: 'final_hearing',
    sys_judgment: 'judgment_hearing',
};

// ─── Color Swatches ──────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
    { label: 'Indigo', value: '#6366f1' },
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Teal', value: '#14b8a6' },
    { label: 'Orange', value: '#f97316' },
    { label: 'Rose', value: '#f43f5e' },
    { label: 'Purple', value: '#a855f7' },
];

// ─── Debounce helper ─────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const HearingPipelinePanel: React.FC<HearingPipelinePanelProps> = ({
    caseId,
    hearings = [],
    onCustomNodesChange,
    onNodeClick,
}) => {
    const [nodes, setNodes] = useState<PipelineNode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // "Add custom node" modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', description: '', color: COLOR_OPTIONS[0].value });
    const [addError, setAddError] = useState('');

    // Delete confirmation modal
    const [deleteTarget, setDeleteTarget] = useState<PipelineNode | null>(null);

    // Drag state
    const dragNode = useRef<number | null>(null);
    const dragOverNode = useRef<number | null>(null);

    // Build a set of all fulfilled hearing type values (standard + custom node IDs)
    const completedHearingTypes = new Set<string>();
    hearings.forEach(h => {
        if (h.hearingType) completedHearingTypes.add(h.hearingType);
        if (h.customHearingType) completedHearingTypes.add(h.customHearingType);
    });

    const isNodeComplete = (node: PipelineNode): boolean => {
        if (node.type === 'custom') {
            // Custom nodes are "complete" when any hearing has this node's ID as the hearingType
            return completedHearingTypes.has(node.nodeId);
        }
        const expectedType = SYSTEM_NODE_HEARING_MAP[node.nodeId];
        if (!expectedType) return false;
        if (expectedType === '__always_complete__') return true;
        return completedHearingTypes.has(expectedType);
    };

    // ── Fetch pipeline ───────────────────────────────────────────────────────

    const fetchPipeline = useCallback(async () => {
        if (!caseId) return;
        setIsLoading(true);
        try {
            const res = await apiFetch(getApiUrl(`/api/cases/${caseId}/pipeline`), {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setNodes(data.nodes || []);
            }
        } catch (err) {
            console.error('[HearingPipelinePanel] Failed to fetch pipeline:', err);
        } finally {
            setIsLoading(false);
        }
    }, [caseId]);

    useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

    // ── Notify parent of custom node changes (immediate, not debounced) ─────

    useEffect(() => {
        if (isLoading) return; // Don't fire during initial load
        const customNodes = nodes
            .filter(n => n.type === 'custom')
            .map(({ nodeId, name }) => ({ nodeId, name }));
        onCustomNodesChange?.(customNodes);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes]);

    // ── Auto-restore deleted system nodes when a matching hearing exists ──────
    // If a system node was deleted but the user recorded a hearing for it,
    // add the node back (at the end) so it shows with green status.
    useEffect(() => {
        if (isLoading || hearings.length === 0) return;
        const existingIds = new Set(nodes.map(n => n.nodeId));
        const completedTypes = new Set(hearings.flatMap(h =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [h.hearingType, (h as any).customHearingType].filter(Boolean)
        ));
        const DEFAULT_SYSTEM_NODES: PipelineNode[] = [
            { nodeId: 'sys_filed', name: 'Case Filed', type: 'system', color: '#22c55e' },
            { nodeId: 'sys_first', name: 'First Hearing', type: 'system', color: '#6366f1' },
            { nodeId: 'sys_interim', name: 'Interim', type: 'system', color: '#6366f1' },
            { nodeId: 'sys_evidence', name: 'Evidence', type: 'system', color: '#6366f1' },
            { nodeId: 'sys_arguments', name: 'Arguments', type: 'system', color: '#6366f1' },
            { nodeId: 'sys_final', name: 'Final Hearing', type: 'system', color: '#6366f1' },
            { nodeId: 'sys_judgment', name: 'Judgment', type: 'system', color: '#6366f1' },
        ];
        const toRestore = DEFAULT_SYSTEM_NODES.filter(sn => {
            if (existingIds.has(sn.nodeId)) return false; // already in pipeline
            const expectedType = SYSTEM_NODE_HEARING_MAP[sn.nodeId];
            if (!expectedType || expectedType === '__always_complete__') return false;
            return completedTypes.has(expectedType);
        });
        if (toRestore.length > 0) {
            setNodes(prev => [...prev, ...toRestore]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hearings, isLoading]);

    // ── Persist pipeline (debounced) ─────────────────────────────────────────

    const debouncedNodes = useDebounce(nodes, 800);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (isLoading) return;

        const persist = async () => {
            setIsSaving(true);
            try {
                const customNodes = debouncedNodes
                    .filter(n => n.type === 'custom')
                    .map(({ nodeId, name, description, color }) => ({ nodeId, name, description, color }));
                const pipelineOrder = debouncedNodes.map(n => n.nodeId);

                await apiFetch(getApiUrl(`/api/cases/${caseId}/pipeline`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ customNodes, pipelineOrder }),
                });
            } catch (err) {
                console.error('[HearingPipelinePanel] Failed to save pipeline:', err);
            } finally {
                setIsSaving(false);
            }
        };

        persist();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedNodes]);

    // ── Drag & Drop ──────────────────────────────────────────────────────────

    const handleDragStart = (index: number) => { dragNode.current = index; };
    const handleDragEnter = (index: number) => { dragOverNode.current = index; };

    const handleDragEnd = () => {
        const from = dragNode.current;
        const to = dragOverNode.current;

        if (from === null || to === null || from === to) {
            dragNode.current = null;
            dragOverNode.current = null;
            return;
        }

        setNodes(prev => {
            const updated = [...prev];
            const [moved] = updated.splice(from, 1);
            updated.splice(to, 0, moved);
            return updated;
        });

        dragNode.current = null;
        dragOverNode.current = null;
    };

    // ── Add custom node ───────────────────────────────────────────────────────

    const openAddModal = () => {
        setAddForm({ name: '', description: '', color: COLOR_OPTIONS[0].value });
        setAddError('');
        setShowAddModal(true);
    };

    const handleAddNode = () => {
        const trimmedName = addForm.name.trim();
        if (!trimmedName) {
            setAddError('Node name is required.');
            return;
        }
        const duplicate = nodes.some(n => n.name.trim().toLowerCase() === trimmedName.toLowerCase());
        if (duplicate) {
            setAddError(`A node named "${trimmedName}" already exists in this pipeline.`);
            return;
        }

        const newNode: PipelineNode = {
            nodeId: `custom_${Date.now()}`,
            name: trimmedName,
            description: addForm.description.trim(),
            color: addForm.color,
            type: 'custom',
        };

        setNodes(prev => [...prev, newNode]);
        setShowAddModal(false);
    };

    // ── Delete node ───────────────────────────────────────────────────────────

    const confirmDelete = (node: PipelineNode) => setDeleteTarget(node);

    const handleDeleteConfirmed = () => {
        if (!deleteTarget) return;
        setNodes(prev => prev.filter(n => n.nodeId !== deleteTarget.nodeId));
        setDeleteTarget(null);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Case Progress Pipeline
                                {isSaving && (
                                    <span className="text-xs font-normal text-muted-foreground ml-2 animate-pulse">
                                        Saving…
                                    </span>
                                )}
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Track your case through different stages. Drag to reorder.
                            </CardDescription>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={openAddModal}
                            className="flex items-center gap-1 border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all whitespace-nowrap"
                        >
                            <Plus className="h-4 w-4" />
                            Add Custom Node
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto pb-2">
                            {/* ─ Circles row ──────────────────────────────────── */}
                            <div className="flex items-center min-w-max">
                                {nodes.map((node, index) => {
                                    const complete = isNodeComplete(node);
                                    return (
                                        <React.Fragment key={node.nodeId}>
                                            {/* Circle cell */}
                                            <div
                                                draggable
                                                onDragStart={() => handleDragStart(index)}
                                                onDragEnter={() => handleDragEnter(index)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={e => e.preventDefault()}
                                                className="group relative flex items-center justify-center w-[70px] h-12 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
                                            >
                                                {/* X button — hidden for sys_filed (Case Filed is permanent) */}
                                                {node.nodeId !== 'sys_filed' && (
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); confirmDelete(node); }}
                                                        className={`
                                                        absolute top-0.5 right-3 z-10
                                                        w-4 h-4 rounded-full flex items-center justify-center
                                                        bg-background border border-border
                                                        text-muted-foreground
                                                        transition-all duration-150
                                                        opacity-0 group-hover:opacity-100
                                                        ${node.type === 'custom'
                                                                ? 'hover:border-destructive hover:text-destructive hover:bg-destructive/10'
                                                                : 'hover:border-orange-400 hover:text-orange-400'}
                                                    `}
                                                        title={node.type === 'custom' ? `Delete "${node.name}"` : `Remove "${node.name}" from pipeline`}
                                                        aria-label={`Delete ${node.name}`}
                                                    >
                                                        <X className="h-2.5 w-2.5" />
                                                    </button>
                                                )}

                                                {/* Circle */}
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110 cursor-pointer"
                                                    onClick={() => {
                                                        const key = node.type === 'system'
                                                            ? (SYSTEM_NODE_HEARING_MAP[node.nodeId] ?? node.nodeId)
                                                            : node.nodeId;
                                                        onNodeClick?.(key);
                                                    }}
                                                    title={`Click to find hearing for ${node.name}`}
                                                    style={
                                                        node.type === 'system'
                                                            ? complete
                                                                ? { backgroundColor: '#22c55e' }
                                                                : { backgroundColor: 'hsl(var(--muted))' }
                                                            : { backgroundColor: node.color + '28', border: `2px solid ${node.color}` }
                                                    }
                                                >
                                                    {node.type === 'system' ? (
                                                        complete
                                                            ? <CheckCircle className="h-4 w-4 text-white" />
                                                            : <Clock className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: node.color }} />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Arrow between nodes */}
                                            {index < nodes.length - 1 && (
                                                <svg className="h-4 w-4 text-muted-foreground flex-shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                                    <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" />
                                                </svg>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* ─ Labels row ───────────────────────────────────── */}
                            <div className="flex items-start min-w-max mt-1.5">
                                {nodes.map((node, index) => (
                                    <React.Fragment key={node.nodeId}>
                                        <div className="w-[70px] flex-shrink-0 text-center">
                                            <span className="text-xs leading-tight">{node.name}</span>
                                        </div>
                                        {/* Spacer matching arrow width (svg w-4 = 16px) */}
                                        {index < nodes.length - 1 && <div className="w-4 flex-shrink-0" />}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Add Custom Node Dialog ──────────────────────────────────────────── */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Custom Pipeline Node
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Name */}
                        <div className="space-y-1">
                            <Label htmlFor="cpn-name">
                                Node Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="cpn-name"
                                placeholder="e.g. Mediation, Lok Adalat…"
                                value={addForm.name}
                                onChange={e => { setAddForm(prev => ({ ...prev, name: e.target.value })); setAddError(''); }}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNode(); } }}
                                className="bg-background text-foreground border-transparent hover:border-accent hover:border-2 transition-all"
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                            <Label htmlFor="cpn-desc">
                                Description <span className="text-muted-foreground text-xs">(optional)</span>
                            </Label>
                            <Textarea
                                id="cpn-desc"
                                placeholder="Short description…"
                                rows={2}
                                value={addForm.description}
                                onChange={e => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                                className="bg-background text-foreground border-transparent hover:border-accent hover:border-2 transition-all resize-none"
                            />
                        </div>

                        {/* Color */}
                        <div className="space-y-1">
                            <Label>Color Tag <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <div className="flex gap-2 flex-wrap">
                                {COLOR_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        title={opt.label}
                                        onClick={() => setAddForm(prev => ({ ...prev, color: opt.value }))}
                                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${addForm.color === opt.value ? 'border-foreground scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: opt.value }}
                                        aria-pressed={addForm.color === opt.value}
                                    />
                                ))}
                            </div>
                        </div>

                        {addError && (
                            <p className="text-sm text-destructive" role="alert">{addError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowAddModal(false)}
                            className="border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddNode}
                            className="border border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
                        >
                            Create Node
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
            <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2" style={deleteTarget?.type === 'system' ? { color: 'hsl(var(--foreground))' } : undefined}>
                            <Trash2 className="h-4 w-4" />
                            {deleteTarget?.type === 'custom' ? 'Delete Custom Node' : 'Remove System Node'}
                        </DialogTitle>
                    </DialogHeader>

                    {deleteTarget?.type === 'custom' ? (
                        <>
                            <p className="text-sm text-muted-foreground py-2">
                                Delete this custom pipeline node?
                                <span className="block mt-1 font-medium text-foreground">"{deleteTarget.name}"</span>
                                This will remove it from the case pipeline. This action cannot be undone.
                            </p>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteTarget(null)}
                                    className="border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all">
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleDeleteConfirmed}
                                    className="border border-transparent transition-all">
                                    Delete
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground py-2">
                                Remove the system node
                                <span className="font-medium text-foreground"> "{deleteTarget?.name}" </span>
                                from this case's pipeline?
                                <span className="block mt-2 text-xs text-orange-400">
                                    ⚠ This will hide it from your pipeline. It can be restored by reordering nodes (add it back via drag &amp; drop is not supported — you'd need to reload the default pipeline).
                                </span>
                            </p>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteTarget(null)}
                                    className="border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all">
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleDeleteConfirmed}
                                    className="border border-transparent transition-all">
                                    Remove
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};
