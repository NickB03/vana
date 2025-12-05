import { useState } from 'react';
import { CirclePlus, MessageSquare, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ViggleLogo } from '@/components/ViggleLogo';

/**
 * TestSidebarStates - Preview page for sidebar loading states
 *
 * Shows three sidebar states side-by-side:
 * 1. CURRENT: Empty during loading (the problem)
 * 2. PROPOSED: Skeleton loading state
 * 3. PROPOSED: Empty state with helpful message
 *
 * Route: /test-sidebar-states
 */

// Mock session data
const mockSessions = [
  { id: '1', title: 'Build a React dashboard', updated_at: new Date().toISOString() },
  { id: '2', title: 'Create a todo app', updated_at: new Date().toISOString() },
  { id: '3', title: 'Design a landing page', updated_at: new Date(Date.now() - 86400000).toISOString() },
];

// Sidebar wrapper for consistent styling
function SidebarFrame({
  children,
  label,
  variant
}: {
  children: React.ReactNode;
  label: string;
  variant: 'problem' | 'loading' | 'empty' | 'populated';
}) {
  const variantColors = {
    problem: 'border-red-500/50',
    loading: 'border-yellow-500/50',
    empty: 'border-blue-500/50',
    populated: 'border-green-500/50',
  };

  const variantLabels = {
    problem: 'bg-red-500/20 text-red-400',
    loading: 'bg-yellow-500/20 text-yellow-400',
    empty: 'bg-blue-500/20 text-blue-400',
    populated: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("px-3 py-1.5 rounded-md text-sm font-medium w-fit", variantLabels[variant])}>
        {label}
      </div>
      <div
        className={cn(
          "w-[280px] h-[500px] bg-sidebar border-2 rounded-xl overflow-hidden flex flex-col",
          variantColors[variant]
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Sidebar header (shared)
function SidebarHeader({ onNewChat }: { onNewChat?: () => void }) {
  return (
    <div className="flex flex-row items-center justify-between px-3 py-2 border-b border-border/50">
      <button className="px-2 hover:bg-transparent h-auto cursor-pointer">
        <ViggleLogo className="text-primary h-6 w-auto" />
      </button>
      <div className="flex items-center gap-1">
        <button className="flex items-center justify-center size-10 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
          <PanelLeft className="h-[20px] w-[20px]" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

// New chat button (shared)
function NewChatButton() {
  return (
    <div className="px-4 pb-1">
      <Button
        variant="ghost"
        className="w-full justify-start hover:bg-accent h-10 px-3 py-2 transition-all hover:scale-105 active:scale-95 group"
      >
        <CirclePlus className="h-6 w-6 mr-2 shrink-0 group-hover:text-primary transition-colors" strokeWidth={2} />
        <span className="text-base whitespace-nowrap">New chat</span>
      </Button>
    </div>
  );
}

// CURRENT STATE: Empty during loading (the problem)
function CurrentEmptySidebar() {
  return (
    <SidebarFrame label="CURRENT: Loading..." variant="problem">
      <SidebarHeader />
      <div className="flex-1 pt-2 overflow-hidden">
        <NewChatButton />
        {/* Nothing shown while loading - looks broken! */}
      </div>
      <div className="p-2 border-t border-border/50">
        <div className="h-10 w-full rounded-md bg-muted/30" />
      </div>
    </SidebarFrame>
  );
}

// PROPOSED: Skeleton loading state
function ProposedLoadingSidebar() {
  return (
    <SidebarFrame label="PROPOSED: Loading skeleton" variant="loading">
      <SidebarHeader />
      <div className="flex-1 pt-2 overflow-hidden">
        <NewChatButton />

        {/* Loading skeleton */}
        <div className="px-4 pt-3 space-y-3">
          {/* Today section */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" /> {/* "Today" label */}
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Yesterday section */}
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-20" /> {/* "Yesterday" label */}
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
      <div className="p-2 border-t border-border/50">
        <div className="h-10 w-full rounded-md bg-muted/30" />
      </div>
    </SidebarFrame>
  );
}

// PROPOSED: Empty state with helpful message
function ProposedEmptyStateSidebar() {
  return (
    <SidebarFrame label="PROPOSED: No sessions" variant="empty">
      <SidebarHeader />
      <div className="flex-1 pt-2 overflow-hidden">
        <NewChatButton />

        {/* Empty state message */}
        <div className="px-4 py-12 text-center">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            No conversations yet
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Start a new chat to begin
          </p>
        </div>
      </div>
      <div className="p-2 border-t border-border/50">
        <div className="h-10 w-full rounded-md bg-muted/30" />
      </div>
    </SidebarFrame>
  );
}

// REFERENCE: Populated state (what it looks like after load)
function PopulatedSidebar() {
  return (
    <SidebarFrame label="REFERENCE: Populated" variant="populated">
      <SidebarHeader />
      <div className="flex-1 pt-2 overflow-hidden">
        <NewChatButton />

        {/* Today section */}
        <div className="pt-3">
          <div className="px-4 pb-1 text-xs font-medium text-sidebar-foreground/70">Today</div>
          <div className="px-2 space-y-0.5">
            {mockSessions.slice(0, 2).map((session) => (
              <button
                key={session.id}
                className="w-full flex items-center hover:bg-accent/50 transition-all duration-150 rounded-md px-3 py-2 text-left"
              >
                <span className="truncate text-base">{session.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Yesterday section */}
        <div className="pt-3">
          <div className="px-4 pb-1 text-xs font-medium text-sidebar-foreground/70">Yesterday</div>
          <div className="px-2 space-y-0.5">
            {mockSessions.slice(2).map((session) => (
              <button
                key={session.id}
                className="w-full flex items-center hover:bg-accent/50 transition-all duration-150 rounded-md px-3 py-2 text-left"
              >
                <span className="truncate text-base">{session.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-2 border-t border-border/50">
        <div className="h-10 w-full rounded-md bg-muted/30" />
      </div>
    </SidebarFrame>
  );
}

export default function TestSidebarStates() {
  const [simulateState, setSimulateState] = useState<'loading' | 'empty' | 'populated'>('loading');

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sidebar Loading States</h1>
          <p className="text-muted-foreground">
            Preview of proposed improvements to sidebar loading UX.
            The current implementation shows an empty sidebar during fetch,
            which is indistinguishable from "no chat history."
          </p>
        </div>

        {/* State comparison */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Side-by-Side Comparison</h2>
          <div className="flex gap-6 overflow-x-auto pb-4">
            <CurrentEmptySidebar />
            <ProposedLoadingSidebar />
            <ProposedEmptyStateSidebar />
            <PopulatedSidebar />
          </div>
        </div>

        {/* Explanation */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-400 mb-3">The Problem</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Sidebar receives <code className="bg-muted px-1 rounded">isLoading</code> prop but never uses it</li>
              <li>• During fetch, sidebar appears empty (1-2 seconds)</li>
              <li>• User can't tell if loading or if they have no history</li>
              <li>• Demo risk: looks broken or data was lost</li>
            </ul>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-400 mb-3">The Solution</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Loading state:</strong> Show skeleton placeholders</li>
              <li>• <strong>Empty state:</strong> Show helpful message with icon</li>
              <li>• <strong>Populated:</strong> Show sessions (current behavior)</li>
              <li>• Clear visual distinction between all three states</li>
            </ul>
          </div>
        </div>

        {/* Interactive demo */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Interactive Demo</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Click buttons to simulate the state transitions a user would experience:
          </p>

          <div className="flex gap-3 mb-6">
            <Button
              variant={simulateState === 'loading' ? 'default' : 'outline'}
              onClick={() => setSimulateState('loading')}
            >
              Loading
            </Button>
            <Button
              variant={simulateState === 'empty' ? 'default' : 'outline'}
              onClick={() => setSimulateState('empty')}
            >
              Empty (no sessions)
            </Button>
            <Button
              variant={simulateState === 'populated' ? 'default' : 'outline'}
              onClick={() => setSimulateState('populated')}
            >
              Populated
            </Button>
          </div>

          <div className="flex gap-8">
            {/* Current behavior */}
            <div>
              <div className="text-sm font-medium text-red-400 mb-2">Current Behavior</div>
              <div className="w-[280px] h-[400px] bg-sidebar border border-border rounded-xl overflow-hidden flex flex-col">
                <SidebarHeader />
                <div className="flex-1 pt-2 overflow-hidden">
                  <NewChatButton />
                  {/* Current: Shows nothing during loading, nothing when empty */}
                  {simulateState === 'populated' && (
                    <div className="pt-3">
                      <div className="px-4 pb-1 text-xs font-medium text-sidebar-foreground/70">Today</div>
                      <div className="px-2 space-y-0.5">
                        {mockSessions.slice(0, 2).map((session) => (
                          <button
                            key={session.id}
                            className="w-full flex items-center hover:bg-accent/50 transition-all duration-150 rounded-md px-3 py-2 text-left"
                          >
                            <span className="truncate text-base">{session.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Proposed behavior */}
            <div>
              <div className="text-sm font-medium text-green-400 mb-2">Proposed Behavior</div>
              <div className="w-[280px] h-[400px] bg-sidebar border border-border rounded-xl overflow-hidden flex flex-col">
                <SidebarHeader />
                <div className="flex-1 pt-2 overflow-hidden">
                  <NewChatButton />

                  {simulateState === 'loading' && (
                    <div className="px-4 pt-3 space-y-3">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-10 w-full rounded-md" />
                      </div>
                      <div className="space-y-2 pt-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full rounded-md" />
                      </div>
                    </div>
                  )}

                  {simulateState === 'empty' && (
                    <div className="px-4 py-12 text-center">
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" strokeWidth={1.5} />
                      <p className="text-sm text-muted-foreground">No conversations yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Start a new chat to begin</p>
                    </div>
                  )}

                  {simulateState === 'populated' && (
                    <div className="pt-3">
                      <div className="px-4 pb-1 text-xs font-medium text-sidebar-foreground/70">Today</div>
                      <div className="px-2 space-y-0.5">
                        {mockSessions.slice(0, 2).map((session) => (
                          <button
                            key={session.id}
                            className="w-full flex items-center hover:bg-accent/50 transition-all duration-150 rounded-md px-3 py-2 text-left"
                          >
                            <span className="truncate text-base">{session.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Code preview */}
        <div className="bg-muted/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Implementation</h3>
          <pre className="text-sm overflow-x-auto bg-background p-4 rounded-md">
{`// In ChatSidebar.tsx, replace the session mapping with:

{isLoading ? (
  // Loading skeleton
  <div className="px-4 pt-3 space-y-3">
    <div className="space-y-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  </div>
) : sessions.length === 0 ? (
  // Empty state
  <div className="px-4 py-12 text-center">
    <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
    <p className="text-sm text-muted-foreground">No conversations yet</p>
    <p className="text-xs text-muted-foreground/60 mt-1">Start a new chat to begin</p>
  </div>
) : (
  // Populated - current behavior
  groupedSessions.map(([period, periodSessions]) => (
    <SidebarGroup key={period}>...</SidebarGroup>
  ))
)}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
