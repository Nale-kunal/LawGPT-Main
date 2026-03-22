import { jsPDF } from 'jspdf';
import { CaseNoteExportData } from './types';

// ─── Content Type Detection (mirrors LegalContentRenderer) ─────────────────
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

// ─── PDFRenderer ───────────────────────────────────────────────────────────
class PDFRenderer {
    doc: jsPDF;
    pageWidth: number;
    pageHeight: number;
    currentY: number;
    ptToMm = 0.352778;

    margin = {
        top: 72 * 0.352778,
        bottom: 60 * 0.352778,
        left: 48 * 0.352778,
        right: 48 * 0.352778
    };

    constructor(doc: jsPDF) {
        this.doc = doc;
        this.pageWidth = doc.internal.pageSize.getWidth();
        this.pageHeight = doc.internal.pageSize.getHeight();
        this.currentY = this.margin.top;
    }

    toMm(pt: number) { return pt * this.ptToMm; }

    contentWidth() { return this.pageWidth - this.margin.left - this.margin.right; }

    drawBorder() {
        const o = this.toMm(20);
        this.doc.setDrawColor(0);
        this.doc.setLineWidth(0.5);
        this.doc.rect(o, o, this.pageWidth - o * 2, this.pageHeight - o * 2);
    }

    ensureSpace(h: number): boolean {
        if (this.currentY + h > this.pageHeight - this.margin.bottom) {
            this.doc.addPage();
            this.drawBorder();
            this.currentY = this.margin.top;
            return true;
        }
        return false;
    }

    lineH(fontSize: number, leading = 1.3) { return fontSize * this.ptToMm * leading; }

    moveDown(units = 1, fontSize = 12) {
        this.currentY += this.toMm(fontSize * units);
    }

    divider(spaceBeforeMm = 2, spaceAfterMm = 2) {
        this.currentY += spaceBeforeMm;
        this.ensureSpace(1);
        this.doc.setDrawColor(100);
        this.doc.setLineWidth(0.2);
        this.doc.line(this.margin.left, this.currentY, this.pageWidth - this.margin.right, this.currentY);
        this.currentY += spaceAfterMm;
    }

    text(text: string, x: number, align: 'left' | 'center' | 'right' = 'left') {
        this.doc.text(text, x, this.currentY, { align });
    }

    paragraph(text: string, opts: { bold?: boolean; fontSize?: number; align?: 'left' | 'center' | 'right'; leading?: number } = {}) {
        const { bold = false, fontSize = 12, align = 'left', leading = 1.3 } = opts;
        this.doc.setFontSize(fontSize);
        this.doc.setFont('times', bold ? 'bold' : 'normal');
        const lines = this.doc.splitTextToSize(text, this.contentWidth());
        const lh = this.lineH(fontSize, leading);
        lines.forEach((line: string) => {
            this.ensureSpace(lh);
            const x = align === 'center' ? this.pageWidth / 2 : align === 'right' ? this.pageWidth - this.margin.right : this.margin.left;
            this.doc.text(line, x, this.currentY, { align });
            this.currentY += lh;
        });
    }

    sectionHeading(text: string) {
        this.currentY += this.toMm(8); // spacing before
        this.ensureSpace(this.toMm(18));
        this.doc.setFontSize(11);
        this.doc.setFont('times', 'bold');
        const label = text.toUpperCase().replace(/:$/, '');
        this.doc.text(label, this.margin.left, this.currentY);
        this.currentY += this.lineH(11, 1.2);
        // underline
        this.doc.setDrawColor(150);
        this.doc.setLineWidth(0.15);
        this.doc.line(this.margin.left, this.currentY, this.pageWidth - this.margin.right, this.currentY);
        this.currentY += this.toMm(3);
    }

    bulletItem(text: string) {
        this.doc.setFontSize(12);
        this.doc.setFont('times', 'normal');
        const indent = this.toMm(14);
        const bulletX = this.margin.left + this.toMm(4);
        const textX = this.margin.left + indent;
        const textWidth = this.contentWidth() - indent;
        const lines = this.doc.splitTextToSize(text, textWidth);
        const lh = this.lineH(12, 1.25);
        this.ensureSpace(lh * lines.length);
        this.doc.text('\u2022', bulletX, this.currentY);
        lines.forEach((line: string, i: number) => {
            this.doc.text(line, textX, this.currentY);
            if (i < lines.length - 1) this.currentY += lh;
        });
        this.currentY += lh + this.toMm(1);
    }

