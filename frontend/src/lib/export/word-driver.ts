import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    WidthType, AlignmentType, BorderStyle, Header, Footer, PageNumber,
    IBorderOptions, ShadingType
} from 'docx';
import { saveAs } from 'file-saver';
import { CaseNoteExportData } from './types';

// ─── Content Type Detection (mirrors LegalContentRenderer + pdf-driver) ─────
type LineType = 'heading' | 'bullet' | 'numbered' | 'risk' | 'body';

function classifyLine(line: string): LineType {
    const t = line.trim();
    if (!t) return 'body';
    if (/^(SECTION|HEADING|NOTE|ORDER|SUBMITTED|PREPARED|ACTION|ARGUMENT|EVIDENCE|FACTS|CONCLUSION|SUBMISSIONS|REPLY|PRAYER|WHEREAS|WHEREFORE|BACKGROUND|SUMMARY|TIMELINE|CHRONOLOGY|PARTIES|ISSUE|RELIEF|CHARGES|GROUNDS)[:\s]/i.test(t) || /^[A-Z][A-Z\s\d]{4,}:$/.test(t)) return 'heading';
    if (/^\[RISK\]|^⚠|^RISK:/i.test(t)) return 'risk';
    if (/^[-•*]\s/.test(t)) return 'bullet';
    if (/^\d+\.\s/.test(t)) return 'numbered';
    return 'body';
}

function stripPrefix(line: string, type: LineType): string {
    if (type === 'bullet') return line.trim().replace(/^[-•*]\s+/, '');
    if (type === 'risk') return line.trim().replace(/^\[RISK\]\s*|^⚠\s*|^RISK:\s*/i, '');
    if (type === 'numbered') return line.trim().replace(/^\d+\.\s+/, '');
    return line.trim().replace(/:$/, '');
}

// ─── Docx Shared Styles ─────────────────────────────────────────────────────
const pageBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 12, color: '000000', space: 24 };
const dividerBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA', space: 4 };
const noBorder = { style: BorderStyle.NIL };

/**
 * Divider paragraph — renders a hairline rule.
 */
function divider(spaceBefore = 120, spaceAfter = 120): Paragraph {
    return new Paragraph({
        border: { bottom: dividerBorder },
        spacing: { before: spaceBefore, after: spaceAfter },
    });
}

/**
 * Convert inline markdown bold (**text**) to rich TextRun array.
 */
function richRuns(text: string, baseSize = 22): TextRun[] {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map(part => {
        const isBold = /^\*\*.*\*\*$/.test(part);
        return new TextRun({ text: isBold ? part.slice(2, -2) : part, size: baseSize, bold: isBold, font: 'Times New Roman' });
    });
}

/**
 * Parse and convert content string into an array of Docx Paragraphs.
 * Mirrors LegalContentRenderer and pdf-driver.renderContent.
 */
function renderContent(content: string): Paragraph[] {
    const lines = content.split('\n');
    const paras: Paragraph[] = [];
    let numCounter = 1;

    lines.forEach(rawLine => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
            paras.push(new Paragraph({ children: [], spacing: { after: 60 } }));
            return;
        }
        const type = classifyLine(trimmed);
        const bare = stripPrefix(trimmed, type);
        if (type !== 'numbered') numCounter = 1;

        switch (type) {
            case 'heading':
                paras.push(new Paragraph({
                    children: [new TextRun({
                        text: bare.toUpperCase(),
                        bold: true, size: 22, font: 'Times New Roman',
                        allCaps: true,
                    })],
                    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } },
                    spacing: { before: 200, after: 80 },
                }));
                break;

            case 'bullet':
                paras.push(new Paragraph({
                    children: richRuns(bare, 22),
                    bullet: { level: 0 },
                    spacing: { after: 40, line: 276 },
                    indent: { left: 360, hanging: 180 },
                }));
                break;

            case 'numbered':
                paras.push(new Paragraph({
                    children: [
                        new TextRun({ text: `${numCounter++}.  `, bold: true, size: 22, font: 'Times New Roman' }),
                        ...richRuns(bare, 22),
                    ],
                    spacing: { after: 40, line: 276 },
                    indent: { left: 360, hanging: 220 },
                }));
                break;

            case 'risk':
                paras.push(new Paragraph({
                    children: [
                        new TextRun({ text: '⚠ RISK:  ', bold: true, size: 20, color: 'B45309', font: 'Times New Roman' }),
                        new TextRun({ text: bare, size: 20, color: '78350F', font: 'Times New Roman' }),
                    ],
                    shading: { type: ShadingType.SOLID, color: 'FEF3C7', fill: 'FEF3C7' },
                    border: { left: { style: BorderStyle.THICK, size: 12, color: 'D97706', space: 6 } },
                    spacing: { before: 120, after: 120, line: 276 },
                    indent: { left: 200 },
                }));
                break;

            default:
                paras.push(new Paragraph({
                    children: richRuns(trimmed, 22),
                    spacing: { after: 60, line: 276 },
                }));
        }
    });

    return paras;
}

