import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, UserPlus } from "lucide-react";

interface RateLimitPopupProps {
  isOpen: boolean;
  resetAt?: string;
  onSignIn: () => void;
  onDismiss: () => void;
}

export function RateLimitPopup({ isOpen, resetAt, onSignIn, onDismiss }: RateLimitPopupProps) {
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !resetAt) {
      setCountdown("");
      return;
    }

    const resetDate = new Date(resetAt);

    const updateCountdown = () => {
      const now = new Date();
      const diff = resetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("Now");
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isOpen, resetAt]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Rate Limit Reached
          </DialogTitle>
          <DialogDescription>
            You've reached the maximum number of messages for guests. Sign in to continue chatting without limits.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {countdown && (
            <div className="text-sm text-muted-foreground mb-2">
              Rate limit resets in: <span className="font-mono font-semibold text-foreground">{countdown}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onDismiss} className="w-full sm:w-auto">
            Dismiss
          </Button>
          <Button onClick={onSignIn} className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}