// Phase 7: Settings Component

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon, Shield, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Settings({ open, onOpenChange }: SettingsProps) {
  const [autoApprove, setAutoApprove] = useState(false);
  const [approvedLibraries, setApprovedLibraries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      if (data) {
        setAutoApprove(data.auto_approve_libraries);
        const libs = data.approved_libraries;
        setApprovedLibraries(Array.isArray(libs) ? libs.filter((lib): lib is string => typeof lib === 'string') : []);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load preferences",
        variant: "destructive"
      });
    }
  };

  const savePreferences = async (autoApproveValue: boolean) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          auto_approve_libraries: autoApproveValue,
          approved_libraries: approvedLibraries
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Preferences saved successfully"
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoApproveChange = async (checked: boolean) => {
    setAutoApprove(checked);
    await savePreferences(checked);
  };

  const clearApprovedLibraries = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_preferences')
        .update({
          approved_libraries: []
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setApprovedLibraries([]);
      toast({
        title: "Success",
        description: "Cleared all approved libraries"
      });
    } catch (error) {
      console.error('Error clearing libraries:', error);
      toast({
        title: "Error",
        description: "Failed to clear approved libraries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your preferences and security settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Artifact Libraries Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Artifact Libraries</h3>
            </div>
            <Separator />

            <div className="space-y-4">
              {/* Auto-approve toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <Label htmlFor="auto-approve" className="cursor-pointer">
                    Auto-approve CDN libraries
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          When enabled, artifacts can automatically load external libraries from trusted CDNs
                          without asking for approval each time. Only enable if you trust the AI-generated content.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="auto-approve"
                  checked={autoApprove}
                  onCheckedChange={handleAutoApproveChange}
                  disabled={loading}
                />
              </div>

              {/* Approved libraries list */}
              {approvedLibraries.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Previously Approved Libraries ({approvedLibraries.length})
                  </Label>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                    {approvedLibraries.map((lib, index) => (
                      <div key={index} className="text-sm font-mono">
                        {lib}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearApprovedLibraries}
                    disabled={loading}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Approved Libraries
                  </Button>
                </div>
              )}

              {/* Security notice */}
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-sm">
                <p className="font-medium mb-1">Security Notice</p>
                <p className="text-muted-foreground">
                  External libraries can execute code in your browser. Only approve libraries from trusted sources.
                  We only allow CDNs from cdnjs.cloudflare.com, unpkg.com, and cdn.jsdelivr.net.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
