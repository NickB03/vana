'use client';

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Clock, 
  FileText, 
  Code, 
  Globe, 
  Play, 
  Download, 
  Trash2,
  Eye,
  RotateCcw
} from 'lucide-react';
import { CanvasVersion } from './types';

interface CanvasVersionHistoryProps {
  versions: CanvasVersion[];
  currentVersionId?: string;
  isOpen: boolean;
  onClose: () => void;
  onRestoreVersion: (version: CanvasVersion) => void;
  onDeleteVersion: (versionId: string) => void;
  onExportVersion: (version: CanvasVersion) => void;
}

const modeIcons = {
  markdown: FileText,
  code: Code,
  web: Globe,
  sandbox: Play,
};

const modeColors = {
  markdown: 'bg-blue-500/10 text-blue-500',
  code: 'bg-green-500/10 text-green-500',
  web: 'bg-purple-500/10 text-purple-500',
  sandbox: 'bg-orange-500/10 text-orange-500',
};

export function CanvasVersionHistory({
  versions,
  currentVersionId,
  isOpen,
  onClose,
  onRestoreVersion,
  onDeleteVersion,
  onExportVersion,
}: CanvasVersionHistoryProps) {
  const [previewVersion, setPreviewVersion] = useState<CanvasVersion | null>(null);
  
  const sortedVersions = [...versions].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const getContentPreview = (content: string, maxLength: number = 100) => {
    const stripped = content.replace(/\n/g, ' ').trim();
    return stripped.length > maxLength 
      ? `${stripped.substring(0, maxLength)}...` 
      : stripped;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Version History
              <Badge variant="secondary">{versions.length} versions</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-3 p-1">
              {sortedVersions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No versions saved yet</p>
                </div>
              ) : (
                sortedVersions.map((version) => {
                  const ModeIcon = modeIcons[version.mode];
                  const isCurrentVersion = version.id === currentVersionId;
                  
                  return (
                    <div
                      key={version.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        isCurrentVersion 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-1.5 rounded ${modeColors[version.mode]}`}>
                              <ModeIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">
                                {version.title}
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatTimestamp(version.timestamp)}</span>
                                {version.language && (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize">{version.language}</span>
                                  </>
                                )}
                                {isCurrentVersion && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-xs">
                                      Current
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {getContentPreview(version.content)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewVersion(version)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {!isCurrentVersion && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRestoreVersion(version)}
                              className="h-8 w-8 p-0"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExportVersion(version)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteVersion(version.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            disabled={isCurrentVersion}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Version Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewVersion && (
                <>
                  <div className={`p-1.5 rounded ${modeColors[previewVersion.mode]}`}>
                    {(() => {
                      const Icon = modeIcons[previewVersion.mode];
                      return <Icon className="w-4 h-4" />;
                    })()}
                  </div>
                  {previewVersion.title}
                  <Badge variant="secondary">
                    {formatTimestamp(previewVersion.timestamp)}
                  </Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {previewVersion && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 border rounded-lg bg-muted/30">
                <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                  {previewVersion.content}
                </pre>
              </div>
            </ScrollArea>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setPreviewVersion(null)}>
              Close
            </Button>
            {previewVersion && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onExportVersion(previewVersion)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                {previewVersion.id !== currentVersionId && (
                  <Button
                    onClick={() => {
                      onRestoreVersion(previewVersion);
                      setPreviewVersion(null);
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore This Version
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}