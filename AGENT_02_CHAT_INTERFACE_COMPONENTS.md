# Agent 2: Chat Interface Components Implementation

## 🎯 **MISSION**
Create modern ChatGPT-style chat interface components using assistant-ui primitives and shadcn/ui, providing the primary user interaction method for the VANA multi-agent system.

## 📋 **SCOPE & DELIVERABLES**

### **Primary Deliverables:**
1. **assistant-ui Integration** - Set up assistant-ui chat primitives
2. **Chat Components** - Message list, input field, typing indicators
3. **Agent Visualization** - Show active agent, tool usage, handoffs
4. **Message Types** - Support text, code, tool outputs, errors
5. **Responsive Design** - Mobile-first, desktop-optimized layout

### **Technical Requirements:**
- Use assistant-ui for chat primitives
- Integrate shadcn/ui components for UI elements
- TypeScript for type safety
- Tailwind CSS for styling
- Support for markdown rendering
- Real-time message streaming

## 🏗️ **IMPLEMENTATION PLAN**

### **Step 1: Setup New React App with TypeScript**
```bash
cd /Users/nick/Development/vana-enhanced
npx create-react-app frontend --template typescript
cd frontend
npm install @assistant-ui/react @radix-ui/react-slot class-variance-authority clsx tailwind-merge
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

### **Step 2: Configure Tailwind CSS**
Update `frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### **Step 3: Create Chat Interface Components**
Create `frontend/src/components/chat/ChatInterface.tsx`:
```typescript
import React from 'react';
import { Thread } from '@assistant-ui/react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { AgentStatus } from './AgentStatus';

interface ChatInterfaceProps {
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Agent Status Bar */}
      <AgentStatus />

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <Thread
          components={{
            Message: ChatMessage,
            UserMessage: ChatMessage,
            AssistantMessage: ChatMessage,
          }}
          className="h-full"
        />
      </div>

      {/* Chat Input */}
      <ChatInput />
    </div>
  );
};
```

### **Step 4: Create Message Components**
Create `frontend/src/components/chat/ChatMessage.tsx`:
```typescript
import React from 'react';
import { MessagePrimitive } from '@assistant-ui/react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ToolExecution } from './ToolExecution';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    agent?: string;
    tools?: Array<{
      name: string;
      status: 'running' | 'completed' | 'error';
      output?: any;
    }>;
  };
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <MessagePrimitive.Root
      className={cn(
        "flex gap-3 p-4 hover:bg-muted/50 transition-colors",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={isUser ? "/user-avatar.png" : "/vana-avatar.png"} />
        <AvatarFallback>
          {isUser ? "U" : message.agent?.charAt(0).toUpperCase() || "V"}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn("flex-1 space-y-2", isUser && "text-right")}>
        {/* Header */}
        <div className="flex items-center gap-2">
          {!isUser && message.agent && (
            <Badge variant="secondary" className="text-xs">
              {message.agent}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* Message Text */}
        <MessagePrimitive.Content className="prose prose-sm max-w-none dark:prose-invert">
          {message.content}
        </MessagePrimitive.Content>

        {/* Tool Executions */}
        {message.tools && message.tools.length > 0 && (
          <div className="space-y-2">
            {message.tools.map((tool, index) => (
              <ToolExecution key={index} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </MessagePrimitive.Root>
  );
};
```

