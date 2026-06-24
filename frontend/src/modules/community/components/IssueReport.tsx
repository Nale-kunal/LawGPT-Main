import { logger } from '@/lib/logger';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert } from 'lucide-react';

// Must match backend REPORT_CATEGORIES enum in CommunityReport.js
const REPORT_CATEGORIES = [
  { value: 'spam',             label: 'Spam or Abuse' },
  { value: 'harassment',       label: 'Harassment or Threat' },
  { value: 'hate_speech',      label: 'Hate Speech or Discrimination' },
  { value: 'misinformation',   label: 'Misinformation' },
  { value: 'confidential_data', label: 'Confidential Client Information' },
  { value: 'copyright',        label: 'Copyright / IP Violation' },
  { value: 'impersonation',    label: 'Impersonation' },
  { value: 'self_harm',        label: 'Self-Harm or Crisis Content' },
  { value: 'other',            label: 'Other Violation' },
] as const;

type ReportCategory = typeof REPORT_CATEGORIES[number]['value'];

interface IssueReportProps {
  /** Called with (category, detail) — matches backend validation */
  onSubmit: (category: ReportCategory, detail: string) => Promise<void>;
  targetType: 'message' | 'user';
  targetId: string;
  onClose: () => void;
}

export const IssueReport: React.FC<IssueReportProps> = ({
  onSubmit,
  targetType,
  onClose,
}) => {
  const [category, setCategory] = useState<ReportCategory>('spam');
  const [detail, setDetail]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleReport = async () => {
    // Client-side guard — category is always set; detail is optional
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(category, detail.trim().slice(0, 500));
      onClose();
    } catch (err) {
      logger.error(err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-1.5 text-destructive text-sm font-extrabold tracking-wide uppercase">
          <ShieldAlert className="h-5 w-5" /> Report {targetType === 'message' ? 'Message' : 'User'}
        </DialogTitle>
        <DialogDescription className="text-xs">
          Help keep Juriq Community safe. Reports are reviewed by the moderation team and are anonymous to other users.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
            Reason <span className="text-destructive">*</span>
          </label>
          <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value} className="text-xs">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
            Additional Context <span className="text-muted-foreground/60 font-normal">(optional)</span>
          </label>
          <Textarea
            placeholder="Provide relevant context, e.g. specific message content or behaviour..."
            value={detail}
            onChange={e => setDetail(e.target.value.slice(0, 500))}
            rows={3}
            className="text-xs resize-none"
          />
          <p className="text-[10px] text-muted-foreground/60 text-right">{detail.length}/500</p>
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      <DialogFooter className="mt-4">
        <Button variant="outline" size="sm" onClick={onClose} disabled={submitting} className="h-8 text-xs font-bold">
          Cancel
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleReport}
          disabled={submitting}
          className="h-8 text-xs font-bold"
        >
          {submitting ? 'Submitting...' : 'File Report'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default IssueReport;
