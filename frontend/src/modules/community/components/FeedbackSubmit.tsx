import { logger } from '@/lib/logger';
import React, { useState } from 'react';
import { FeedbackItem } from '../services/communityApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThumbsUp, ThumbsDown, MessageCircle, Lightbulb, User } from 'lucide-react';

interface FeedbackSubmitProps {
  feedbackList: FeedbackItem[];
  onSubmitFeedback: (data: { category: string; title: string; content: string; isPublic: boolean }) => Promise<void>;
  onVote: (id: string, direction: 'up' | 'down') => Promise<void>;
  loading?: boolean;
}

export const FeedbackSubmit: React.FC<FeedbackSubmitProps> = ({
  feedbackList,
  onSubmitFeedback,
  onVote,
  loading = false,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ui_ux');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      await onSubmitFeedback({ category, title, content, isPublic });
      setShowForm(false);
      setTitle('');
      setContent('');
    } catch (err) {
      logger.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'implemented':
        return <Badge className="bg-emerald-600 text-[8px] uppercase tracking-wider h-3.5 font-bold">Implemented</Badge>;
      case 'planned':
        return <Badge className="bg-indigo-600 text-[8px] uppercase tracking-wider h-3.5 font-bold">Planned</Badge>;
      case 'under_review':
        return <Badge className="bg-amber-600 text-[8px] uppercase tracking-wider h-3.5 font-bold">Under Review</Badge>;
      case 'declined':
        return <Badge className="bg-red-600 text-[8px] uppercase tracking-wider h-3.5 font-bold">Declined</Badge>;
      default:
        return <Badge className="bg-zinc-500 text-[8px] uppercase tracking-wider h-3.5 font-bold">Open</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold tracking-wide uppercase flex items-center gap-1.5">
            <Lightbulb className="h-4.5 w-4.5 text-primary" /> Feature Proposals
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Suggest new ideas, upvote other features, and track implementation.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="h-8 text-xs font-bold flex items-center gap-1"
        >
          {showForm ? 'View All Ideas' : 'Propose Feature'}
        </Button>
      </div>

      {showForm ? (
        /* Form Card */
        <Card className="border bg-card/60 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">What is your proposal?</CardTitle>
            <CardDescription className="text-[10px]">Provide details of the requested feature.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ui_ux" className="text-xs">UI/UX Improvements</SelectItem>
                    <SelectItem value="performance" className="text-xs">Performance & Speed</SelectItem>
                    <SelectItem value="ai" className="text-xs">AI & Case Search Features</SelectItem>
                    <SelectItem value="billing" className="text-xs">Invoices & Subscription</SelectItem>
                    <SelectItem value="security" className="text-xs">Security & Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Title</label>
                <Input
                  placeholder="e.g. Add dark mode to document editor"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-8.5 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Detail Description</label>
                <Textarea
                  placeholder="Explain why this feature is useful and how it should work..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={4}
                  className="text-xs"
                  required
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full h-9 text-xs font-bold mt-2">
                {submitting ? 'Submitting proposal...' : 'Submit Proposal'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Proposals Board */
        <div className="space-y-3">
          {feedbackList.map(item => (
            <Card key={item._id} className="border bg-card/60 backdrop-blur-md relative hover:shadow-sm transition-all duration-300">
              <CardHeader className="p-3 pb-1">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="secondary" className="text-[8px] h-3.5 uppercase font-bold tracking-wide">
                    {item.category.replace('_', ' ')}
                  </Badge>
                  {getStatusBadge(item.status)}
                </div>
                <CardTitle className="text-xs font-bold">{item.title}</CardTitle>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  {item.content}
                </p>
              </CardHeader>

              {/* Admin Reply Block if present */}
              {item.adminReply && (
                <div className="mx-3 my-2 p-2 bg-indigo-50/5 border-l-2 border-indigo-500 rounded-r text-[10px] leading-relaxed text-indigo-400">
                  <span className="font-extrabold flex items-center gap-1 mb-0.5">
                    ⚙️ Juriq Team response:
                  </span>
                  {item.adminReply.content}
                </div>
              )}

              <CardContent className="p-3 pt-1 border-t mt-2 flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onVote(item._id, 'up')}
                    className="h-7 text-[10px] font-extrabold flex items-center gap-1 hover:bg-muted text-primary"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>{item.upvotes.length}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onVote(item._id, 'down')}
                    className="h-7 text-[10px] font-extrabold flex items-center gap-1 hover:bg-muted text-muted-foreground"
                  >
                    <ThumbsDown className="h-3 w-3" />
                    <span>{item.downvotes.length}</span>
                  </Button>
                </div>

                <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono">
                  <User className="h-3 w-3" />
                  <span>Proposed on {new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {feedbackList.length === 0 && !loading && (
            <div className="py-16 text-center text-xs text-muted-foreground italic bg-muted/20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2">
              <Lightbulb className="h-8 w-8 text-zinc-400" />
              <span>No feature proposals submitted yet.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackSubmit;
