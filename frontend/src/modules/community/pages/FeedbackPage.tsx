import { logger } from '@/lib/logger';
import React, { useState, useEffect } from 'react';
import FeedbackSubmit from '../components/FeedbackSubmit';
import communityApi, { FeedbackItem } from '../services/communityApi';
import { useToast } from '@/hooks/use-toast';

export const FeedbackPage: React.FC = () => {
  const [proposals, setProposals] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const data = await communityApi.getFeedback();
      setProposals(data || []);
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleSubmitProposal = async (data: { category: string; title: string; content: string; isPublic: boolean }) => {
    try {
      await communityApi.submitFeedback(data);
      toast({
        title: 'Proposal Submitted',
        description: 'Thank you! Your feature suggestion has been published to the board.',
      });
      fetchProposals();
    } catch (err) {
      logger.error(err);
    }
  };

  const handleVote = async (id: string, direction: 'up' | 'down') => {
    try {
      await communityApi.voteFeedback(id, direction);
      fetchProposals();
    } catch (err) {
      logger.error(err);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto p-4 md:p-6">
      <FeedbackSubmit
        feedbackList={proposals}
        onSubmitFeedback={handleSubmitProposal}
        onVote={handleVote}
        loading={loading}
      />
    </div>
  );
};

export default FeedbackPage;
