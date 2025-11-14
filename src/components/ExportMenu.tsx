import { useState } from "react";
import { ArtifactData } from "./Artifact";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Copy,
  FileText,
  Code,
  FileCode,
  Image as ImageIcon,
  Package,
  History,
} from "lucide-react";
import {
  exportAsFile,
  exportToClipboard,
  exportAsHTML,
  exportAsReact,
  exportMermaidAsSVG,
  sanitizeFilename,
  getFileExtension,
  getMimeType,
  exportWithVersionHistory,
  exportImageFromURL,
} from "@/utils/exportArtifact";
import { toast } from "sonner";

interface ExportMenuProps {
  artifact: ArtifactData;
  injectedCDNs?: string;
  versions?: Array<{ version_number: number; artifact_content: string; created_at: string }>;
}

export const ExportMenu = ({ artifact, injectedCDNs = '', versions = [] }: ExportMenuProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleCopyToClipboard = async () => {
    await exportToClipboard(artifact.content);
  };

  const handleExportAsText = () => {
    const extension = getFileExtension(artifact.type, artifact.language);
    const filename = sanitizeFilename(`${artifact.title}.${extension}`);
    const mimeType = getMimeType(extension);
    exportAsFile(artifact.content, filename, mimeType);
  };

  const handleExportAsHTML = () => {
    if (artifact.type === 'html' || artifact.type === 'code') {
      const htmlContent = exportAsHTML(
        artifact.content,
        artifact.title,
        true,
        injectedCDNs
      );
      const filename = sanitizeFilename(`${artifact.title}.html`);
      exportAsFile(htmlContent, filename, 'text/html');
    } else {
      toast.error('Only HTML and code artifacts can be exported as HTML');
    }
  };

  const handleExportAsReact = () => {
    if (artifact.type === 'react') {
      const reactContent = exportAsReact(artifact.content, artifact.title);
      const filename = sanitizeFilename(`${artifact.title}.jsx`);
      exportAsFile(reactContent, filename, 'text/javascript');
    } else {
      toast.error('Only React artifacts can be exported as JSX');
    }
  };

  const handleExportMermaidAsSVG = async () => {
    if (artifact.type === 'mermaid') {
      setIsExporting(true);
      try {
        const svg = await exportMermaidAsSVG(artifact.content, artifact.title);
        const filename = sanitizeFilename(`${artifact.title}.svg`);
        exportAsFile(svg, filename, 'image/svg+xml');
      } catch (error) {
        toast.error('Failed to export Mermaid diagram as SVG');
      } finally {
        setIsExporting(false);
      }
    } else {
      toast.error('Only Mermaid artifacts can be exported as SVG');
    }
  };

  const handleExportMermaidAsSource = () => {
    if (artifact.type === 'mermaid') {
      const filename = sanitizeFilename(`${artifact.title}.mmd`);
      exportAsFile(artifact.content, filename, 'text/plain');
    }
  };

  const handleExportSVG = () => {
    if (artifact.type === 'svg') {
      const filename = sanitizeFilename(`${artifact.title}.svg`);
      exportAsFile(artifact.content, filename, 'image/svg+xml');
    } else {
      toast.error('Only SVG artifacts can be exported as SVG files');
    }
  };

  const handleExportImage = async () => {
    if (artifact.type === 'image') {
      const filename = sanitizeFilename(`${artifact.title}.png`);
      await exportImageFromURL(artifact.content, filename);
    } else {
      toast.error('Only image artifacts can be exported as images');
    }
  };

  const handleExportMarkdown = () => {
    if (artifact.type === 'markdown') {
      const filename = sanitizeFilename(`${artifact.title}.md`);
      exportAsFile(artifact.content, filename, 'text/markdown');
    } else {
      toast.error('Only Markdown artifacts can be exported as .md files');
    }
  };

  const handleExportWithVersions = () => {
    if (versions.length > 0) {
      exportWithVersionHistory(artifact, versions);
    } else {
      toast.error('No version history available');
    }
  };

  // Determine available export options based on artifact type
  const showHTMLExport = artifact.type === 'html' || artifact.type === 'code';
  const showReactExport = artifact.type === 'react';
  const showMermaidExports = artifact.type === 'mermaid';
  const showSVGExport = artifact.type === 'svg';
  const showImageExport = artifact.type === 'image';
  const showMarkdownExport = artifact.type === 'markdown';
  const showVersionHistory = versions.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Export artifact"
          disabled={isExporting}
        >
          {isExporting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Download className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Copy to clipboard - available for all types */}
        <DropdownMenuItem onClick={handleCopyToClipboard}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy to Clipboard</span>
        </DropdownMenuItem>

        {/* Export as source file - available for all types */}
        <DropdownMenuItem onClick={handleExportAsText}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Download Source (.{getFileExtension(artifact.type, artifact.language)})</span>
        </DropdownMenuItem>

        {/* Type-specific exports */}
        {showHTMLExport && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportAsHTML}>
              <Code className="mr-2 h-4 w-4" />
              <span>Export as Standalone HTML</span>
            </DropdownMenuItem>
          </>
        )}

        {showReactExport && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportAsReact}>
              <FileCode className="mr-2 h-4 w-4" />
              <span>Export as JSX Component</span>
            </DropdownMenuItem>
          </>
        )}

        {showMermaidExports && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportMermaidAsSource}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Download Mermaid Source (.mmd)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportMermaidAsSVG}>
              <ImageIcon className="mr-2 h-4 w-4" />
              <span>Export Rendered as SVG</span>
            </DropdownMenuItem>
          </>
        )}

        {showSVGExport && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportSVG}>
              <ImageIcon className="mr-2 h-4 w-4" />
              <span>Download SVG</span>
            </DropdownMenuItem>
          </>
        )}

        {showImageExport && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportImage}>
              <ImageIcon className="mr-2 h-4 w-4" />
              <span>Download Image</span>
            </DropdownMenuItem>
          </>
        )}

        {showMarkdownExport && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportMarkdown}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Download Markdown (.md)</span>
            </DropdownMenuItem>
          </>
        )}

        {/* Version history export */}
        {showVersionHistory && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportWithVersions}>
              <History className="mr-2 h-4 w-4" />
              <span>Export with Versions (JSON)</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
