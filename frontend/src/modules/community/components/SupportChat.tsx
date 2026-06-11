import { logger } from '@/lib/logger';
import React, { useState } from 'react';
import { SupportTicket } from '../services/communityApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ShieldCheck, Ticket, Activity, User } from 'lucide-react';

interface SupportChatProps {
  tickets: SupportTicket[];
  onCreateTicket: (data: { category: string; priority: string; title: string; description: string }) => Promise<void>;
  onSelectTicket: (ticket: SupportTicket) => void;
  loading?: boolean;
}

export const SupportChat: React.FC<SupportChatProps> = ({
  tickets,
  onCreateTicket,
  onSelectTicket,
  loading = false,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('technical');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      await onCreateTicket({ category, priority, title, description });
      setShowCreateForm(false);
      setTitle('');
      setDescription('');
    } catch (err) {
      logger.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent': return <Badge className="bg-red-600 text-[8px] uppercase tracking-wider h-3.5">Urgent</Badge>;
      case 'high': return <Badge className="bg-amber-600 text-[8px] uppercase tracking-wider h-3.5">High</Badge>;
      case 'medium': return <Badge className="bg-blue-600 text-[8px] uppercase tracking-wider h-3.5">Medium</Badge>;
      default: return <Badge className="bg-zinc-500 text-[8px] uppercase tracking-wider h-3.5">Low</Badge>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'resolved': return <Badge variant="outline" className="border-emerald-600 text-emerald-600 text-[8px] h-3.5 font-extrabold uppercase">Resolved</Badge>;
      case 'closed': return <Badge variant="outline" className="border-zinc-500 text-zinc-500 text-[8px] h-3.5 font-extrabold uppercase">Closed</Badge>;
      case 'investigating': return <Badge variant="outline" className="border-indigo-600 text-indigo-600 text-[8px] h-3.5 font-extrabold uppercase animate-pulse">Investigating</Badge>;
      default: return <Badge variant="outline" className="border-amber-600 text-amber-600 text-[8px] h-3.5 font-extrabold uppercase">Open</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold tracking-wide uppercase flex items-center gap-1.5">
            <Ticket className="h-4.5 w-4.5 text-primary" /> Support Desk
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Submit a query to assign a lawyer or technical admin.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="h-8 text-xs font-bold flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          {showCreateForm ? 'View Tickets' : 'New Ticket'}
        </Button>
      </div>

      {/* Ticket Create Form */}
      {showCreateForm ? (
        <Card className="border bg-card/60 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Describe Your Issue</CardTitle>
            <CardDescription className="text-[10px]">Please specify accurate details for faster routing.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-8.5 text-xs">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="legal" className="text-xs">Legal Inquiry</SelectItem>
                      <SelectItem value="billing" className="text-xs">Payments & Billing</SelectItem>
                      <SelectItem value="technical" className="text-xs">Technical Issue</SelectItem>
                      <SelectItem value="feature_request" className="text-xs">Suggestions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Priority</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-8.5 text-xs">
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low" className="text-xs">Low</SelectItem>
                      <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                      <SelectItem value="high" className="text-xs">High</SelectItem>
                      <SelectItem value="urgent" className="text-xs">Urgent (Immediate attention)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Title</label>
                <Input
                  placeholder="e.g. Issue generating GST Invoice"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-8.5 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Description</label>
                <Textarea
                  placeholder="Describe your query in detail..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="text-xs"
                  required
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full h-9 text-xs font-bold mt-2">
                {submitting ? 'Submitting...' : 'Submit Support Ticket'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Tickets List Board */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tickets.map(ticket => (
            <Card
              key={ticket._id}
              onClick={() => onSelectTicket(ticket)}
              className="hover:border-primary/50 cursor-pointer transition-all duration-300 border bg-card/60 backdrop-blur-md hover:shadow-md flex flex-col justify-between"
            >
              <CardHeader className="p-3 pb-1">
                <div className="flex items-center justify-between mb-1.5">
                  <Badge variant="outline" className="text-[8px] h-3.5 tracking-wider uppercase font-bold bg-primary/5">
                    {ticket.category.replace('_', ' ')}
                  </Badge>
                  <div className="flex gap-1">
                    {getPriorityBadge(ticket.priority)}
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>
                <CardTitle className="text-xs font-bold leading-snug line-clamp-1">{ticket.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground border-t pt-2 mt-2">
                  <Activity className="h-3 w-3 text-indigo-400" />
                  <span>Ticket Ref: #{ticket._id.substring(ticket._id.length - 8).toUpperCase()}</span>
                  <span className="ml-auto font-mono">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {tickets.length === 0 && !loading && (
            <div className="col-span-full py-16 text-center text-xs text-muted-foreground italic bg-muted/20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2">
              <Ticket className="h-8 w-8 text-zinc-400" />
              <span>No support tickets filed yet.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportChat;
