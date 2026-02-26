import React, { useState, useEffect } from 'react';
import { useLegalData } from '@/contexts/LegalDataContext';
import { CaseNotesPanel } from '@/components/CaseNotesPanel';
import { MessageSquare, BookOpen, Scale } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NotesPage = () => {
    const { cases, getHearingsByCaseId } = useLegalData();
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

    useEffect(() => {
        if (cases.length > 0 && !selectedCaseId) {
            setSelectedCaseId(cases[0].id);
        }
    }, [cases, selectedCaseId]);

    const activeCase = cases.find(c => c.id === selectedCaseId);
    const hearings = selectedCaseId ? getHearingsByCaseId(selectedCaseId) : [];

    return (
        <div className="h-[calc(100vh-64px)] -m-3 md:-m-6 flex flex-col overflow-hidden bg-background">
            {/* Dashboard Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/10">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-primary/10">
                        <BookOpen size={16} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-foreground">Legal Notes Workspace</h1>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-widest">
                            Strategy · Evidence · Internal Drafting
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <Scale size={12} className="text-muted-foreground" />
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Active Case</span>
                    </div>
                    <Select value={selectedCaseId || ''} onValueChange={setSelectedCaseId}>
                        <SelectTrigger className="w-[260px] h-8 text-xs bg-background/50 border-border/60">
                            <SelectValue placeholder="Select a case to begin" />
                        </SelectTrigger>
                        <SelectContent>
                            {cases.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    <span className="font-semibold text-xs">{c.caseNumber}</span>
                                    <span className="text-muted-foreground text-xs ml-1.5">— {c.clientName}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {activeCase && (
                        <span className="text-[10px] text-muted-foreground border border-border/40 rounded px-2 py-1 bg-muted/20">
                            {activeCase.caseType || 'Case'}
                        </span>
                    )}
                </div>
            </div>

            {/* Main Body */}
            <div className="flex-1 w-full bg-background overflow-hidden flex flex-col">
                {selectedCaseId ? (
                    <CaseNotesPanel
                        isOpen={true}
                        caseId={selectedCaseId}
                        hearings={hearings}
                        inline={true}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10">
                        <div className="bg-muted/20 border border-border/30 p-10 rounded-2xl mb-6 flex flex-col items-center gap-4">
                            <MessageSquare size={40} className="opacity-25 text-primary" />
                            <div className="text-center">
                                <h3 className="text-base font-semibold text-foreground mb-1">No Case Selected</h3>
                                <p className="text-xs max-w-xs text-center opacity-60 leading-relaxed">
                                    Select a case from the workspace selector above to open the legal notes and strategy drafting workspace.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 max-w-sm opacity-40">
                            {['Strategy Notes', 'Evidence Logs', 'Internal Memos'].map(label => (
                                <div key={label} className="text-center">
                                    <div className="w-8 h-8 rounded-full border border-border/50 mx-auto mb-1" />
                                    <p className="text-[9px] uppercase tracking-wider">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesPage;
