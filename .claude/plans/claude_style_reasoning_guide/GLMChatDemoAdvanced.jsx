import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';

// ============ Types ============
const ArtifactType = {
  CODE: 'code',
  REACT: 'react',
  MARKDOWN: 'markdown',
  TOOL_RESULT: 'tool_result',
};

// ============ Initial State ============
const initialStreamState = {
  thinking: {
    isActive: false,
    content: '',
    status: 'Thinking...',
    duration: 0,
  },
  responseText: '',
  artifacts: new Map(),
  activeArtifactId: null,
  toolCalls: [],
};

// ============ Reducer for Multi-Artifact State ============
function streamReducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return {
        ...initialStreamState,
        artifacts: new Map(),
        toolCalls: [],
      };

    case 'THINKING_START':
      return {
        ...state,
        thinking: { ...state.thinking, isActive: true, content: '', status: 'Thinking...', duration: 0 },
      };

    case 'THINKING_DELTA':
      return {
        ...state,
        thinking: {
          ...state.thinking,
          content: state.thinking.content + action.content,
          status: action.status || state.thinking.status,
        },
      };

    case 'THINKING_END':
      return {
        ...state,
        thinking: { ...state.thinking, isActive: false, duration: action.duration },
      };

    case 'THINKING_DURATION':
      return {
        ...state,
        thinking: { ...state.thinking, duration: action.duration },
      };

    case 'TEXT_DELTA':
      return {
        ...state,
        responseText: state.responseText + action.content,
      };

    case 'ARTIFACT_START': {
      const newArtifacts = new Map(state.artifacts);
      newArtifacts.set(action.id, {
        id: action.id,
        type: action.artifactType,
        title: action.title || 'Artifact',
        content: '',
        language: action.language,
        isComplete: false,
      });
      return {
        ...state,
        artifacts: newArtifacts,
        activeArtifactId: action.id,
      };
    }

    case 'ARTIFACT_DELTA': {
      const updatedArtifacts = new Map(state.artifacts);
      const artifact = updatedArtifacts.get(action.id);
      if (artifact) {
        updatedArtifacts.set(action.id, {
          ...artifact,
          content: artifact.content + action.content,
        });
      }
      return { ...state, artifacts: updatedArtifacts };
    }

    case 'ARTIFACT_END': {
      const finalArtifacts = new Map(state.artifacts);
      const completed = finalArtifacts.get(action.id);
      if (completed) {
        finalArtifacts.set(action.id, { ...completed, isComplete: true });
      }
      return {
        ...state,
        artifacts: finalArtifacts,
        activeArtifactId: null,
      };
    }

    case 'TOOL_CALL_START':
      return {
        ...state,
        toolCalls: [...state.toolCalls, {
          id: action.id,
          name: action.name,
          arguments: '',
          result: null,
          status: 'calling',
        }],
      };

    case 'TOOL_CALL_DELTA': {
      const updatedCalls = state.toolCalls.map(tc =>
        tc.id === action.id ? { ...tc, arguments: tc.arguments + action.arguments } : tc
      );
      return { ...state, toolCalls: updatedCalls };
    }

    case 'TOOL_RESULT': {
      const withResults = state.toolCalls.map(tc =>
        tc.id === action.id ? { ...tc, result: action.result, status: 'complete' } : tc
      );
      return { ...state, toolCalls: withResults };
    }

    default:
      return state;
  }
}

// ============ Icons ============
const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const BrainIcon = ({ className = '' }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54" />
  </svg>
);

const CodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const ComponentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 9h6v6H9z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const StopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
  </svg>
);

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

// ============ Thinking Panel ============
const ThinkingPanel = ({ thinking }) => {
  const { isActive, content, status, duration } = thinking;
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isActive) setIsExpanded(true);
  }, [isActive]);

  useEffect(() => {
    if (isActive && isExpanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isActive, isExpanded]);

  if (!content && !isActive) return null;

  const formatDuration = (s) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className="mb-3 rounded-xl border border-gray-700/40 bg-gray-800/30 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-700/20 transition-all"
      >
        <span
          className="text-gray-500 transition-transform duration-200"
          style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <ChevronDownIcon />
        </span>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isActive ? (
            <>
              <div className="relative">
                <BrainIcon className="text-orange-400" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              </div>
              <span className="text-sm text-gray-300 truncate font-medium">{status}</span>
              <div className="flex gap-1 ml-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-1 h-1 bg-orange-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <BrainIcon className="text-gray-500" />
              <span className="text-sm text-gray-400">Thought for {formatDuration(duration)}</span>
            </>
          )}
        </div>

        <span className="text-xs text-gray-500 tabular-nums">{formatDuration(duration)}</span>
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: isExpanded ? '320px' : '0' }}
      >
        <div ref={contentRef} className="px-4 pb-4 max-h-72 overflow-y-auto border-t border-gray-700/30">
          <pre className="text-sm text-gray-400 whitespace-pre-wrap font-mono leading-relaxed mt-3">
            {content}
            {isActive && <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse ml-0.5" />}
          </pre>
        </div>
      </div>
    </div>
  );
};

