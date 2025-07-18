import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/Icons';
import { Plus, MessageSquare, Calendar, Clock, Archive, Trash2, Settings, Menu, Search, Edit } from 'lucide-react';
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
interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  onSelectSession: (session: ChatSession) => void;
  onNewChat: () => void;
  onDeleteSession?: (sessionId: string) => void;
  isCollapsed?: boolean;
  hasStartedChat?: boolean;
  onToggleCollapse?: () => void;
}
const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentSession,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isCollapsed = false,
  hasStartedChat = false,
  onToggleCollapse
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Group sessions by time period
  const groupSessionsByTime = (sessions: ChatSession[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);
    const groups = {
      today: [] as ChatSession[],
      yesterday: [] as ChatSession[],
      lastWeek: [] as ChatSession[],
      lastMonth: [] as ChatSession[],
      older: [] as ChatSession[]
    };
    sessions.forEach(session => {
      const sessionDate = new Date(session.timestamp);
      if (sessionDate >= today) {
        groups.today.push(session);
      } else if (sessionDate >= yesterday) {
        groups.yesterday.push(session);
      } else if (sessionDate >= lastWeek) {
        groups.lastWeek.push(session);
      } else if (sessionDate >= lastMonth) {
        groups.lastMonth.push(session);
      } else {
        groups.older.push(session);
      }
    });
    return groups;
  };
  const filteredSessions = sessions.filter(session => session.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const groupedSessions = groupSessionsByTime(filteredSessions);
  const SessionGroup = ({
    title,
    sessions,
    icon: Icon
  }: {
    title: string;
    sessions: ChatSession[];
    icon: React.ComponentType<any>;
  }) => {
    if (sessions.length === 0) return null;
    return <div className="mb-4">
        <div className="flex items-center h-8">
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <Icon className="w-3 h-3" />
          </div>
          <span className={`text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{title}</span>
        </div>
        <div className="space-y-1">
          {sessions.map(session => {
            // Get first user message or use title as fallback
            const firstUserMessage = session.messages.find(msg => msg.sender === 'user')?.text;
            const displayText = firstUserMessage ? firstUserMessage.slice(0, 40) + (firstUserMessage.length > 40 ? '...' : '') : session.title;
            
            return (
              <button key={session.id} onClick={() => onSelectSession(session)} className={`w-full flex items-center rounded-lg text-left transition-colors group h-10 ${currentSession?.id === session.id ? 'bg-[var(--sidebar-active-bg)] text-[var(--accent-blue)]' : 'text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)]'}`}>
                {isCollapsed ? (
                  <div className="w-10 flex-shrink-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-[var(--accent-blue)]/20 rounded-sm"></div>
                  </div>
                ) : (
                  <>
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-[var(--accent-blue)]/20 rounded-sm"></div>
                    </div>
                    <span className={`flex-1 truncate text-sm transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{displayText}</span>
                    {onDeleteSession && <button onClick={e => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }} className={`p-1 hover:bg-[var(--accent-red)]/20 rounded transition-all duration-300 mr-2 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                      <Trash2 className="w-3 h-3" />
                    </button>}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>;
  };
  return <div className={`h-screen bg-[var(--bg-input)] border-r border-[var(--border-primary)] flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      
      {/* Header with hamburger and new chat */}
      <div className="p-4 space-y-3">
        {/* Hamburger menu */}
        <div className="w-full flex items-center h-10">
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <Button size="icon" variant="ghost" onClick={onToggleCollapse} className="text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors">
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* New Chat button */}
        <button onClick={onNewChat} className="w-full flex items-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)] transition-colors h-10">
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <Edit className="w-4 h-4" />
          </div>
          <span className={`text-sm transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 ml-2'}`}>New chat</span>
        </button>

        {/* Search */}
        <div className="relative h-10">
          <div className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
            <div className="flex items-center h-10 px-2">
              <div className="w-8 flex-shrink-0 flex items-center justify-center">
                <Search className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
              <input type="text" placeholder="Search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full max-w-[180px] py-2 px-2 bg-[var(--bg-main)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-blue)]" />
            </div>
          </div>
          <div className={`absolute inset-0 flex items-center transition-all duration-300 ${isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <div className="w-10 flex-shrink-0 flex items-center justify-center">
              <Button size="icon" variant="ghost" className="text-[var(--text-secondary)] hover:text-[var(--accent-blue)]">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Sessions */}
      <div className="flex-1 overflow-y-auto px-2">
        <SessionGroup title="Recent" sessions={groupedSessions.today} icon={Clock} />
        <SessionGroup title="Yesterday" sessions={groupedSessions.yesterday} icon={Clock} />
        <SessionGroup title="Last 7 days" sessions={groupedSessions.lastWeek} icon={Clock} />
        <SessionGroup title="Last month" sessions={groupedSessions.lastMonth} icon={Archive} />
        <SessionGroup title="Older" sessions={groupedSessions.older} icon={Archive} />
        
        {filteredSessions.length === 0 && <div className="text-center py-8 text-[var(--text-secondary)]">
            {!isCollapsed && <>
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No chats yet</p>
                <p className="text-xs mt-1">Start a conversation to see your chat history</p>
              </>}
          </div>}
      </div>

      {/* Settings at bottom */}
      <div className="">
        <button className="w-full flex items-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--sidebar-hover-bg)] transition-colors h-10">
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <span className={`text-sm transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 ml-2'}`}>Settings & help</span>
        </button>
      </div>
    </div>;
};
export default ChatSidebar;