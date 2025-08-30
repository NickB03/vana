'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Code, 
  Globe, 
  Play, 
  Download, 
  Upload, 
  History, 
  Eye, 
  EyeOff,
  Save,
  Copy,
  Undo2,
  Redo2
} from 'lucide-react';
import { CanvasMode, CodeLanguage } from './types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CanvasToolbarProps {
  mode: CanvasMode;
  language: CodeLanguage;
  isPreviewEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  versionCount: number;
  onModeChange: (mode: CanvasMode) => void;
  onLanguageChange: (language: CodeLanguage) => void;
  onTogglePreview: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onShowVersions: () => void;
  onCopy: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

const modeIcons = {
  markdown: FileText,
  code: Code,
  web: Globe,
  sandbox: Play,
};

const modeLabels = {
  markdown: 'Markdown',
  code: 'Code',
  web: 'Web',
  sandbox: 'Sandbox',
};

const codeLanguages: CodeLanguage[] = [
  'javascript',
  'typescript', 
  'python',
  'html',
  'css',
  'json',
  'sql',
  'yaml',
  'markdown'
];

export function CanvasToolbar({
  mode,
  language,
  isPreviewEnabled,
  canUndo,
  canRedo,
  versionCount,
  onModeChange,
  onLanguageChange,
  onTogglePreview,
  onSave,
  onExport,
  onImport,
  onShowVersions,
  onCopy,
  onUndo,
  onRedo,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-border bg-background/50 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {/* Mode Selector */}
        <Tabs value={mode} onValueChange={(value) => onModeChange(value as CanvasMode)} className="w-auto">
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(modeIcons).map(([modeKey, Icon]) => (
              <TabsTrigger
                key={modeKey}
                value={modeKey}
                className="flex items-center gap-2 min-w-0"
                aria-label={modeLabels[modeKey as CanvasMode]}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {modeLabels[modeKey as CanvasMode]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Separator orientation="vertical" className="h-6" />

        {/* Language Selector (for Code mode) */}
        {mode === 'code' && (
          <>
            <Select value={language} onValueChange={(value) => onLanguageChange(value as CodeLanguage)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {codeLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        {/* Preview Toggle (for Markdown and Web modes) */}
        {(mode === 'markdown' || mode === 'web') && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePreview}
              className="flex items-center gap-2"
              aria-pressed={isPreviewEnabled}
              aria-label={isPreviewEnabled ? 'Hide preview' : 'Show preview'}
            >
              {isPreviewEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {isPreviewEnabled ? 'Hide Preview' : 'Show Preview'}
              </span>
            </Button>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className="hidden sm:flex items-center gap-2"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            className="hidden sm:flex items-center gap-2"
          >
            <Redo2 className="w-4 h-4" />
            Redo
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Version History */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowVersions}
          className="flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">History</span>
          {versionCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {versionCount}
            </Badge>
          )}
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* File Actions */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onImport}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Import</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        
        <Button
          onClick={onSave}
          size="sm"
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Save</span>
        </Button>
      </div>
    </div>
  );
}