// ============ Code Artifact ============
const CodeArtifact = ({ artifact }) => {
  const [copied, setCopied] = useState(false);
  const { title, content, language, isComplete } = artifact;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-gray-700/40 bg-gray-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700/40">
        <div className="flex items-center gap-2">
          <CodeIcon />
          <span className="text-sm font-medium text-gray-300">{title || 'Code'}</span>
          {language && (
            <span className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-400 rounded">{language}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isComplete && (
            <span className="flex items-center gap-1 text-xs text-orange-400">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              Writing...
            </span>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-gray-300 leading-relaxed">
          <code>{content}</code>
          {!isComplete && <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5" />}
        </pre>
      </div>
    </div>
  );
};

// ============ React Preview Artifact ============
const ReactArtifact = ({ artifact }) => {
  const [activeTab, setActiveTab] = useState('preview');
  const [copied, setCopied] = useState(false);
  const { title, content, isComplete } = artifact;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple preview render (in production you'd use sandboxing)
  const PreviewPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-48 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700/50">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-3">
        <PlayIcon />
      </div>
      <span className="text-sm text-gray-400">Interactive Preview</span>
      <span className="text-xs text-gray-500 mt-1">Component renders here</span>
    </div>
  );

  return (
    <div className="my-3 rounded-xl border border-gray-700/40 bg-gray-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700/40">
        <div className="flex items-center gap-2">
          <ComponentIcon />
          <span className="text-sm font-medium text-gray-300">{title || 'React Component'}</span>
          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">JSX</span>
        </div>
        <div className="flex items-center gap-2">
          {!isComplete && (
            <span className="flex items-center gap-1 text-xs text-orange-400">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              Writing...
            </span>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700/40">
        {['preview', 'code'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'preview' ? (
          <PreviewPlaceholder />
        ) : (
          <pre className="text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto">
            <code>{content}</code>
            {!isComplete && <span className="inline-block w-0.5 h-4 bg-purple-400 animate-pulse ml-0.5" />}
          </pre>
        )}
      </div>
    </div>
  );
};

// ============ Tool Call Display ============
const ToolCallDisplay = ({ toolCall }) => {
  const { name, arguments: args, result, status } = toolCall;
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="my-3 rounded-xl border border-gray-700/40 bg-gray-800/30 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-700/20 transition-all"
      >
        <span
          className="text-gray-500 transition-transform duration-200"
          style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <ChevronDownIcon />
        </span>

        <div className="flex items-center gap-2 flex-1">
          <div className={`p-1 rounded ${status === 'complete' ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
            <SearchIcon className={status === 'complete' ? 'text-green-400' : 'text-yellow-400'} />
          </div>
          <span className="text-sm font-medium text-gray-300">Tool: {name}</span>
          {status === 'calling' && (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
              Calling...
            </span>
          )}
          {status === 'complete' && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckIcon />
              Done
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-700/30 space-y-3">
          {/* Arguments */}
          <div className="mt-3">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Arguments</span>
            <pre className="mt-1 p-2 bg-gray-900/50 rounded-lg text-xs font-mono text-gray-400 overflow-x-auto">
              {args || '{}'}
            </pre>
          </div>

          {/* Result */}
          {result && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Result</span>
              <pre className="mt-1 p-2 bg-gray-900/50 rounded-lg text-xs font-mono text-green-400 overflow-x-auto">
                {result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============ Artifact Renderer ============
const ArtifactRenderer = ({ artifact }) => {
  switch (artifact.type) {
    case ArtifactType.CODE:
      return <CodeArtifact artifact={artifact} />;
    case ArtifactType.REACT:
      return <ReactArtifact artifact={artifact} />;
    default:
      return <CodeArtifact artifact={artifact} />;
  }
};

// ============ Message Component ============
const ChatMessage = ({ message, streamState, isStreaming }) => {
  const isUser = message.role === 'user';

  // For streaming messages, use streamState; for history, use message data
  const thinking = isStreaming
    ? streamState.thinking
    : message.thinking
    ? { ...message.thinking, isActive: false, status: '' }
    : null;

  const responseText = isStreaming ? streamState.responseText : message.content;
  const artifacts = isStreaming ? streamState.artifacts : message.artifacts || new Map();
  const toolCalls = isStreaming ? streamState.toolCalls : message.toolCalls || [];

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-orange-500 to-red-500'
        }`}
      >
        {isUser ? <span className="text-xs font-bold text-white">U</span> : <SparklesIcon />}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-2xl ${isUser ? 'text-right' : ''}`}>
        <div className={`text-xs text-gray-500 mb-1 ${isUser ? 'mr-1' : 'ml-1'}`}>
          {isUser ? 'You' : 'GLM-4.6'}
        </div>

        {/* Thinking Panel */}
        {!isUser && thinking && (thinking.content || thinking.isActive) && (
          <ThinkingPanel thinking={thinking} />
        )}

        {/* Tool Calls */}
        {!isUser && toolCalls.length > 0 && (
          <div className="space-y-2">
            {toolCalls.map((tc) => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Artifacts */}
        {!isUser && artifacts.size > 0 && (
          <div className="space-y-2">
            {Array.from(artifacts.values()).map((artifact) => (
              <ArtifactRenderer key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}

        {/* Text Response */}
        {responseText && (
          <div
            className={`rounded-2xl px-4 py-3 inline-block text-left ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800/50 text-gray-100 border border-gray-700/40'
            }`}
          >
            <div className="whitespace-pre-wrap leading-relaxed text-sm">
              {responseText}
              {isStreaming && !streamState.thinking.isActive && streamState.activeArtifactId === null && (
                <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-1" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ Demo Data with Multiple Artifact Types ============
const demoResponses = [
  {
    thinking: [
      { text: "The user wants to see how multi-artifact streaming works.\n\n", status: "Analyzing request..." },
      { text: "I should demonstrate:\n1. A code artifact (TypeScript)\n2. Show how state routing works\n3. Explain the reducer pattern\n\n", status: "Planning response..." },
      { text: "I'll create a practical example that shows the useReducer hook handling different event types.", status: "Preparing code example..." },
    ],
    segments: [
      { type: 'text', content: "Here's how the reducer handles different artifact types:\n\n" },
      {
        type: 'artifact',
        artifactType: ArtifactType.CODE,
        title: 'streamReducer.ts',
        language: 'typescript',
        content: `function streamReducer(state, action) {
  switch (action.type) {
    case 'THINKING_DELTA':
      return {
        ...state,
        thinking: {
          ...state.thinking,
          content: state.thinking.content + action.content,
        }
      };

    case 'ARTIFACT_START':
      const newArtifacts = new Map(state.artifacts);
      newArtifacts.set(action.id, {
        id: action.id,
        type: action.artifactType,
        content: '',
        isComplete: false,
      });
      return { ...state, artifacts: newArtifacts };

    case 'ARTIFACT_DELTA':
      // Route to correct artifact by ID
      const updated = new Map(state.artifacts);
      const artifact = updated.get(action.id);
      if (artifact) {
        updated.set(action.id, {
          ...artifact,
          content: artifact.content + action.content,
        });
      }
      return { ...state, artifacts: updated };

    default:
      return state;
  }
}`,
      },
      { type: 'text', content: "\n\nThe key insight: each artifact has a unique ID, so the reducer always knows exactly which state slice to update, regardless of type." },
    ],
  },
  {
    thinking: [
      { text: "Creating a React component example...\n\n", status: "Preparing component..." },
      { text: "This will show the preview/code tab pattern that's common for React artifacts.\n\n", status: "Building example..." },
      { text: "I'll make a simple but visually interesting counter component.", status: "Finalizing..." },
    ],
    segments: [
      { type: 'text', content: "Here's a React component artifact with preview:\n\n" },
      {
        type: 'artifact',
        artifactType: ArtifactType.REACT,
        title: 'Counter.tsx',
        language: 'tsx',
        content: `export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h2 className="text-2xl font-bold text-white">
        Count: {count}
      </h2>
      
      <div className="flex gap-2">
        <button
          onClick={() => setCount(c => c - 1)}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 
                     text-white rounded-lg transition-colors"
        >
          Decrease
        </button>
        
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 
                     text-white rounded-lg transition-colors"
        >
          Increase
        </button>
      </div>
      
      <p className="text-gray-400 text-sm">
        Click the buttons to change the count
      </p>
    </div>
  );
}`,
      },
      { type: 'text', content: "\n\nNotice the tabs above the artifact—you can switch between Preview and Code views. In production, the preview would render in a sandboxed iframe." },
    ],
  },
  {
    thinking: [
      { text: "User wants to see tool calls in action.\n\n", status: "Processing tool request..." },
      { text: "I'll simulate a web_search tool being called.\n\n", status: "Preparing tool call..." },
      { text: "Then show how the result gets displayed inline.", status: "Finalizing demonstration..." },
    ],
    toolCall: {
      name: 'web_search',
      arguments: '{\n  "query": "GLM 4.6 streaming API documentation",\n  "max_results": 3\n}',
      result: '[\n  {\n    "title": "GLM-4.6 API Reference - Z.AI",\n    "url": "https://docs.z.ai/api-reference",\n    "snippet": "Complete API documentation for GLM-4.6 including streaming, tool calls, and thinking mode..."\n  },\n  {\n    "title": "Tool Streaming Output - Z.AI",\n    "url": "https://docs.z.ai/guides/capabilities/stream-tool",\n    "snippet": "Enable real-time access to reasoning processes during tool invocation..."\n  }\n]',
    },
    segments: [
      { type: 'text', content: "Based on my search, GLM 4.6 has excellent documentation for streaming. The key parameters are:\n\n• `stream: true` - Enable streaming output\n• `tool_stream: true` - Stream tool call arguments in real-time\n• `thinking.type: \"enabled\"` - Show reasoning process\n\nThe tool call above shows how results appear inline with the conversation." },
    ],
  },
  {
    thinking: [
      { text: "Showing multiple artifacts in a single response...\n\n", status: "Planning multi-artifact response..." },
      { text: "This demonstrates that the reducer can handle multiple artifacts streaming simultaneously or sequentially.\n\n", status: "Preparing artifacts..." },
      { text: "Each gets its own ID and state slice.", status: "Finalizing..." },
    ],
    segments: [
      { type: 'text', content: "Here are TWO artifacts in one response:\n\n" },
      {
        type: 'artifact',
        artifactType: ArtifactType.CODE,
        title: 'types.ts',
        language: 'typescript',
        content: `interface Artifact {
  id: string;
  type: 'code' | 'react' | 'markdown';
  title: string;
  content: string;
  language?: string;
  isComplete: boolean;
}

interface StreamState {
  thinking: ThinkingState;
  responseText: string;
  artifacts: Map<string, Artifact>;
  activeArtifactId: string | null;
}`,
      },
      { type: 'text', content: "\nAnd the component that renders them:\n\n" },
      {
        type: 'artifact',
        artifactType: ArtifactType.CODE,
        title: 'ArtifactRenderer.tsx',
        language: 'tsx',
        content: `const ArtifactRenderer = ({ artifact }) => {
  switch (artifact.type) {
    case 'code':
      return <CodeArtifact artifact={artifact} />;
    case 'react':
      return <ReactArtifact artifact={artifact} />;
    case 'markdown':
      return <MarkdownArtifact artifact={artifact} />;
    default:
      return null;
  }
};`,
      },
      { type: 'text', content: "\n\nEach artifact streams independently with its own completion state!" },
    ],
  },
];

