'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Download, 
  Copy, 
  FileDown, 
  Share2, 
  Check,
  Printer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CanvasContent, CanvasMode, ExportOptions } from '@/types/canvas';

interface ExportSystemProps {
  content: CanvasContent;
  mode: CanvasMode;
  className?: string;
}

export function ExportSystem({ content, mode, className }: ExportSystemProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const getFileExtension = (canvasMode: CanvasMode): string => {
    switch (canvasMode) {
      case 'markdown': return 'md';
      case 'code': return 'js';
      case 'web': return 'html';
      case 'sandbox': return 'js';
      default: return 'txt';
    }
  };

  const getMimeType = (canvasMode: CanvasMode): string => {
    switch (canvasMode) {
      case 'markdown': return 'text/markdown';
      case 'code': return 'text/javascript';
      case 'web': return 'text/html';
      case 'sandbox': return 'text/javascript';
      default: return 'text/plain';
    }
  };

  const generatePrintContent = useCallback(() => {
    const metadata = `
      <div class="metadata">
        <strong>Title:</strong> ${content.title}<br>
        <strong>Mode:</strong> ${mode}<br>
        <strong>Created:</strong> ${content.lastModified.toLocaleString()}<br>
        <strong>Length:</strong> ${content.content.length} characters
      </div>
    `;

    switch (mode) {
      case 'markdown':
        // Basic markdown to HTML conversion
        const htmlContent = content.content
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*)\*/gim, '<em>$1</em>')
          .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
          .replace(/`([^`]+)`/gim, '<code>$1</code>')
          .replace(/\n/gim, '<br>');
        return `<h1>${content.title}</h1>${htmlContent}${metadata}`;

      case 'code':
        return `
          <h1>${content.title}</h1>
          <pre><code>${content.content}</code></pre>
          ${metadata}
        `;

      case 'web':
        return `
          <h1>${content.title} - HTML Source</h1>
          <pre><code>${content.content}</code></pre>
          ${metadata}
        `;

      case 'sandbox':
        return `
          <h1>${content.title} - Sandbox Code</h1>
          <pre><code>${content.content}</code></pre>
          ${metadata}
        `;

      default:
        return `
          <h1>${content.title}</h1>
          <pre>${content.content}</pre>
          ${metadata}
        `;
    }
  }, [content, mode]);

  const downloadFile = useCallback(async () => {
    const fileExtension = getFileExtension(mode);
    const mimeType = getMimeType(mode);
    const fileName = `${content.title || 'canvas'}.${fileExtension}`;

    const blob = new Blob([content.content], { type: mimeType });
    
    // Use SSR-safe URL and document access
    const { safeCreateObjectURL, safeRevokeObjectURL, safeDocument } = require('@/lib/ssr-utils');
    const url = safeCreateObjectURL(blob);
    const doc = safeDocument();
    
    if (url && doc) {
      const link = doc.createElement('a');
      link.href = url;
      link.download = fileName;
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      safeRevokeObjectURL(url);
    }
  }, [content, mode]);

  const exportToPDF = useCallback(async () => {
    // Create a print-friendly version using SSR-safe window access
    const { safeWindow } = require('@/lib/ssr-utils');
    const win = safeWindow();
    
    if (!win) return;
    
    const printWindow = win.open('', '_blank');
    if (!printWindow) throw new Error('Could not open print window');

    const printContent = generatePrintContent();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${content.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            pre {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              overflow-x: auto;
              font-family: 'Monaco', 'Consolas', monospace;
              white-space: pre-wrap;
            }
            code {
              background: #f0f0f0;
              padding: 2px 5px;
              border-radius: 3px;
              font-family: 'Monaco', 'Consolas', monospace;
            }
            h1, h2, h3 { color: #2c3e50; }
            .metadata {
              color: #666;
              font-size: 0.9em;
              border-top: 1px solid #eee;
              padding-top: 20px;
              margin-top: 40px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }, [content, generatePrintContent]);

  const shareContent = useCallback(async () => {
    // Use SSR-safe navigator and window access
    const { safeNavigator, safeWindow, safeClipboard } = require('@/lib/ssr-utils');
    const nav = safeNavigator();
    const win = safeWindow();
    const clipboard = safeClipboard();
    
    if (nav?.share) {
      try {
        await nav.share({
          title: content.title,
          text: content.content.substring(0, 200) + (content.content.length > 200 ? '...' : ''),
          url: win?.location?.href || ''
        });
      } catch {
        // Fallback to clipboard
        const shareText = `${content.title}\n\n${content.content}`;
        if (clipboard) {
          await clipboard.writeText(shareText);
        }
      }
    } else {
      // Fallback: copy to clipboard
      const shareText = `${content.title}\n\n${content.content}`;
      if (clipboard) {
        await clipboard.writeText(shareText);
      }
    }
  }, [content]);

  const handleExport = useCallback(async (format: ExportOptions['format']) => {
    setIsExporting(true);
    setExportSuccess(null);

    try {
      switch (format) {
        case 'copy':
          // Use SSR-safe clipboard access
          const { safeClipboard } = require('@/lib/ssr-utils');
          const clipboard = safeClipboard();
          
          if (clipboard) {
            await clipboard.writeText(content.content);
            setExportSuccess('Copied to clipboard!');
          } else {
            setExportSuccess('Clipboard not available');
          }
          break;

        case 'download':
          await downloadFile();
          setExportSuccess('File downloaded!');
          break;

        case 'pdf':
          await exportToPDF();
          setExportSuccess('PDF generated!');
          break;

        case 'share':
          await shareContent();
          setExportSuccess('Share link created!');
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportSuccess('Export failed!');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportSuccess(null), 3000);
    }
  }, [content, downloadFile, exportToPDF, shareContent]);

  const exportOptions = [
    { id: 'copy', label: 'Copy to Clipboard', icon: Copy, shortcut: '⌘+C' },
    { id: 'download', label: 'Download File', icon: Download, shortcut: '⌘+S' },
    { id: 'pdf', label: 'Export as PDF', icon: Printer, shortcut: '⌘+P' },
    { id: 'share', label: 'Share Content', icon: Share2, shortcut: '⌘+⇧+S' }
  ];

  return (
    <div className={cn('relative', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting}
          >
            {exportSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Export
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export Options</TooltipContent>
      </Tooltip>

      {showExportMenu && (
        <Card className="absolute top-10 right-0 z-50 w-56">
          <CardContent className="p-2">
            <div className="space-y-1">
              {exportOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleExport(option.id as ExportOptions['format']);
                      setShowExportMenu(false);
                    }}
                    disabled={isExporting}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span className="flex-1 text-left">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.shortcut}</span>
                  </Button>
                );
              })}
            </div>
            
            {exportSuccess && (
              <div className="mt-2 p-2 text-sm text-green-600 bg-green-50 rounded border border-green-200">
                {exportSuccess}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hidden print reference */}
      <div ref={printRef} className="hidden" />
    </div>
  );
}