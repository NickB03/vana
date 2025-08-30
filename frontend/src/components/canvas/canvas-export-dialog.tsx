'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  File, 
  Globe, 
  FileImage,
  Copy,
  CheckCircle
} from 'lucide-react';
import { ExportOptions } from './types';

interface CanvasExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  content: string;
  mode: string;
  defaultFilename: string;
}

const exportFormats = [
  { value: 'txt', label: 'Plain Text (.txt)', icon: File },
  { value: 'md', label: 'Markdown (.md)', icon: FileText },
  { value: 'html', label: 'HTML (.html)', icon: Globe },
  { value: 'pdf', label: 'PDF (.pdf)', icon: FileImage },
];

export function CanvasExportDialog({
  isOpen,
  onClose,
  onExport,
  content,
  mode,
  defaultFilename,
}: CanvasExportDialogProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'txt',
    includeMetadata: true,
    filename: defaultFilename,
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(exportOptions);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  };

  const getPreviewContent = () => {
    let previewContent = content;
    
    if (exportOptions.includeMetadata) {
      const metadata = `---
Mode: ${mode}
Created: ${new Date().toISOString()}
Filename: ${exportOptions.filename}
---

`;
      previewContent = metadata + content;
    }
    
    return previewContent;
  };

  const estimatedSize = new Blob([getPreviewContent()]).size;
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Content
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6">
          {/* Export Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select 
              value={exportOptions.format} 
              onValueChange={(value: 'txt' | 'md' | 'html' | 'pdf') => 
                setExportOptions(prev => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exportFormats.map((format) => {
                  const Icon = format.icon;
                  return (
                    <SelectItem key={format.value} value={format.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {format.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={exportOptions.filename}
              onChange={(e) => 
                setExportOptions(prev => ({ ...prev, filename: e.target.value }))
              }
              placeholder="Enter filename..."
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Export Options</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-metadata"
                checked={exportOptions.includeMetadata}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ 
                    ...prev, 
                    includeMetadata: checked as boolean 
                  }))
                }
              />
              <Label 
                htmlFor="include-metadata" 
                className="text-sm font-normal cursor-pointer"
              >
                Include metadata (creation date, mode, etc.)
              </Label>
            </div>
          </div>

          {/* File Info */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm">
              <span className="text-muted-foreground">Estimated size:</span>{' '}
              <Badge variant="secondary">{formatSize(estimatedSize)}</Badge>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Lines:</span>{' '}
              <Badge variant="secondary">{content.split('\n').length}</Badge>
            </div>
          </div>

          {/* Preview Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyContent}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Content
                </>
              )}
            </Button>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <Textarea
                value={getPreviewContent()}
                readOnly
                className="min-h-32 font-mono text-sm"
                placeholder="Content preview..."
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || !exportOptions.filename.trim()}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}