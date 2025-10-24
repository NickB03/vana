// Phase 7: Library Approval Dialog

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, Shield } from "lucide-react";
import { useState } from "react";

export interface DetectedLibrary {
  name: string;
  version?: string;
  url: string;
  purpose: string;
  cdnProvider: string;
}

interface LibraryApprovalDialogProps {
  open: boolean;
  libraries: DetectedLibrary[];
  onApprove: (rememberDecision: boolean) => void;
  onDeny: () => void;
}

export function LibraryApprovalDialog({
  open,
  libraries,
  onApprove,
  onDeny
}: LibraryApprovalDialogProps) {
  const [rememberDecision, setRememberDecision] = useState(false);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-warning" />
            <AlertDialogTitle>Library Approval Required</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This artifact requires loading external libraries from CDNs. Review the libraries below before approving.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 my-4">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Security Notice</p>
              External libraries can execute code in your browser. Only approve libraries from trusted CDN providers.
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Libraries to Load:</h4>
            {libraries.map((lib, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium">{lib.name}</h5>
                      {lib.version && (
                        <Badge variant="secondary" className="text-xs">
                          v{lib.version}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {lib.cdnProvider}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{lib.purpose}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <ExternalLink className="h-3 w-3" />
                  <a
                    href={lib.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {lib.url}
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="remember"
              checked={rememberDecision}
              onCheckedChange={(checked) => setRememberDecision(checked === true)}
            />
            <Label
              htmlFor="remember"
              className="text-sm font-normal cursor-pointer"
            >
              Auto-approve these libraries in the future
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDeny}>Deny</AlertDialogCancel>
          <AlertDialogAction onClick={() => onApprove(rememberDecision)}>
            Approve & Load
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
