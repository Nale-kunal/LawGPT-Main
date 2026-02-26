export interface CaseNoteExportData {
    caseNumber: string;
    caseParties: {
        petitioner: string;
        respondent: string;
    };
    note: {
        title: string;
        content: string;
        authorName: string;
        createdDateTime: string;
        noteType: string;
        isPrivate: boolean;
        isPinned: boolean;
        evidenceTags: string[];
    };
    hearing?: {
        date: string;
        stage: string;
        court: string;
    };
    parentNoteTitle?: string;
    replies?: {
        authorName: string;
        content: string;
        createdDateTime: string;
    }[];
}
