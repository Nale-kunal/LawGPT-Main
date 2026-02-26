import { CaseNoteExportData } from './types';
import { generatePDF } from './pdf-driver';
import { generateWord } from './word-driver';

const sanitizeContent = (text: string): string => {
    if (!text) return '';
    return text
        .trim()
        .replace(/\n{3,}/g, '\n\n') // Collapse triple newlines
        .replace(/\r\n/g, '\n');    // Normalize line breaks
};

export const generateCaseNoteDocument = async (data: CaseNoteExportData, format: 'pdf' | 'docx') => {
    // Validate required fields
    if (!data.caseNumber || !data.caseParties.petitioner || !data.note.content || !data.note.authorName) {
        throw new Error("Missing required data for document generation (Case Number, Parties, Content, or Author).");
    }

    // Sanitize content
    const sanitizedData: CaseNoteExportData = {
        ...data,
        note: {
            ...data.note,
            content: sanitizeContent(data.note.content)
        },
        replies: data.replies?.map(r => ({
            ...r,
            content: sanitizeContent(r.content)
        }))
    };

    if (format === 'pdf') {
        await generatePDF(sanitizedData);
    } else {
        await generateWord(sanitizedData);
    }
};

export * from './types';
