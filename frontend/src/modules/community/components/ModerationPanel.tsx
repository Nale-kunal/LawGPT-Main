import { logger } from '@/lib/logger';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, Trash2, CheckCircle2, UserX, AlertTriangle, Activity } from 'lucide-react';

interface ReportLog {
  _id: string;
  reporterId: { _id: string; name: string };
  targetUserId: { _id: string; name: string };
  messageId?: { _id: string; content: string };
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

interface ModerationPanelProps {
  reports: ReportLog[];
  onResolveReport: (id: string, action: 'dismiss' | 'delete' | 'ban') => Promise<void>;
  loading?: boolean;
}

export const ModerationPanel: React.FC<ModerationPanelProps> = ({
  reports,
  onResolveReport,
  loading = false,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'dismiss' | 'delete' | 'ban') => {
    setProcessingId(id);
    try {
      await onResolveReport(id, action);
    } catch (err) {
      logger.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'resolved':
        return <Badge className="bg-emerald-600 text-[8px] uppercase tracking-wider h-3.5">Resolved</Badge>;
      case 'dismissed':
        return <Badge className="bg-zinc-500 text-[8px] uppercase tracking-wider h-3.5">Dismissed</Badge>;
      default:
        return <Badge className="bg-amber-600 text-[8px] uppercase tracking-wider h-3.5 animate-pulse">Pending</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      {/* Header section */}
      <div>
        <h2 className="text-sm font-extrabold tracking-wide uppercase flex items-center gap-1.5 text-destructive">
          <Shield className="h-4.5 w-4.5" /> Mod Hub
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Review flagged messages, process member reports, and issue warnings or bans.
        </p>
      </div>

      {/* Analytics stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card/40 border">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Flagged Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-extrabold text-foreground font-mono">
              {reports.filter(r => r.status === 'pending').length}
            </div>
            <span className="text-[8px] text-muted-foreground">Awaiting review</span>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Cleared Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-extrabold text-foreground font-mono">
              {reports.filter(r => r.status !== 'pending').length}
            </div>
            <span className="text-[8px] text-muted-foreground">Successfully resolved</span>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-indigo-500" /> Active System
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-extrabold text-foreground font-mono">100%</div>
            <span className="text-[8px] text-muted-foreground">Auto filter operational</span>
          </CardContent>
        </Card>
      </div>

      {/* Reports Board */}
      <div className="space-y-3 mt-2">
        {reports.map(rep => {
          const isPending = rep.status === 'pending';
          const isProcessing = processingId === rep._id;

          return (
            <Card key={rep._id} className="border bg-card/60 backdrop-blur-md relative hover:shadow-sm transition-all duration-300">
              <CardHeader className="p-3 pb-1">
                <div className="flex items-center justify-between mb-1.5">
                  <Badge variant="outline" className="text-[8px] h-3.5 tracking-wider uppercase font-bold bg-primary/5">
                    Ref ID: #{rep._id.substring(rep._id.length - 8).toUpperCase()}
                  </Badge>
                  {getStatusBadge(rep.status)}
                </div>
                <CardTitle className="text-xs font-bold flex flex-col gap-0.5">
                  <span>Reporter: {rep.reporterId?.name || 'Anonymous'}</span>
                  <span className="text-destructive font-medium">Flagged member: {rep.targetUserId?.name || 'Unknown'}</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-3 pt-1 space-y-3">
                {/* Violated Reason */}
                <div className="p-2 bg-muted/40 rounded text-[10px] leading-relaxed text-foreground flex items-start gap-1.5 border-l-2 border-amber-500">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-extrabold block mb-0.5 text-amber-500">Filing Reason:</span>
                    {rep.reason}
                  </div>
                </div>

                {/* Message snippet context */}
                {rep.messageId && (
                  <div className="p-2 bg-zinc-950/5 border border-dashed rounded text-[10px] italic leading-relaxed text-muted-foreground">
                    <span className="font-extrabold block text-foreground not-italic mb-1">Message Context:</span>
                    "{rep.messageId.content}"
                  </div>
                )}

                {/* Actions row */}
                {isPending && (
                  <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(rep._id, 'dismiss')}
                      disabled={isProcessing}
                      className="h-7 text-[10px] font-bold"
                    >
                      Dismiss Report
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(rep._id, 'delete')}
                      disabled={isProcessing}
                      className="h-7 text-[10px] font-bold flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Remove Content
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(rep._id, 'ban')}
                      disabled={isProcessing}
                      className="h-7 text-[10px] font-bold flex items-center gap-1 bg-red-600 hover:bg-red-700"
                    >
                      <UserX className="h-3 w-3" /> Ban Member
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {reports.length === 0 && !loading && (
          <div className="py-16 text-center text-xs text-muted-foreground italic bg-muted/20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-zinc-400" />
            <span>Moderation queue is clean. Good job!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModerationPanel;
