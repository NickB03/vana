import { memo } from "react";
import { Copy, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { ArtifactAction, ArtifactClose } from '@/components/ai-elements/artifact';
import { ExportMenu } from "./ExportMenu";
import { ArtifactData } from "./ArtifactContainer";

interface ArtifactToolbarProps {
  artifact: ArtifactData;
  injectedCDNs: string;
  isMaximized: boolean;
  onCopy: () => void;
  onPopOut: () => void;
  onToggleMaximize: () => void;
  onClose?: () => void;
}

export const ArtifactToolbar = memo(({
  artifact,
  injectedCDNs,
  isMaximized,
  onCopy,
  onPopOut,
  onToggleMaximize,
  onClose
}: ArtifactToolbarProps) => {
  return (
    <>
      <ArtifactAction
        icon={Copy}
        label="Copy code"
        tooltip="Copy to clipboard"
        onClick={onCopy}
      />
      <ExportMenu artifact={artifact} injectedCDNs={injectedCDNs} />
      <ArtifactAction
        icon={ExternalLink}
        label="Pop out"
        tooltip="Open in new window"
        onClick={onPopOut}
      />
      <ArtifactAction
        icon={isMaximized ? Minimize2 : Maximize2}
        label={isMaximized ? "Minimize" : "Maximize"}
        tooltip={isMaximized ? "Minimize" : "Maximize"}
        onClick={onToggleMaximize}
      />
      {onClose && <ArtifactClose onClick={onClose} />}
    </>
  );
});

ArtifactToolbar.displayName = "ArtifactToolbar";
