import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/Icons";
import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Search, Share2, MoreHorizontal, Archive, Trash2, Menu, Mic } from "lucide-react";
import ChatSidebar from "@/components/ui/chat-sidebar";
import { useVanaAPI } from "@/services/VanaAPIProvider";
import { ThinkingPanel } from "@/components/ThinkingPanel";
import { useAuth } from "@/contexts/AuthContext";

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Array<{
    id: string;
    text: string;
    sender: 'user' | 'vana';
  }>;
}

import type { ThinkingStep } from "@/components/ThinkingPanel";

// Helper function to get icon for each agent
const getAgentIcon = (agent?: string): string => {
  switch(agent) {
    case 'master_orchestrator': return '🎯';
    case 'security_specialist': return '🔒';
    case 'data_science_specialist': return '📊';
    case 'architecture_specialist': return '🏗️';
    case 'devops_specialist': return '⚙️';
    case 'qa_specialist': return '🧪';
    case 'ui_specialist': return '🎨';
    default: return '🤖';
  }
};

const Chat = () => {
  const { api } = useVanaAPI();
  const { user, logout } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [showThinking, setShowThinking] = useState(true); // Default to showing thinking
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // <-- This is the only line that has been changed
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const createNewSession = (): ChatSession => {
    return {
      id: Date.now().toString(),
      title: "New Chat",
      timestamp: new Date(),
      messages: []
    };
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Create session if none exists
    let session = currentSession;
    if (!session) {
      session = createNewSession();
      setCurrentSession(session);
      setSessions(prev => [session, ...prev]);
    }

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user' as const
    };
    const updatedMessages = [...session.messages, userMessage];
    const updatedSession = {
      ...session,
      messages: updatedMessages,
      title: session.messages.length === 0 ? inputValue.slice(0, 30) + (inputValue.length > 30 ? '...' : '') : session.title
    };
    setCurrentSession(updatedSession);
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    setHasStartedChat(true);
    setIsThinking(true);
    const userInput = inputValue;
    setInputValue("");

    // Clear previous thinking steps
    setThinkingSteps([]);
    
    // Call VANA API with streaming
    try {
      let fullResponse = '';
      
      await api.streamMessage(userInput, {
        onThinking: (data) => {
          // Add thinking step with proper format
          const step: ThinkingStep = {
            icon: getAgentIcon(data.agent),
            summary: data.content || data.description || 'Processing...',
            detail: data.agent ? `Agent: ${data.agent}` : undefined,
            status: 'active' as const,
            timing: data.timing
          };
          setThinkingSteps(prev => {
            // Mark previous steps as complete
            const updatedSteps = prev.map(s => ({ ...s, status: 'complete' as const }));
            return [...updatedSteps, step];
          });
        },
        onContent: (content) => {
          fullResponse += content;
        },
        onDone: () => {
          // Mark all steps as complete
          setThinkingSteps(prev => prev.map(s => ({ ...s, status: 'complete' as const })));
          
          setIsThinking(false);
          const vanaMessage = {
            id: (Date.now() + 1).toString(),
            text: fullResponse,
            sender: 'vana' as const
          };
          const finalSession = {
            ...updatedSession,
            messages: [...updatedMessages, vanaMessage]
          };
          setCurrentSession(finalSession);
          setSessions(prev => prev.map(s => s.id === finalSession.id ? finalSession : s));
        },
        onError: (error) => {
          console.error('Streaming error:', error);
          setIsThinking(false);
        }
      }, session.id);
    } catch (error) {
      setIsThinking(false);
      console.error('Error calling VANA API:', error);
      
      // Provide specific error message based on error type
      let errorText = "I'm sorry, I encountered an error. ";
      if (error instanceof Error) {
        if (error.message.includes('Cannot connect')) {
          errorText += error.message;
        } else if (error.message.includes('API Error')) {
          errorText += `Backend error: ${error.message}`;
        } else {
          errorText += `Error: ${error.message}`;
        }
      } else {
        errorText += "Please make sure the VANA backend is running on port 8081.";
      }
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        sender: 'vana' as const
      };
      const finalSession = {
        ...updatedSession,
        messages: [...updatedMessages, errorMessage]
      };
      setCurrentSession(finalSession);
      setSessions(prev => prev.map(s => s.id === finalSession.id ? finalSession : s));
    }
  };

  const handleSelectSession = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const handleNewChat = () => {
    setCurrentSession(null);
    setHasStartedChat(false);
    setShowThinking(false);
    setIsThinking(false);
    setInputValue("");
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      handleNewChat();
    }
  };

  const currentMessages = currentSession?.messages || [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  return <div className="h-screen bg-[var(--bg-main)] flex w-full relative">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <ChatSidebar sessions={sessions} currentSession={currentSession} onSelectSession={handleSelectSession} onNewChat={handleNewChat} onDeleteSession={handleDeleteSession} isCollapsed={sidebarCollapsed} hasStartedChat={hasStartedChat} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileSidebar(false)}>
          <div className="w-64 h-full bg-[var(--bg-input)] animate-slide-in-right" onClick={e => e.stopPropagation()}>
            <ChatSidebar sessions={sessions} currentSession={currentSession} onSelectSession={session => {
        handleSelectSession(session);
        setShowMobileSidebar(false);
      }} onNewChat={() => {
        handleNewChat();
        setShowMobileSidebar(false);
      }} onDeleteSession={handleDeleteSession} isCollapsed={false} hasStartedChat={hasStartedChat} onToggleCollapse={() => setShowMobileSidebar(false)} />
          </div>
        </div>}
      
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile Menu Trigger - only show on mobile */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <Button size="icon" variant="ghost" onClick={() => setShowMobileSidebar(true)} className="bg-[var(--bg-input)] hover:bg-[var(--sidebar-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors">
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Header - Fixed */}
        <header className="flex-shrink-0 flex items-center justify-between p-4 bg-[var(--bg-main)]">
          <div className="flex items-center gap-4">
            {hasStartedChat && currentSession && <>
                <Button variant="ghost" size="sm" className="hidden md:block">
                  <Search className="w-4 h-4" />
                </Button>
                
              </>}
          </div>
          <div className="flex items-center space-x-3">
            {/* Chat actions - only show when chat exists */}
            {hasStartedChat && currentSession && <>
                <Button variant="ghost" size="sm">
                  <Share2 className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[var(--bg-element)] border-[var(--border-primary)]">
                    <DropdownMenuItem className="text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)] focus:bg-[var(--sidebar-hover-bg)]">
                      <Archive className="mr-2 h-4 w-4" />
                      <span>Add to archive</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-[var(--accent-red)] hover:bg-[var(--sidebar-hover-bg)] focus:bg-[var(--sidebar-hover-bg)]" onClick={() => currentSession && handleDeleteSession(currentSession.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>}

            
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[var(--bg-element)] border-[var(--border-primary)]">
                  <DropdownMenuLabel className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[var(--accent-blue)] rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-[var(--bg-main)]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{user?.name || 'User'}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{user?.email || 'user@example.com'}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[var(--border-primary)]" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)] focus:bg-[var(--sidebar-hover-bg)]">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)] focus:bg-[var(--sidebar-hover-bg)]">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-[var(--border-primary)]" />
                  <DropdownMenuItem 
                    className="text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)] focus:bg-[var(--sidebar-hover-bg)]"
                    onClick={logout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        {!hasStartedChat ? <main className="flex-1 flex flex-col items-center justify-center px-4 max-w-4xl mx-auto w-full">
            {/* Greeting - Centered */}
            <div className="mb-12 text-center animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-normal mb-2">
                <span className="text-[var(--accent-blue)]">Hi, I'm </span>
                <span className="gemini-gradient-text">Vana</span>
              </h1>
            </div>

            {/* Input Area */}
            <div className="w-full max-w-2xl animate-fade-in">
              <form onSubmit={onSubmit}>
                <PromptBox placeholder="Ask Vana" value={inputValue} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)} />
              </form>
            </div>
          </main> : <main className="flex-1 flex flex-col w-full overflow-hidden">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="max-w-4xl mx-auto w-full">
                <div className="space-y-4">
                  {currentMessages.map((message, index) => <div key={message.id}>
                      <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-sm md:text-base ${message.sender === 'user' ? 'bg-[var(--accent-blue)] text-[var(--bg-main)] ml-12' : 'bg-[var(--bg-input)] text-[var(--text-primary)] mr-12'}`}>
                          {message.text}
                        </div>
                      </div>
                      
                      {/* Show thinking panel after the last message */}
                      {message.sender === 'vana' && index === currentMessages.length - 1 && thinkingSteps.length > 0 && (
                        <div className="mt-2">
                          <ThinkingPanel 
                            steps={thinkingSteps}
                            isThinking={false}
                            className="max-w-[85%] md:max-w-[70%]"
                          />
                        </div>
                      )}
                    </div>)}
                  
                  {/* Show ThinkingPanel while processing */}
                  {isThinking && showThinking && thinkingSteps.length > 0 && (
                    <div className="mt-2">
                      <ThinkingPanel 
                        steps={thinkingSteps}
                        isThinking={true}
                        className="max-w-[85%] md:max-w-[70%]"
                      />
                    </div>
                  )}
                  
                  {/* Thinking Animation (only show if no thinking steps yet) */}
                  {isThinking && (thinkingSteps.length === 0 || !showThinking) && <div className="flex justify-start">
                      <div className="max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] mr-12">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-pulse" style={{
                    animationDelay: '0.2s'
                  }}></div>
                            <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-pulse" style={{
                    animationDelay: '0.4s'
                  }}></div>
                          </div>
                          <span className="text-sm text-[var(--text-secondary)]">Vana is thinking...</span>
                        </div>
                      </div>
                    </div>}
                </div>
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area - Fixed at bottom */}
            <div className="flex-shrink-0 bg-[var(--bg-main)] p-4">
              <div className="max-w-4xl mx-auto w-full">
                <form onSubmit={onSubmit}>
                  <div className="flex items-center gap-3 bg-[var(--bg-input)] rounded-full px-4 py-3 border border-[var(--border-primary)]">
                    <button type="button" className="flex-shrink-0 p-1 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors">
                      <Icons.plus className="w-5 h-5" />
                    </button>
                    <input type="text" value={inputValue} onChange={handleChange} placeholder="Ask anything" className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none text-base" />
                    <button type="button" className="flex-shrink-0 p-1 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors">
                      <Mic className="w-5 h-5" />
                    </button>
                    {inputValue.trim() && <button type="submit" className="flex-shrink-0 p-2 bg-[var(--accent-blue)] text-[var(--bg-main)] rounded-full hover:bg-[var(--accent-blue)]/90 transition-colors">
                        <Icons.send className="w-4 h-4" />
                      </button>}
                  </div>
                </form>
              </div>
            </div>
          </main>}
      </div>
    </div>;
};

export default Chat;
