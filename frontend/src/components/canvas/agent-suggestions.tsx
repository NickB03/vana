'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MessageSquare, 
  Edit3, 
  FileCheck, 
  Zap, 
  Bug,
  Check, 
  X, 
  Clock, 
  TrendingUp,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentSuggestion, AgentInfo, CollaborativeSession } from '@/types/canvas';

interface AgentSuggestionsProps {
  session: CollaborativeSession;
  onAcceptSuggestion: (suggestionId: string) => void;
  onRejectSuggestion: (suggestionId: string) => void;
  onViewSuggestion: (suggestion: AgentSuggestion) => void;
  className?: string;
}

export function AgentSuggestions({ 
  session, 
  onAcceptSuggestion, 
  onRejectSuggestion, 
  onViewSuggestion,
  className 
}: AgentSuggestionsProps) {
  const [filter, setFilter] = useState<AgentSuggestion['status'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'confidence' | 'type'>('timestamp');

  // Suggestion type icons and colors
  const getSuggestionIcon = (type: AgentSuggestion['type']) => {
    switch (type) {
      case 'edit': return Edit3;
      case 'comment': return MessageSquare;
      case 'review': return FileCheck;
      case 'optimization': return Zap;
      case 'bug-fix': return Bug;
      default: return Info;
    }
  };

  const getSuggestionColor = (type: AgentSuggestion['type']) => {
    switch (type) {
      case 'edit': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'comment': return 'text-green-600 bg-green-50 border-green-200';
      case 'review': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'optimization': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'bug-fix': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Filter and sort suggestions
  const filteredSuggestions = useMemo(() => {
    const suggestions = session.suggestions.filter(suggestion => {
      if (filter === 'all') return true;
      return suggestion.status === filter;
    });

    // Sort suggestions
    suggestions.sort((a, b) => {
      switch (sortBy) {
        case 'timestamp':
          return b.timestamp.getTime() - a.timestamp.getTime();
        case 'confidence':
          return b.confidence - a.confidence;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return suggestions;
  }, [session.suggestions, filter, sortBy]);

  // Get agent info for suggestion
  const getAgent = useCallback((agentId: string): AgentInfo | null => {
    return session.agents.find(agent => agent.id === agentId) || null;
  }, [session.agents]);

  // Handle suggestion actions
  const handleAccept = useCallback((suggestion: AgentSuggestion, e: React.MouseEvent) => {
    e.stopPropagation();
    onAcceptSuggestion(suggestion.id);
  }, [onAcceptSuggestion]);

  const handleReject = useCallback((suggestion: AgentSuggestion, e: React.MouseEvent) => {
    e.stopPropagation();
    onRejectSuggestion(suggestion.id);
  }, [onRejectSuggestion]);

  const handleView = useCallback((suggestion: AgentSuggestion) => {
    onViewSuggestion(suggestion);
  }, [onViewSuggestion]);

  // Status counts
  const statusCounts = useMemo(() => {
    return session.suggestions.reduce((acc, suggestion) => {
      acc[suggestion.status] = (acc[suggestion.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [session.suggestions]);

  if (session.suggestions.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No agent suggestions yet</p>
            <p className="text-sm">Agents will provide suggestions as they analyze your code</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with filters and stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Agent Suggestions</h3>
              <Badge variant="secondary">{session.suggestions.length}</Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Status filter */}
              <div className="flex items-center gap-1">
                {(['all', 'pending', 'accepted', 'rejected'] as const).map(status => (
                  <Button
                    key={status}
                    variant={filter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(status)}
                    className="text-xs"
                  >
                    {status === 'all' ? 'All' : status}
                    {status !== 'all' && statusCounts[status] && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {statusCounts[status]}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>

              {/* Sort options */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Sort:</span>
                <Button
                  variant={sortBy === 'timestamp' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy('timestamp')}
                  className="text-xs"
                >
                  <Clock className="h-3 w-3" />
                </Button>
                <Button
                  variant={sortBy === 'confidence' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy('confidence')}
                  className="text-xs"
                >
                  <TrendingUp className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Suggestions List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredSuggestions.map(suggestion => {
          const agent = getAgent(suggestion.agentId);
          const Icon = getSuggestionIcon(suggestion.type);
          const colorClasses = getSuggestionColor(suggestion.type);
          
          return (
            <Card 
              key={suggestion.id} 
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                suggestion.status === 'pending' && 'border-l-4 border-l-amber-400',
                suggestion.status === 'accepted' && 'border-l-4 border-l-green-400',
                suggestion.status === 'rejected' && 'border-l-4 border-l-red-400'
              )}
              onClick={() => handleView(suggestion)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Suggestion icon and type */}
                    <div className={cn('p-2 rounded-lg border', colorClasses)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium truncate">{suggestion.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.type}
                        </Badge>
                        {agent && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{ backgroundColor: agent.color + '20' }}
                          >
                            {agent.name}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Description */}
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {suggestion.description}
                      </p>
                      
                      {/* Position info */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span>Line {suggestion.position.lineNumber}</span>
                        <span>•</span>
                        <span>{suggestion.timestamp.toLocaleTimeString()}</span>
                        {suggestion.range && (
                          <>
                            <span>•</span>
                            <span>
                              Lines {suggestion.range.startLineNumber}-{suggestion.range.endLineNumber}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {/* Confidence and original/suggested text preview */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={cn('text-xs px-2 py-0.5', getConfidenceColor(suggestion.confidence))}>
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </Badge>
                          
                          {suggestion.originalText && suggestion.suggestedText && (
                            <div className="text-xs text-muted-foreground">
                              <span className="line-through">{suggestion.originalText.substring(0, 30)}...</span>
                              {' → '}
                              <span className="font-medium">{suggestion.suggestedText.substring(0, 30)}...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  {suggestion.status === 'pending' && (
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleAccept(suggestion, e)}
                            className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Accept suggestion</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleReject(suggestion, e)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reject suggestion</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  
                  {suggestion.status !== 'pending' && (
                    <div className="flex items-center">
                      {suggestion.status === 'accepted' && (
                        <Badge className="text-green-700 bg-green-100">
                          <Check className="h-3 w-3 mr-1" />
                          Accepted
                        </Badge>
                      )}
                      {suggestion.status === 'rejected' && (
                        <Badge className="text-red-700 bg-red-100">
                          <X className="h-3 w-3 mr-1" />
                          Rejected
                        </Badge>
                      )}
                      {suggestion.status === 'implemented' && (
                        <Badge className="text-blue-700 bg-blue-100">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Implemented
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {filteredSuggestions.length === 0 && filter !== 'all' && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No {filter} suggestions</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}