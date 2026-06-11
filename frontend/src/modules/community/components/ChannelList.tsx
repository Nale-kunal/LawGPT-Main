import React from 'react';
import { Channel } from '../services/communityApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Hash, Radio, Globe } from 'lucide-react';

interface ChannelListProps {
  channels: Channel[];
  onJoin: (slug: string) => Promise<void>;
  onLeave: (slug: string) => Promise<void>;
  loadingSlug?: string | null;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  onJoin,
  onLeave,
  loadingSlug = null,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 p-4">
      {channels.map((chan) => {
        const isJoined = chan.isJoined;
        const isLoading = loadingSlug === chan.slug;

        return (
          <Card key={chan._id} className="hover:shadow-lg transition-all duration-300 border bg-card/60 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-primary" />
            <CardHeader className="pb-2 pl-6">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[9px] font-bold tracking-wider uppercase bg-primary/5 text-primary flex items-center gap-1">
                  {chan.type === 'announcement' ? <Radio className="h-3 w-3 animate-pulse" /> : <Hash className="h-3 w-3" />}
                  {chan.type}
                </Badge>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                  <Users className="h-3.5 w-3.5" />
                  <span>{chan.memberCount} members</span>
                </div>
              </div>
              <CardTitle className="text-sm font-black flex items-center gap-1.5 mt-1.5">
                #{chan.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-6 pb-4">
              <p className="text-xs text-muted-foreground min-h-[40px] line-clamp-2 leading-relaxed">
                {chan.description || 'No description provided.'}
              </p>
              
              <div className="flex gap-2 mt-4 items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-bold tracking-tight flex items-center gap-1">
                  <Globe className="h-3 w-3 text-indigo-400" />
                  Public channel
                </span>

                <Button
                  size="sm"
                  variant={isJoined ? 'outline' : 'default'}
                  onClick={() => (isJoined ? onLeave(chan.slug) : onJoin(chan.slug))}
                  disabled={isLoading}
                  className="h-8 text-xs font-black shadow-sm"
                >
                  {isLoading ? 'Processing...' : isJoined ? 'Leave Channel' : 'Join Channel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {channels.length === 0 && (
        <div className="col-span-full py-16 text-center text-xs text-muted-foreground italic bg-muted/20 border-2 border-dashed rounded-xl">
          No public channels available at the moment.
        </div>
      )}
    </div>
  );
};

export default ChannelList;