// ============ Main Component ============
export default function GLMChatDemoAdvanced() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamState, dispatch] = useReducer(streamReducer, initialStreamState);
  const [demoIndex, setDemoIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const abortRef = useRef(false);
  const startTimeRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamState]);

  const simulateStream = useCallback(async () => {
    abortRef.current = false;
    setIsStreaming(true);
    dispatch({ type: 'RESET' });
    dispatch({ type: 'THINKING_START' });

    const demo = demoResponses[demoIndex % demoResponses.length];
    setDemoIndex((prev) => prev + 1);

    startTimeRef.current = Date.now();
    const durationInterval = setInterval(() => {
      dispatch({
        type: 'THINKING_DURATION',
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
      });
    }, 1000);

    // Phase 1: Stream thinking
    let thinkingContent = '';
    for (const chunk of demo.thinking) {
      if (abortRef.current) break;
      for (const char of chunk.text) {
        if (abortRef.current) break;
        thinkingContent += char;
        dispatch({ type: 'THINKING_DELTA', content: char, status: chunk.status });
        await new Promise((r) => setTimeout(r, 12 + Math.random() * 20));
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    if (abortRef.current) {
      cleanup();
      return;
    }

    const thinkingDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    clearInterval(durationInterval);
    dispatch({ type: 'THINKING_END', duration: thinkingDuration });
    await new Promise((r) => setTimeout(r, 200));

    // Phase 2: Tool call (if present)
    if (demo.toolCall) {
      const toolId = `tool_${Date.now()}`;
      dispatch({ type: 'TOOL_CALL_START', id: toolId, name: demo.toolCall.name });
      await new Promise((r) => setTimeout(r, 300));

      // Stream arguments
      for (const char of demo.toolCall.arguments) {
        if (abortRef.current) break;
        dispatch({ type: 'TOOL_CALL_DELTA', id: toolId, arguments: char });
        await new Promise((r) => setTimeout(r, 8));
      }
      await new Promise((r) => setTimeout(r, 500));

      // Add result
      dispatch({ type: 'TOOL_RESULT', id: toolId, result: demo.toolCall.result });
      await new Promise((r) => setTimeout(r, 300));
    }

    // Phase 3: Stream segments (text and artifacts)
    const artifactContents = new Map();
    for (const segment of demo.segments) {
      if (abortRef.current) break;

      if (segment.type === 'text') {
        for (const char of segment.content) {
          if (abortRef.current) break;
          dispatch({ type: 'TEXT_DELTA', content: char });
          await new Promise((r) => setTimeout(r, 6 + Math.random() * 12));
        }
      } else if (segment.type === 'artifact') {
        const artifactId = `artifact_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        dispatch({
          type: 'ARTIFACT_START',
          id: artifactId,
          artifactType: segment.artifactType,
          title: segment.title,
          language: segment.language,
        });

        let artifactContent = '';
        for (const char of segment.content) {
          if (abortRef.current) break;
          artifactContent += char;
          dispatch({ type: 'ARTIFACT_DELTA', id: artifactId, content: char });
          await new Promise((r) => setTimeout(r, 4 + Math.random() * 8));
        }

        artifactContents.set(artifactId, {
          id: artifactId,
          type: segment.artifactType,
          title: segment.title,
          language: segment.language,
          content: artifactContent,
          isComplete: true,
        });

        dispatch({ type: 'ARTIFACT_END', id: artifactId });
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    if (!abortRef.current) {
      // Build final message for history
      let finalText = '';
      for (const seg of demo.segments) {
        if (seg.type === 'text') finalText += seg.content;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: finalText,
          thinking: { content: thinkingContent, duration: thinkingDuration },
          artifacts: artifactContents,
          toolCalls: demo.toolCall
            ? [{ id: 'tc', name: demo.toolCall.name, arguments: demo.toolCall.arguments, result: demo.toolCall.result, status: 'complete' }]
            : [],
          timestamp: new Date(),
        },
      ]);
    }

    cleanup();

    function cleanup() {
      clearInterval(durationInterval);
      setIsStreaming(false);
      dispatch({ type: 'RESET' });
    }
  }, [demoIndex]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    setMessages((prev) => [
      ...prev,
      { id: `msg_${Date.now()}`, role: 'user', content: input.trim(), timestamp: new Date() },
    ]);
    setInput('');
    simulateStream();
  };

  const suggestedPrompts = [
    'Show me the reducer pattern for artifacts',
    'Create a React component example',
    'Demo a tool call with search',
    'Show multiple artifacts at once',
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <SparklesIcon />
          </div>
          <div>
            <h1 className="font-semibold text-sm">GLM-4.6 Chat</h1>
            <p className="text-xs text-gray-500">Multi-Artifact Demo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full">
            useReducer
          </span>
          <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Demo
          </span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                <BrainIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-semibold mb-1">Multi-Artifact Streaming Demo</h2>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                See how the reducer pattern routes different artifact types to their correct state slices
              </p>

              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(prompt)}
                    className="px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-all text-gray-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} streamState={null} isStreaming={false} />
          ))}

          {isStreaming && (
            <ChatMessage
              message={{ id: 'streaming', role: 'assistant', content: '', timestamp: new Date() }}
              streamState={streamState}
              isStreaming={true}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur p-3">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Try the suggested prompts above..."
            disabled={isStreaming}
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={() => {
                abortRef.current = true;
              }}
              className="px-4 py-2.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-xl flex items-center gap-2 hover:bg-red-500/30 transition-colors"
            >
              <StopIcon />
              <span className="text-sm">Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl transition-all disabled:cursor-not-allowed"
            >
              <SendIcon />
            </button>
          )}
        </form>
        <p className="text-xs text-gray-600 mt-2 text-center">
          Demo shows: Code artifacts • React components • Tool calls • Multi-artifact responses
        </p>
      </div>
    </div>
  );
}
