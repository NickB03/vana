/**
 * Example App.tsx showing how to integrate the new context system
 * 
 * This example demonstrates proper usage of the RootProvider and 
 * shows how all contexts work together in a real application.
 */

import React from 'react';
import RootProvider from './contexts/RootProvider';
import { useAuth, useApp, useSession, useSSE } from './contexts';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';

// Main app component that uses all contexts
function VanaApp() {
  const { user, signIn, signOut, enterGuestMode, isLoading } = useAuth();
  const { addNotification, updatePreferences, ui } = useApp();
  const { createSession, currentSession, sessions } = useSession();
  const { connection, subscribe } = useSSE();

  // Subscribe to real-time events
  React.useEffect(() => {
    const unsubscribers = [
      subscribe('research.progress', (event) => {
        addNotification({
          type: 'info',
          title: 'Research Progress',
          message: `Progress: ${(event.data as any).progress}%`,
        });
      }),
      subscribe('research.completed', (event) => {
        addNotification({
          type: 'success',
          title: 'Research Complete',
          message: 'Your research has been completed successfully.',
        });
      }),
      subscribe('agent.error', (event) => {
        addNotification({
          type: 'error',
          title: 'Agent Error',
          message: (event.data as any).message || 'An error occurred',
        });
      }),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [subscribe, addNotification]);

  const handleCreateSession = async () => {
    if (!user) {
      addNotification({
        type: 'warning',
        title: 'Authentication Required',
        message: 'Please sign in to create a research session.',
      });
      return;
    }

    try {
      await createSession({
        topic: 'Artificial Intelligence in Healthcare',
        depth: 'moderate',
        includeCitations: true,
        format: 'report',
      });
      
      addNotification({
        type: 'success',
        title: 'Session Created',
        message: 'Your research session has been created successfully.',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Session Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create session',
      });
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn({
        email: 'demo@vana.ai',
        password: 'demo-password',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Sign In Failed',
        message: error instanceof Error ? error.message : 'Failed to sign in',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-foreground-muted">Loading Vana...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-vana-gradient bg-clip-text text-transparent">
              Vana
            </h1>
            <div className="flex items-center space-x-2 text-sm text-foreground-muted">
              <div className={`w-2 h-2 rounded-full ${
                connection.readyState === 'OPEN' ? 'bg-vana-success' : 
                connection.readyState === 'CONNECTING' ? 'bg-vana-warning' : 'bg-border'
              }`} />
              <span>
                {connection.readyState === 'OPEN' ? 'Connected' : 
                 connection.readyState === 'CONNECTING' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updatePreferences({ 
                theme: ui.theme === 'dark' ? 'light' : 'dark' 
              })}
            >
              {ui.theme === 'dark' ? '☀️' : '🌙'}
            </Button>
            
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-foreground-muted">
                  {user.isGuest ? 'Guest User' : user.email}
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleSignIn}>
                  Sign In
                </Button>
                <Button variant="ghost" size="sm" onClick={enterGuestMode}>
                  Continue as Guest
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* User Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Status:</strong> {user ? 'Authenticated' : 'Not signed in'}
                </p>
                {user && (
                  <>
                    <p className="text-sm">
                      <strong>Type:</strong> {user.isGuest ? 'Guest' : 'Registered'}
                    </p>
                    <p className="text-sm">
                      <strong>Email:</strong> {user.email || 'N/A'}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Session Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Research Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Total Sessions:</strong> {sessions.length}
                </p>
                <p className="text-sm">
                  <strong>Current:</strong> {currentSession ? currentSession.title : 'None'}
                </p>
                <Button 
                  size="sm" 
                  onClick={handleCreateSession}
                  disabled={!user}
                  className="w-full"
                >
                  Create New Session
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Theme:</strong> {ui.theme}
                </p>
                <p className="text-sm">
                  <strong>Real-time:</strong> {
                    connection.readyState === 'OPEN' ? 'Connected' : 'Disconnected'
                  }
                </p>
                <p className="text-sm">
                  <strong>Events:</strong> {connection.eventsReceived}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Session Details */}
        {currentSession && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Current Research Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{currentSession.title}</h3>
                  <p className="text-sm text-foreground-muted">
                    Status: {currentSession.status} • Created: {
                      new Date(currentSession.createdAt).toLocaleDateString()
                    }
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Configuration</h4>
                  <div className="text-xs text-foreground-muted space-y-1">
                    <p>Topic: {currentSession.config.topic}</p>
                    <p>Depth: {currentSession.config.depth}</p>
                    <p>Format: {currentSession.config.format}</p>
                    <p>Citations: {currentSession.config.includeCitations ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {currentSession.timeline.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Timeline</h4>
                    <div className="space-y-2">
                      {currentSession.timeline.slice(0, 3).map((event) => (
                        <div key={event.id} className="text-xs border-l-2 border-primary pl-3">
                          <p className="font-medium">{event.title}</p>
                          <p className="text-foreground-muted">
                            {event.agentName} • {event.status} • {
                              new Date(event.timestamp).toLocaleTimeString()
                            }
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// Export wrapped app with all providers
export default function App() {
  return (
    <RootProvider>
      <VanaApp />
    </RootProvider>
  );
}