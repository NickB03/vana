'use client';

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AppLayout } from '@/components/layout/app-layout';
import { ChatInterface } from '@/components/chat/chat-interface';
import { CanvasContainer } from '@/components/canvas/canvas-container';
import { AgentTaskDeck } from '@/components/agents/agent-task-deck';
import { useSessionStore } from '@/store/session-store';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Users, Code2, MessageSquare, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const { currentSession, createSession, sessions } = useSessionStore();
  const initialPrompt = searchParams.get('prompt');
  const [selectedView, setSelectedView] = useState<'chat' | 'canvas' | 'split'>('split');
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);
  
  useEffect(() => {
    // Create a session if none exists
    if (!currentSession) {
      createSession();
    }
  }, [currentSession, createSession]);

  const handleNewChat = () => {
    createSession();
  };

  const handleSelectSession = (session: any) => {
    // Navigate to session or update current session
    console.log('Select session:', session.id);
  };

  const handleDeleteSession = (sessionId: string) => {
    // Delete session logic
    console.log('Delete session:', sessionId);
  };

  const handleArchiveSession = (sessionId: string) => {
    // Archive session logic
    console.log('Archive session:', sessionId);
  };

  const ViewToggle = () => (
    <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
      <Button
        variant={selectedView === 'chat' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setSelectedView('chat')}
        className={cn(
          'h-8 px-3 text-xs',
          selectedView === 'chat' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
        )}
      >
        <MessageSquare className="w-3 h-3 mr-1" />
        Chat
      </Button>
      <Button
        variant={selectedView === 'canvas' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setSelectedView('canvas')}
        className={cn(
          'h-8 px-3 text-xs',
          selectedView === 'canvas' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
        )}
      >
        <Code2 className="w-3 h-3 mr-1" />
        Canvas
      </Button>
      <Button
        variant={selectedView === 'split' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setSelectedView('split')}
        className={cn(
          'h-8 px-3 text-xs',
          selectedView === 'split' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
        )}
      >
        <LayoutDashboard className="w-3 h-3 mr-1" />
        Split
      </Button>
    </div>
  );

  return (
    <AuthGuard requireAuth={true}>
      <AppLayout 
        sessions={sessions}
        currentSession={currentSession}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onArchiveSession={handleArchiveSession}
      >
        <div className="flex flex-col h-full bg-[#131314]">
          {/* Top Controls Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#131314]">
            <ViewToggle />
            
            <div className="flex items-center gap-2">
              {/* Agent Panel Toggle */}
              <Sheet open={isAgentPanelOpen} onOpenChange={setIsAgentPanelOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Agents
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="right" 
                  className="w-[400px] bg-[#131314] border-l border-gray-800 text-white"
                >
                  <SheetHeader>
                    <SheetTitle className="text-white">AI Agents</SheetTitle>
                    <SheetDescription className="text-gray-400">
                      Monitor and interact with active AI agents
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <AgentTaskDeck
                      maxAgents={8}
                      gridCols={2}
                      showPerformanceMetrics={true}
                      showConfidenceScores={true}
                      enableRealTimeUpdates={true}
                      className="text-white"
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex min-h-0">
            {selectedView === 'chat' && (
              <div className="flex-1">
                <ChatInterface 
                  className="h-full"
                  {...(initialPrompt && { initialMessage: initialPrompt })}
                />
              </div>
            )}
            
            {selectedView === 'canvas' && (
              <div className="flex-1">
              <CanvasContainer 
                className="h-full"
                initialMode="markdown"
                initialContent="# Welcome to the Canvas\n\nStart creating content here..."
              />
              </div>
            )}
            
            {selectedView === 'split' && (
              <>
                <div className="flex-1 border-r border-gray-800">
                  <ChatInterface 
                    className="h-full"
                    {...(initialPrompt && { initialMessage: initialPrompt })}
                  />
                </div>
                <Separator orientation="vertical" className="bg-gray-800" />
                <div className="flex-1">
                  <CanvasContainer 
                    className="h-full"
                    initialMode="markdown"
                    initialContent="# AI Generated Content\n\nContent from your AI conversations will appear here for editing and refinement..."
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}

export default function ChatPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      }>
        <ChatPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}