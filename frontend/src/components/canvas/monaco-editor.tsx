'use client';

import React, { useRef, useCallback, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Copy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonacoEditorOptions } from '@/types/canvas';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: 'vs-dark' | 'light';
  options?: Partial<MonacoEditorOptions>;
  className?: string;
  readOnly?: boolean;
  height?: string | number;
  onCursorChange?: (position: { lineNumber: number; column: number }) => void;
  onSelectionChange?: (selection: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }) => void;
}

export function MonacoEditor({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  options = {},
  className,
  readOnly = false,
  height = '100%',
  onCursorChange,
  onSelectionChange
}: MonacoEditorProps) {
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Handle properties that might have incompatible types in options
  const { minimap: _, wordWrap: optionsWordWrap, ...otherOptions } = options;
  const minimapConfig = readOnly ? { enabled: false } : { enabled: true };
  const wordWrapConfig = optionsWordWrap === false ? 'off' : 'on';
  
  const defaultOptions = {
    wordWrap: wordWrapConfig as 'off' | 'on',
    minimap: minimapConfig,
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on' as const,
    renderWhitespace: 'selection' as const,
    selectOnLineNumbers: true,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    folding: true,
    foldingStrategy: 'indentation' as const,
    showFoldingControls: 'mouseover' as const,
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: 'active' as const,
      indentation: true
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on' as const,
    quickSuggestions: true,
    parameterHints: { enabled: true },
    hover: { enabled: true },
    contextmenu: true,
    mouseWheelZoom: true,
    ...otherOptions
  };

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    setIsLoaded(true);

    // Configure CSP-compliant Monaco setup
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false
    });

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false
    });

    // Set compiler options
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowJs: true,
      typeRoots: ['node_modules/@types']
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      allowJs: true,
      typeRoots: ['node_modules/@types'],
      strict: true
    });

    // Add common type definitions
    const commonTypes = `
      declare global {
        interface Window {
          [key: string]: any;
        }
        const console: {
          log(...args: any[]): void;
          error(...args: any[]): void;
          warn(...args: any[]): void;
          info(...args: any[]): void;
        };
        const document: any;
        const window: Window;
      }
      export {};
    `;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(commonTypes, 'common.d.ts');
    monaco.languages.typescript.typescriptDefaults.addExtraLib(commonTypes, 'common.d.ts');

    // Configure themes
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'regexp', foreground: 'D16969' }
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editor.lineHighlightBackground': '#2D2D30',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41'
      }
    });

    // Set up keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Trigger save event
      const event = new CustomEvent('monaco-save', { detail: { content: editor.getValue() } });
      window.dispatchEvent(event);
    });

    // Configure content change handling
    editor.onDidChangeModelContent(() => {
      const content = editor.getValue();
      onChange(content);
    });

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({
          lineNumber: e.position.lineNumber,
          column: e.position.column
        });
      }
    });

    // Track selection changes
    editor.onDidChangeCursorSelection((e) => {
      if (onSelectionChange && !e.selection.isEmpty()) {
        onSelectionChange({
          startLineNumber: e.selection.startLineNumber,
          startColumn: e.selection.startColumn,
          endLineNumber: e.selection.endLineNumber,
          endColumn: e.selection.endColumn
        });
      }
    });
  }, [onChange, onCursorChange, onSelectionChange]);

  const copyToClipboard = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.getValue();
      navigator.clipboard.writeText(content);
    }
  }, []);

  const downloadFile = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.getValue();
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code.${getFileExtension(language)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [language]);

  const getFileExtension = (lang: string): string => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      html: 'html',
      css: 'css',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      markdown: 'md',
      json: 'json',
      yaml: 'yml',
      xml: 'xml'
    };
    return extensions[lang] || 'txt';
  };

  const formatDocument = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  }, []);

  return (
    <div className={cn('relative h-full', className)}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading Monaco Editor...</span>
            </div>
          </Card>
        </div>
      )}

      {/* Editor Controls */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="h-8 w-8 p-0"
        >
          <Copy className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={downloadFile}
          className="h-8 w-8 p-0"
        >
          <Download className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="h-8 w-8 p-0"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-12 right-2 z-30 w-64 p-3 bg-background border rounded-md shadow-lg">
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Editor Settings</div>
            <Button
              variant="outline"
              size="sm"
              onClick={formatDocument}
              className="w-full"
            >
              Format Document
            </Button>
          </div>
        </div>
      )}

      <Editor
        height={height}
        value={value}
        language={language}
        theme={theme === 'light' ? 'light' : 'custom-dark'}
        options={{
          ...defaultOptions,
          readOnly
        }}
        onMount={handleEditorMount}
        loading={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }
      />
    </div>
  );
}