// ─── Main Export Function ───────────────────────────────────────────────────
export const generateWord = async (data: CaseNoteExportData) => {
    const badges: string[] = [data.note.noteType.toUpperCase()];
    if (data.note.isPrivate) badges.push('PRIVATE — CONFIDENTIAL');
    if (data.note.isPinned) badges.push('PINNED');

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: 'Times New Roman', size: 24 },
                    paragraph: { spacing: { line: 276, after: 80 } },
                },
            },
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 900, right: 720, bottom: 900, left: 900 },
                    borders: {
                        top: pageBorder, bottom: pageBorder,
                        left: pageBorder, right: pageBorder,
                    } as any,
                },
            },

            // ── Header ────────────────────────────────────────────────────────
            headers: {
                default: new Header({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: 'IN THE COURT OF APPROPRIATE JURISDICTION', bold: true, size: 26, font: 'Times New Roman' })],
                            spacing: { after: 80 },
                        }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: `CASE NO: ${data.caseNumber}`, bold: true, size: 22, font: 'Times New Roman' })],
                            border: { bottom: dividerBorder },
                            spacing: { after: 120 },
                        }),
                    ],
                }),
            },

            // ── Footer ────────────────────────────────────────────────────────
            footers: {
                default: new Footer({
                    children: [
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
                            rows: [new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Ref: ${data.caseNumber}`, size: 16, font: 'Times New Roman', color: '666666' })] })] }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [
                                                new TextRun({ text: 'Page ', size: 16, font: 'Times New Roman', color: '666666' }),
                                                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Times New Roman', color: '666666' }),
                                                new TextRun({ text: ' of ', size: 16, font: 'Times New Roman', color: '666666' }),
                                                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Times New Roman', color: '666666' }),
                                            ]
                                        })]
                                    }),
                                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Generated via LawGPT Platform', size: 16, font: 'Times New Roman', color: '666666' })] })] }),
                                ]
                            })],
                        }),
                    ],
                }),
            },

            // ── Body ──────────────────────────────────────────────────────────
            children: [
                // ── Parties Block ─────────────────────────────────────────────
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'BETWEEN:', bold: true, size: 24, font: 'Times New Roman' })] })] }),
                                new TableCell({ children: [] }),
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.caseParties.petitioner, size: 24, font: 'Times New Roman' })] })] }),
                                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '... PLAINTIFF / PETITIONER', bold: true, size: 24, font: 'Times New Roman' })] })] }),
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [] }),
                                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'AND', bold: true, size: 24, font: 'Times New Roman' })] })] }),
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.caseParties.respondent, size: 24, font: 'Times New Roman' })] })] }),
                                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '... DEFENDANT / RESPONDENT', bold: true, size: 24, font: 'Times New Roman' })] })] }),
                            ]
                        }),
                    ],
                }),

                divider(160, 160),

                // ── Document Title ────────────────────────────────────────────
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: data.note.title.toUpperCase(), bold: true, size: 32, font: 'Times New Roman' })],
                    spacing: { after: 80 },
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: badges.join('  |  '), size: 18, font: 'Times New Roman', color: '555555' })],
                    spacing: { after: 60 },
                }),

                divider(100, 120),

                // ── Metadata Grid (Table) ──────────────────────────────────────
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
                    rows: [
                        ...([
                            ['Author', data.note.authorName, 'Recorded', data.note.createdDateTime],
                            ...(data.hearing ? [['Hearing', `${data.hearing.date} — ${data.hearing.stage}`, 'Court', data.hearing.court]] : []),
                            ...(data.parentNoteTitle ? [['In Reply To', data.parentNoteTitle, '', '']] : []),
                        ] as string[][]).map(([lLbl, lVal, rLbl, rVal]) =>
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [
                                                new TextRun({ text: `${lLbl}: `, bold: true, size: 20, font: 'Times New Roman' }),
                                                new TextRun({ text: lVal, size: 20, font: 'Times New Roman' }),
                                            ], spacing: { after: 40 }
                                        })]
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            alignment: AlignmentType.RIGHT, children: rLbl ? [
                                                new TextRun({ text: `${rLbl}: `, bold: true, size: 20, font: 'Times New Roman' }),
                                                new TextRun({ text: rVal, size: 20, font: 'Times New Roman' }),
                                            ] : [], spacing: { after: 40 }
                                        })]
                                    }),
                                ]
                            }),
                        ),
                    ],
                }),

                divider(120, 160),

                // ── Note Body (structured) ────────────────────────────────────
                ...renderContent(data.note.content),

                // ── Evidence Tags ──────────────────────────────────────────────
                ...(data.note.evidenceTags && data.note.evidenceTags.length > 0 ? [
                    divider(120, 100),
                    new Paragraph({
                        children: [new TextRun({ text: 'EVIDENCE TAGS', bold: true, size: 22, allCaps: true, font: 'Times New Roman' })],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } },
                        spacing: { before: 120, after: 80 },
                    }),
                    ...data.note.evidenceTags.map(tag => new Paragraph({
                        children: [new TextRun({ text: tag, size: 22, font: 'Times New Roman' })],
                        bullet: { level: 0 },
                        spacing: { after: 40 },
                        indent: { left: 360, hanging: 180 },
                    })),
                ] : []),

                // ── Discussion & Replies ───────────────────────────────────────
                ...(data.replies && data.replies.length > 0 ? [
                    divider(120, 100),
                    new Paragraph({
                        children: [new TextRun({ text: 'DISCUSSION & REPLIES', bold: true, size: 22, allCaps: true, font: 'Times New Roman' })],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } },
                        spacing: { before: 120, after: 80 },
                    }),
                    ...data.replies.flatMap((reply, i) => [
                        new Paragraph({
                            children: [
                                new TextRun({ text: `Reply ${i + 1} — ${reply.authorName}`, bold: true, size: 20, font: 'Times New Roman' }),
                                new TextRun({ text: `    ${reply.createdDateTime}`, size: 18, font: 'Times New Roman', color: '666666' }),
                            ],
                            spacing: { before: 120, after: 60 },
                        }),
                        ...renderContent(reply.content),
                    ]),
                ] : []),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${data.note.title.replace(/\s+/g, '_')}_Export.docx`);
};
