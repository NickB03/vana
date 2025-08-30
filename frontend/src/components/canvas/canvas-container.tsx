'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CanvasToolbar } from './canvas-toolbar';
import { CanvasEditor } from './canvas-editor';
import { CanvasPreview } from './canvas-preview';
import { CanvasVersionHistory } from './canvas-version-history';
import { CanvasExportDialog } from './canvas-export-dialog';
import { 
  CanvasState, 
  CanvasVersion, 
  CanvasMode, 
  CodeLanguage, 
  ExportOptions,
  KeyboardShortcut 
} from './types';

interface CanvasContainerProps {
  initialContent?: string;
  initialMode?: CanvasMode;
  initialLanguage?: CodeLanguage;
  className?: string;
  onContentChange?: (content: string) => void;
  onSave?: (content: string, mode: CanvasMode) => void;
}

const STORAGE_KEY = 'canvas-state';

export function CanvasContainer({
  initialContent = '',
  initialMode = 'markdown',
  initialLanguage = 'javascript',
  className,
  onContentChange,
  onSave,
}: CanvasContainerProps) {
  const { toast } = useToast();
  const [state, setState] = useState<CanvasState>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            versions: parsed.versions.map((v: any) => ({
              ...v,
              timestamp: new Date(v.timestamp),
            })),
          };
        }
      } catch (error) {
        console.error('Failed to load canvas state:', error);
      }
    }
    
    return {
      content: initialContent,
      mode: initialMode,
      language: initialLanguage,
      versions: [],
      isPreviewEnabled: true,
      isVersionHistoryOpen: false,
    };
  });

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save canvas state:', error);
    }
  }, [state]);

  // Content change handler
  const handleContentChange = useCallback((content: string) => {
    setState(prev => {
      // Add current content to undo stack
      if (prev.content !== content) {
        setUndoStack(stack => [...stack.slice(-19), prev.content]); // Keep last 20
        setRedoStack([]); // Clear redo stack on new change
      }
      
      const newState = { ...prev, content };
      onContentChange?.(content);
      return newState;
    });
  }, [onContentChange]);

  // Mode change handler
  const handleModeChange = useCallback((mode: CanvasMode) => {
    setState(prev => ({ ...prev, mode }));
    
    // Auto-enable preview for markdown and web modes
    if (mode === 'markdown' || mode === 'web') {
      setState(prev => ({ ...prev, isPreviewEnabled: true }));
    }
  }, []);

  // Language change handler
  const handleLanguageChange = useCallback((language: CodeLanguage) => {
    setState(prev => ({ ...prev, language }));
  }, []);

  // Save version
  const handleSave = useCallback(() => {
    const version: CanvasVersion = {
      id: `version-${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      content: state.content,
      mode: state.mode,
      language: state.language,
      title: generateVersionTitle(state.content, state.mode),
    };

    setState(prev => ({
      ...prev,
      versions: [...prev.versions, version],
      currentVersionId: version.id,
    }));

    onSave?.(state.content, state.mode);
    
    toast({
      title: 'Version saved',
      description: `Saved as "${version.title}"`,
    });
  }, [state.content, state.mode, state.language, onSave, toast]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const previousContent = undoStack[undoStack.length - 1];
    if (previousContent === undefined) return;
    
    setUndoStack(stack => stack.slice(0, -1));
    setRedoStack(stack => [...stack, state.content]);
    setState(prev => ({ ...prev, content: previousContent }));
  }, [undoStack, state.content]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const nextContent = redoStack[redoStack.length - 1];
    if (nextContent === undefined) return;
    
    setRedoStack(stack => stack.slice(0, -1));
    setUndoStack(stack => [...stack, state.content]);
    setState(prev => ({ ...prev, content: nextContent }));
  }, [redoStack, state.content]);

  // Copy content
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(state.content);
      toast({
        title: 'Copied to clipboard',
        description: 'Content copied successfully',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy content to clipboard',
        variant: 'destructive',
      });
    }
  }, [state.content, toast]);

  // Import file
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleContentChange(content);
      
      // Auto-detect mode based on file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension) {
        const modeMap: Record<string, CanvasMode> = {
          'md': 'markdown',
          'html': 'web',
          'htm': 'web',
          'js': 'code',
          'ts': 'code',
          'py': 'code',
        };
        
        const detectedMode = modeMap[extension];
        if (detectedMode) {
          handleModeChange(detectedMode);
          
          if (detectedMode === 'code') {
            const langMap: Record<string, CodeLanguage> = {
              'js': 'javascript',
              'ts': 'typescript',
              'py': 'python',
              'html': 'html',
              'htm': 'html',
            };
            const detectedLang = langMap[extension];
            if (detectedLang) {
              handleLanguageChange(detectedLang);
            }
          }
        }
      }

      toast({
        title: 'File imported',
        description: `Imported "${file.name}" successfully`,
      });
    };

    reader.onerror = () => {
      toast({
        title: 'Import failed',
        description: 'Could not read the selected file',
        variant: 'destructive',
      });
    };

    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }, [handleContentChange, handleModeChange, handleLanguageChange, toast]);

  // Export content
  const handleExport = useCallback(async (options: ExportOptions) => {
    let content = state.content;
    
    if (options.includeMetadata) {
      const metadata = `---
Mode: ${state.mode}
Language: ${state.language}
Created: ${new Date().toISOString()}
---

`;
      content = metadata + content;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'File exported',
      description: `Exported as "${options.filename}"`,
    });
  }, [state.content, state.mode, state.language, toast]);

  // Version management
  const handleRestoreVersion = useCallback((version: CanvasVersion) => {
    setState(prev => ({
      ...prev,
      content: version.content,
      mode: version.mode,
      language: version.language || prev.language,
      currentVersionId: version.id,
      isVersionHistoryOpen: false,
    }));

    toast({
      title: 'Version restored',
      description: `Restored version "${version.title}"`,
    });
  }, [toast]);

  const handleDeleteVersion = useCallback((versionId: string) => {
    setState(prev => ({
      ...prev,
      versions: prev.versions.filter(v => v.id !== versionId),
      currentVersionId: prev.currentVersionId === versionId ? undefined : prev.currentVersionId,
    }));

    toast({
      title: 'Version deleted',
      description: 'Version removed from history',
    });
  }, [toast]);

  const handleExportVersion = useCallback((version: CanvasVersion) => {
    const filename = `${version.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    handleExport({
      format: 'txt',
      includeMetadata: true,
      filename,
    });
  }, [handleExport]);

  // Keyboard shortcuts
  useEffect(() => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: 's',
        ctrlKey: true,
        action: () => {
          handleSave();
        },
        description: 'Save version',
      },
      {
        key: 'z',
        ctrlKey: true,
        action: () => {
          handleUndo();
        },
        description: 'Undo',
      },
      {
        key: 'y',
        ctrlKey: true,
        action: () => {
          handleRedo();
        },
        description: 'Redo',
      },
      {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        action: () => {
          handleRedo();
        },
        description: 'Redo (alternative)',
      },
    ];

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!event.ctrlKey === !!shortcut.ctrlKey &&
          !!event.altKey === !!shortcut.altKey &&
          !!event.shiftKey === !!shortcut.shiftKey
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo]);

  const showPreview = state.isPreviewEnabled && (state.mode === 'markdown' || state.mode === 'web');

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <CanvasToolbar
        mode={state.mode}
        language={state.language}
        isPreviewEnabled={state.isPreviewEnabled}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        versionCount={state.versions.length}
        onModeChange={handleModeChange}
        onLanguageChange={handleLanguageChange}
        onTogglePreview={() => setState(prev => ({ ...prev, isPreviewEnabled: !prev.isPreviewEnabled }))}
        onSave={handleSave}
        onExport={() => setIsExportDialogOpen(true)}
        onImport={handleImport}
        onShowVersions={() => setState(prev => ({ ...prev, isVersionHistoryOpen: true }))}
        onCopy={handleCopy}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {showPreview ? (
          // Split view for preview modes
          <>
            <div className="flex-1 border-r border-border">
              <CanvasEditor
                content={state.content}
                mode={state.mode}
                language={state.language}
                onChange={handleContentChange}
                className="h-full"
              />
            </div>
            <div className="flex-1">
              <CanvasPreview
                content={state.content}
                mode={state.mode as 'markdown' | 'web'}
                className="h-full"
              />
            </div>
          </>
        ) : (
          // Full editor view
          <div className="flex-1">
            <CanvasEditor
              content={state.content}
              mode={state.mode}
              language={state.language}
              onChange={handleContentChange}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* Version History Dialog */}
      <CanvasVersionHistory
        versions={state.versions}
        currentVersionId={state.currentVersionId}
        isOpen={state.isVersionHistoryOpen}
        onClose={() => setState(prev => ({ ...prev, isVersionHistoryOpen: false }))}
        onRestoreVersion={handleRestoreVersion}
        onDeleteVersion={handleDeleteVersion}
        onExportVersion={handleExportVersion}
      />

      {/* Export Dialog */}
      <CanvasExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExport}
        content={state.content}
        mode={state.mode}
        defaultFilename={`canvas-${state.mode}-${new Date().toISOString().split('T')[0]}.txt`}
      />

      {/* Hidden file input for imports */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.html,.js,.ts,.py,.json,.css,.yaml,.yml"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />
    </div>
  );
}

function generateVersionTitle(content: string, mode: CanvasMode): string {
  const timestamp = new Date().toLocaleString();
  
  if (!content.trim()) {
    return `Empty ${mode} - ${timestamp}`;
  }
  
  // Extract meaningful title from content
  const lines = content.trim().split('\n');
  const firstLine = lines[0]?.trim() || '';
  
  if (mode === 'markdown' && firstLine.startsWith('#')) {
    return firstLine.replace(/^#+\s*/, '') || `Markdown - ${timestamp}`;
  }
  
  if (mode === 'web' && firstLine.includes('<title>')) {
    const titleMatch = firstLine.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1] || `Web Page - ${timestamp}`;
    }
  }
  
  // Fallback to first 50 chars
  const title = firstLine.length > 50 
    ? `${firstLine.substring(0, 50)}...` 
    : firstLine;
    
  return title || `${mode.charAt(0).toUpperCase() + mode.slice(1)} - ${timestamp}`;
}