### **Step 5: Create Chat Input Component**
Create `frontend/src/components/chat/ChatInput.tsx`:
```typescript
import React, { useState } from 'react';
import { ComposerPrimitive } from '@assistant-ui/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, Paperclip } from 'lucide-react';

export const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      // Send message logic will be handled by assistant-ui
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <ComposerPrimitive.Root className="relative">
        <form onSubmit={handleSubmit} className="flex gap-2">
          {/* Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message VANA..."
              className="min-h-[44px] max-h-32 resize-none pr-12"
              rows={1}
            />

            {/* Character Count */}
            {message.length > 0 && (
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {message.length}
              </div>
            )}
          </div>

          {/* Voice/Send Button */}
          <Button
            type={message.trim() ? "submit" : "button"}
            variant={message.trim() ? "default" : "ghost"}
            size="icon"
            className="shrink-0"
            onClick={!message.trim() ? () => setIsRecording(!isRecording) : undefined}
          >
            {message.trim() ? (
              <Send className="h-4 w-4" />
            ) : (
              <Mic className={`h-4 w-4 ${isRecording ? 'text-red-500' : ''}`} />
            )}
          </Button>
        </form>
      </ComposerPrimitive.Root>
    </div>
  );
};
```

### **Step 6: Create Agent Status Component**
Create `frontend/src/components/chat/AgentStatus.tsx`:
```typescript
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface AgentStatusProps {
  currentAgent?: string;
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'error';
  progress?: number;
  currentTool?: string;
}

export const AgentStatus: React.FC<AgentStatusProps> = ({
  currentAgent = 'VANA',
  status = 'idle',
  progress,
  currentTool
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'thinking':
      case 'executing':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'thinking':
        return 'Thinking...';
      case 'executing':
        return currentTool ? `Using ${currentTool}` : 'Executing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error occurred';
      default:
        return 'Ready';
    }
  };

  return (
    <div className="border-b bg-muted/30 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentAgent}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </div>
        </div>

        {progress !== undefined && (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="w-20 h-2" />
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
```

### **Step 7: Create Tool Execution Component**
Create `frontend/src/components/chat/ToolExecution.tsx`:
```typescript
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Tool, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ToolExecutionProps {
  tool: {
    name: string;
    status: 'running' | 'completed' | 'error';
    input?: any;
    output?: any;
    duration?: number;
    error?: string;
  };
}

export const ToolExecution: React.FC<ToolExecutionProps> = ({ tool }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusIcon = () => {
    switch (tool.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (tool.status) {
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <Card className={`${getStatusColor()} transition-colors`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tool className="h-4 w-4" />
                <CardTitle className="text-sm font-medium">{tool.name}</CardTitle>
                {getStatusIcon()}
              </div>
              <div className="flex items-center gap-2">
                {tool.duration && (
                  <Badge variant="secondary" className="text-xs">
                    {tool.duration}ms
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 p-3">
            {tool.input && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Input:</h4>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(tool.input, null, 2)}
                </pre>
              </div>
            )}

            {tool.output && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Output:</h4>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(tool.output, null, 2)}
                </pre>
              </div>
            )}

            {tool.error && (
              <div>
                <h4 className="text-xs font-medium text-red-600 mb-1">Error:</h4>
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {tool.error}
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
```

## ✅ **SUCCESS CRITERIA**

1. **Modern Chat Interface** - ChatGPT-style UI with assistant-ui primitives
2. **Message Display** - Support for text, code, tool outputs, and errors
3. **Agent Visualization** - Clear indication of active agent and status
4. **Tool Transparency** - Expandable tool execution details
5. **Responsive Design** - Works on mobile and desktop
6. **TypeScript Integration** - Full type safety
7. **Accessibility** - WCAG 2.1 AA compliant

## 📝 **DELIVERABLE FILES**

1. `frontend/src/components/chat/ChatInterface.tsx` - Main chat interface
2. `frontend/src/components/chat/ChatMessage.tsx` - Message component
3. `frontend/src/components/chat/ChatInput.tsx` - Input component
4. `frontend/src/components/chat/AgentStatus.tsx` - Agent status display
5. `frontend/src/components/chat/ToolExecution.tsx` - Tool execution display
6. `frontend/tailwind.config.js` - Tailwind configuration
7. `frontend/package.json` - Updated dependencies

**Branch**: Create `feat/chat-interface-components`
**PR Title**: "Add Modern Chat Interface Components with assistant-ui"
