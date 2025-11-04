import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock, Sparkles, History, Cloud } from "lucide-react";

interface GuestLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal dialog shown when guest user reaches message limit
 * Encourages sign-up with feature highlights
 */
export const GuestLimitDialog = ({ open, onOpenChange }: GuestLimitDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-primary/10 mx-auto mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            You've used all 5 free messages
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Sign in to continue chatting and unlock premium features
          </DialogDescription>
        </DialogHeader>

        {/* Feature highlights */}
        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Unlimited messages</p>
              <p className="text-sm text-muted-foreground">
                Chat without limits and generate unlimited artifacts
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
              <History className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Save conversation history</p>
              <p className="text-sm text-muted-foreground">
                Access your chats anytime, anywhere
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
              <Cloud className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Sync across devices</p>
              <p className="text-sm text-muted-foreground">
                Continue conversations on any device seamlessly
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            className="w-full bg-gradient-primary hover:opacity-90"
            asChild
          >
            <Link to="/auth">Sign In to Continue</Link>
          </Button>
          <Button
            variant="outline"
            className="w-full"
            asChild
          >
            <Link to="/signup">Create Free Account</Link>
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-center text-muted-foreground pt-2">
          ✓ No credit card required • ✓ Free forever plan
        </p>
      </DialogContent>
    </Dialog>
  );
};
