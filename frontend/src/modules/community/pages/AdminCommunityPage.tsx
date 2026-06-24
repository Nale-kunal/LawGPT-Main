import { logger } from '@/lib/logger';
import React, { useState, useEffect } from 'react';
import ModerationPanel from '../components/ModerationPanel';
import communityApi from '../services/communityApi';
import { useToast } from '@/hooks/use-toast';

export const AdminCommunityPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await communityApi.getAdminReports();
      setReports(res.reports || []);
    } catch (err) {
      logger.error(err);
      toast({
        title: 'Error',
        description: 'Failed to fetch the moderation queue.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleResolveReport = async (id: string, action: 'dismiss' | 'delete' | 'ban') => {
    const report = reports.find(r => r._id === id);
    if (!report) return;

    try {
      if (action === 'dismiss') {
        await communityApi.resolveReport(id, 'dismissed', 'Dismissed by administrator');
        toast({
          title: 'Report Dismissed',
          description: 'The report has been successfully dismissed.',
        });
      } else if (action === 'delete') {
        if (report.targetMessageId?._id) {
          await communityApi.resolveFlaggedMessage(report.targetMessageId._id, 'delete', 'Removed by admin via reports queue');
        }
        await communityApi.resolveReport(id, 'actioned', 'Content removed by administrator');
        toast({
          title: 'Content Removed',
          description: 'The message has been removed and the report is marked as actioned.',
        });
      } else if (action === 'ban') {
        const targetUserId = report.targetUserId?._id || 
          (typeof report.targetMessageId?.senderId === 'object' ? report.targetMessageId.senderId?._id : report.targetMessageId?.senderId);
        
        if (targetUserId) {
          await communityApi.banUser(targetUserId, 'Permanent ban due to severe community guideline violations');
        }
        await communityApi.resolveReport(id, 'actioned', 'User banned by administrator');
        toast({
          title: 'User Banned',
          description: 'The user has been banned and the report is marked as actioned.',
        });
      }

      await fetchReports();
    } catch (err) {
      logger.error(err);
      toast({
        title: 'Action Failed',
        description: 'An error occurred while resolving the report.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto p-4 md:p-6">
      <ModerationPanel
        reports={reports}
        onResolveReport={handleResolveReport}
        loading={loading}
      />
    </div>
  );
};

export default AdminCommunityPage;