    numberedItem(text: string, num: number) {
        this.doc.setFontSize(12);
        this.doc.setFont('times', 'normal');
        const indent = this.toMm(16);
        const numX = this.margin.left;
        const textX = this.margin.left + indent;
        const textWidth = this.contentWidth() - indent;
        const lines = this.doc.splitTextToSize(text, textWidth);
        const lh = this.lineH(12, 1.25);
        this.ensureSpace(lh * lines.length);
        this.doc.setFont('times', 'bold');
        this.doc.text(`${num}.`, numX, this.currentY);
        this.doc.setFont('times', 'normal');
        lines.forEach((line: string, i: number) => {
            this.doc.text(line, textX, this.currentY);
            if (i < lines.length - 1) this.currentY += lh;
        });
        this.currentY += lh + this.toMm(1);
    }

    riskFlag(text: string) {
        this.currentY += this.toMm(3);
        this.doc.setFontSize(11);
        this.doc.setFont('times', 'bold');
        const lines = this.doc.splitTextToSize(`⚠ RISK: ${text}`, this.contentWidth() - this.toMm(8));
        const lh = this.lineH(11, 1.3);
        const boxH = lines.length * lh + this.toMm(4);
        this.ensureSpace(boxH);
        // amber left bar
        this.doc.setFillColor(245, 158, 11);
        this.doc.rect(this.margin.left, this.currentY - this.toMm(3), 1.2, boxH, 'F');
        this.doc.setTextColor(160, 100, 0);
        lines.forEach((line: string) => {
            this.doc.text(line, this.margin.left + this.toMm(6), this.currentY);
            this.currentY += lh;
        });
        this.doc.setTextColor(0);
        this.currentY += this.toMm(3);
    }

    /** Parse and render structured content — mirrors LegalContentRenderer */
    renderContent(content: string) {
        this.doc.setTextColor(0);
        const lines = content.split('\n');
        let numberedCounter = 1;
        let lastType: LineType = 'body';

        lines.forEach(rawLine => {
            const trimmed = rawLine.trim();
            if (!trimmed) {
                if (lastType !== 'heading') this.currentY += this.toMm(2); // blank line spacer
                return;
            }
            const type = classifyLine(trimmed);
            const bare = stripPrefix(trimmed, type);

            if (type !== 'numbered') numberedCounter = 1;

            switch (type) {
                case 'heading':
                    this.sectionHeading(bare);
                    break;
                case 'bullet':
                    this.bulletItem(bare);
                    break;
                case 'numbered':
                    this.numberedItem(bare, numberedCounter++);
                    break;
                case 'risk':
                    this.riskFlag(bare);
                    break;
                default:
                    this.paragraph(trimmed, { fontSize: 12, leading: 1.3 });
                    this.currentY += this.toMm(1); // small gap between body paras
            }
            lastType = type;
        });
    }

    metaRow(label: string, value: string) {
        this.doc.setFontSize(10);
        this.doc.setFont('times', 'bold');
        this.doc.text(`${label}:`, this.margin.left, this.currentY);
        this.doc.setFont('times', 'normal');
        this.doc.text(value, this.margin.left + this.toMm(30), this.currentY);
        this.currentY += this.lineH(10, 1.4);
    }
}

