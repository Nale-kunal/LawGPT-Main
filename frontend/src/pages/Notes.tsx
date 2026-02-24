import React, { useState, useEffect } from 'react';
import { useLegalData } from '@/contexts/LegalDataContext';
import { CaseNotesPanel } from '@/components/CaseNotesPanel';
import { Card } from '@/components/ui/card';
import { MessageSquare, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NotesPage = () => {
    const { cases, getHearingsByCaseId } = useLegalData();
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

    // If there are cases but none selected, select the first one by default
    useEffect(() => {
        if (cases.length > 0 && !selectedCaseId) {
            setSelectedCaseId(cases[0].id);
        }
    }, [cases, selectedCaseId]);

    const activeCase = cases.find(c => c.id === selectedCaseId);
    const hearings = selectedCaseId ? getHearingsByCaseId(selectedCaseId) : [];

    return (
        <div className="h-[calc(100vh-64px)] -m-3 md:-m-6 flex flex-col overflow-hidden bg-background">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Case Notes Dashboard</h1>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">Detailed strategy and evidence workspace</p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1">Case:</span>
                    <Select value={selectedCaseId || ''} onValueChange={setSelectedCaseId}>
                        <SelectTrigger className="w-[240px] h-8 text-[11px] bg-background/50">
                            <SelectValue placeholder="Select a case" />
                        </SelectTrigger>
                        <SelectContent>
                            {cases.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    <span className="font-semibold">{c.caseNumber}</span> - {c.clientName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex-1 bg-background overflow-hidden flex">
                {selectedCaseId ? (
                    <CaseNotesPanel
                        isOpen={true}
                        caseId={selectedCaseId}
                        hearings={hearings}
                        inline={true}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10">
                        <div className="bg-muted/30 p-10 rounded-full mb-6">
                            <MessageSquare size={54} className="opacity-20" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Workspace Inactive</h3>
                        <p className="text-xs max-w-xs text-center mt-2 opacity-60">
                            Select a case from the workspace selector above to activate the dedicated notes and strategy dashboard.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesPage;
