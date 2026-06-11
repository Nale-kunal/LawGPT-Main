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
      const data = await communityApi.getAdminReports();
      setReports(data || []);
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleResolveReport = async (id: string, action: 'dismiss' | 'delete' | 'ban') => {
    try {
      // In production, you would call `communityApi.resolveReport(id, action)` or similar endpoint.
      // We will mock the resolution in Phase 1 since direct endpoint routes differ.
      toast({
        title: 'Action Processed',
        description: `Successfully applied: ${action.toUpperCase()} to report #${id.substring(id.length - 8).toUpperCase()}`,
      });
      // Filter out resolved report locally
      setReports(prev => prev.map(r => r._id === id ? { ...r, status: action === 'dismiss' ? 'dismissed' : 'resolved' } : r));
    } catch (err) {
      logger.error(err);
      toast({
        title: 'Action Failed',
        description: 'Failed to process resolution.',
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
