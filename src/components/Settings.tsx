// Settings Component

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Code2 } from "lucide-react";
import { APP_VERSION, getVersionString } from "@/version";

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Settings({ open, onOpenChange }: SettingsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Application version and build information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Version Info Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Version Information</h3>
            </div>
            <Separator />

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-mono font-semibold">{getVersionString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Environment</p>
                  <p className="font-mono">{APP_VERSION.environment}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Branch</p>
                  <p className="font-mono">{APP_VERSION.commit.branch}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Commit</p>
                  <p className="font-mono text-xs">{APP_VERSION.commit.short}</p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Last Commit</p>
                <p className="text-sm font-medium mb-2">{APP_VERSION.commit.message}</p>
                <p className="text-xs text-muted-foreground">{APP_VERSION.build.timestamp}</p>
              </div>

              {/* Feature Status */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Active Features</p>
                <div className="space-y-1">
                  {Object.entries(APP_VERSION.features).map(([key, enabled]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className={enabled ? "text-green-600" : "text-red-600"}>
                        {enabled ? "✓" : "✗"}
                      </span>
                      <span className="font-mono">{key}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                This version info helps verify code synchronization between GitHub and production environments.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
