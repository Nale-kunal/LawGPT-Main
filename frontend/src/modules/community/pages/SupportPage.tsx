import { logger } from '@/lib/logger';
import React, { useState, useEffect } from 'react';
import SupportChat from '../components/SupportChat';
import { useCommunity } from '../contexts/CommunityContext';
import communityApi, { SupportTicket, Conversation } from '../services/communityApi';
import { useToast } from '@/hooks/use-toast';

export const SupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const { setActiveConversation } = useCommunity();
  const { toast } = useToast();

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await communityApi.getTickets();
      setTickets(data || []);
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (data: { category: string; priority: string; title: string; description: string }) => {
    try {
      await communityApi.createTicket(data);
      toast({
        title: 'Ticket Submitted',
        description: 'Your support ticket has been filed and routed to the queue.',
      });
      fetchTickets();
    } catch (err) {
      logger.error(err);
      toast({
        title: 'Error',
        description: 'Failed to file ticket. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSelectTicket = (ticket: SupportTicket) => {
    // A ticket holds a populated or string conversationId
    const conv = ticket.conversationId as unknown as Conversation;
    if (conv && conv._id) {
      setActiveConversation(conv);
      // Route user to the community chat page to start messaging
      toast({
        title: 'Opening Secure Chat',
        description: `Direct support line for ticket #${ticket._id.substring(ticket._id.length - 8).toUpperCase()}`,
      });
      // Redirect using window context or just active state selection
      window.location.replace(`/dashboard/community?convId=${conv._id}`);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto p-4 md:p-6">
      <SupportChat
        tickets={tickets}
        onCreateTicket={handleCreateTicket}
        onSelectTicket={handleSelectTicket}
        loading={loading}
      />
    </div>
  );
};

export default SupportPage;