// ─── Main Export Function ───────────────────────────────────────────────────
export const generatePDF = async (data: CaseNoteExportData) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const r = new PDFRenderer(doc);
    const lx = r.margin.left;
    const cx = r.pageWidth / 2;
    const rx = r.pageWidth - r.margin.right;

    r.drawBorder();

    // ── 1. Court Header ───────────────────────────────────────────────────────
    r.paragraph('IN THE COURT OF APPROPRIATE JURISDICTION', { align: 'center', bold: true, fontSize: 14 });
    r.paragraph(`CASE NO: ${data.caseNumber}`, { align: 'center', fontSize: 12 });
    r.divider(2, 4);

    // ── 2. Parties Block ──────────────────────────────────────────────────────
    r.paragraph('BETWEEN:', { bold: true, fontSize: 12 });
    r.currentY += r.toMm(2);

    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text(data.caseParties.petitioner, lx, r.currentY);
    doc.text('... PLAINTIFF / PETITIONER', rx, r.currentY, { align: 'right' });
    r.currentY += r.lineH(12, 1.4);

    r.paragraph('AND', { align: 'center', bold: true, fontSize: 12 });

    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text(data.caseParties.respondent, lx, r.currentY);
    doc.text('... DEFENDANT / RESPONDENT', rx, r.currentY, { align: 'right' });
    r.currentY += r.lineH(12, 1.4);

    r.divider(3, 4);

    // ── 3. Document Title ─────────────────────────────────────────────────────
    r.paragraph(data.note.title.toUpperCase(), { align: 'center', bold: true, fontSize: 15 });

    // Type + Privacy/Pin badges (text-based)
    const badges: string[] = [data.note.noteType.toUpperCase()];
    if (data.note.isPrivate) badges.push('PRIVATE — CONFIDENTIAL');
    if (data.note.isPinned) badges.push('PINNED');
    r.paragraph(badges.join('  |  '), { align: 'center', fontSize: 9 });

    r.divider(3, 4);

    // ── 4. Metadata Grid ──────────────────────────────────────────────────────
    const leftColX = lx;
    const rightColX = cx + r.toMm(5);
    const metaFontSize = 10;
    const metaLH = r.lineH(metaFontSize, 1.4);
    const metaRows: [string, string, string, string][] = [
        ['Author', data.note.authorName, 'Recorded', data.note.createdDateTime],
        ...(data.hearing ? [['Hearing', `${data.hearing.date} — ${data.hearing.stage}`, 'Court', data.hearing.court] as [string, string, string, string]] : []),
        ...(data.parentNoteTitle ? [['In Reply To', data.parentNoteTitle, '', ''] as [string, string, string, string]] : []),
    ];

    metaRows.forEach(([lLabel, lVal, rLabel, rVal]) => {
        r.ensureSpace(metaLH);
        doc.setFontSize(metaFontSize);
        doc.setFont('times', 'bold'); doc.text(`${lLabel}:`, leftColX, r.currentY);
        doc.setFont('times', 'normal'); doc.text(lVal, leftColX + r.toMm(22), r.currentY);
        if (rLabel) {
            doc.setFont('times', 'bold'); doc.text(`${rLabel}:`, rightColX, r.currentY);
            doc.setFont('times', 'normal'); doc.text(rVal, rightColX + r.toMm(18), r.currentY);
        }
        r.currentY += metaLH;
    });

    r.divider(3, 5);

    // ── 5. Note Body (structured) ─────────────────────────────────────────────
    r.renderContent(data.note.content);

    // ── 6. Evidence Tags ──────────────────────────────────────────────────────
    if (data.note.evidenceTags && data.note.evidenceTags.length > 0) {
        r.divider(3, 4);
        r.sectionHeading('Evidence Tags');
        data.note.evidenceTags.forEach(tag => r.bulletItem(tag));
    }

    // ── 7. Discussion / Replies ───────────────────────────────────────────────
    if (data.replies && data.replies.length > 0) {
        r.divider(3, 4);
        r.sectionHeading('Discussion & Replies');
        data.replies.forEach((reply, i) => {
            r.currentY += r.toMm(3);
            r.ensureSpace(r.toMm(24));
            doc.setFontSize(10);
            doc.setFont('times', 'bold');
            doc.text(`Reply ${i + 1} — ${reply.authorName}`, lx, r.currentY);
            doc.setFont('times', 'normal');
            doc.text(reply.createdDateTime, rx, r.currentY, { align: 'right' });
            r.currentY += r.lineH(10, 1.3);
            r.renderContent(reply.content);
        });
    }

    // ── 8. Footer on every page ───────────────────────────────────────────────
    const total = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        const fy = r.pageHeight - r.toMm(28);
        doc.setDrawColor(100); doc.setLineWidth(0.18);
        doc.line(r.margin.left, fy - r.toMm(2), rx, fy - r.toMm(2));
        doc.setFontSize(9); doc.setFont('times', 'normal'); doc.setTextColor(100);
        doc.text(`Ref: ${data.caseNumber}`, r.margin.left, fy);
        doc.text(`Page ${i} of ${total}`, cx, fy, { align: 'center' });
        doc.text('Generated via Juriq Platform', rx, fy, { align: 'right' });
        doc.setTextColor(0);
    }

    doc.save(`${data.note.title.replace(/\s+/g, '_')}_Export.pdf`);
};
