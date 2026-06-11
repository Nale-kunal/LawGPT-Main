import { logger } from '@/lib/logger';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert } from 'lucide-react';

interface IssueReportProps {
  onSubmit: (reason: string) => Promise<void>;
  targetType: 'message' | 'user';
  targetId: string;
  onClose: () => void;
}

export const IssueReport: React.FC<IssueReportProps> = ({
  onSubmit,
  targetType,
  targetId,
  onClose,
}) => {
  const [reasonCategory, setReasonCategory] = useState('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReport = async () => {
    setSubmitting(true);
    try {
      const fullReason = `[${reasonCategory.toUpperCase()}] ${details.trim()}`;
      await onSubmit(fullReason);
      onClose();
    } catch (err) {
      logger.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-1.5 text-destructive text-sm font-extrabold tracking-wide uppercase">
          <ShieldAlert className="h-5 w-5" /> Report Violation
        </DialogTitle>
        <DialogDescription className="text-xs">
          Help keep Juriq Community safe. Reports are analyzed by the moderation team.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Reason Category</label>
          <Select value={reasonCategory} onValueChange={setReasonCategory}>
            <SelectTrigger className="h-8.5 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spam" className="text-xs">Spam or Abuse</SelectItem>
              <SelectItem value="harassment" className="text-xs">Harassment or Threat</SelectItem>
              <SelectItem value="hate_speech" className="text-xs">Hate Speech</SelectItem>
              <SelectItem value="confidentiality" className="text-xs">Confidentiality Violation</SelectItem>
              <SelectItem value="other" className="text-xs">Other Violations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Additional Context</label>
          <Textarea
            placeholder="Provide relevant context, messages, or timing..."
            value={details}
            onChange={e => setDetails(e.target.value)}
            rows={4}
            className="text-xs"
            required
          />
        </div>
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
