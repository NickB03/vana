'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Clock, 
  Trash2, 
  Calendar,
  Search
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSessionStore } from '@/store/session-store';
import { ChatSession } from '@/types/session';

interface SessionHistoryProps {
  onSelectSession: (session: ChatSession) => void;
  className?: string;
}

export function SessionHistory({ onSelectSession, className }: SessionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    sessions,
    currentSession,
    deleteSession,
    createSession,
  } = useSessionStore();

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages.some(message =>
      message.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getSessionPreview = (session: ChatSession) => {
    const lastMessage = session.messages[session.messages.length - 1];
    if (!lastMessage) return 'No messages';
    
    const content = lastMessage.content;
    return content.length > 60 ? content.substring(0, 60) + '...' : content;
  };

  const handleNewChat = () => {
    const newSession = createSession();
    onSelectSession(newSession);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(sessionId);
  };

  const groupedSessions = filteredSessions.reduce((groups, session) => {
    const date = formatDate(session.updated_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(session);
    return groups;
  }, {} as Record<string, ChatSession[]>);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Chat History</h2>
          <Button size="sm" onClick={handleNewChat}>
            New Chat
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {Object.keys(groupedSessions).length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </p>
              {!searchQuery && (
                <Button variant="outline" className="mt-2" onClick={handleNewChat}>
                  Start your first chat
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSessions).map(([date, sessionGroup]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {date}
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    {sessionGroup.map((session, index) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                            currentSession?.id === session.id ? 'ring-2 ring-primary bg-accent' : ''
                          }`}
                          onClick={() => onSelectSession(session)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate mb-1">
                                  {session.title}
                                </h4>
                                
                                <p className="text-sm text-muted-foreground truncate mb-2">
                                  {getSessionPreview(session)}
                                </p>
                                
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {session.messages.length} messages
                                  </Badge>
                                  
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {new Date(session.updated_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                className="ml-2 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                  
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}