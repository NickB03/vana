import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  useMessageFeedback,
  type FeedbackRating,
  type FeedbackCategory,
  type MessageFeedback as MessageFeedbackType,
} from "@/hooks/useMessageFeedback";

export interface MessageFeedbackProps {
  messageId: string;
  sessionId: string;
  className?: string;
}

/**
 * MessageFeedback Component
 *
 * Allows users to provide thumbs up/down feedback on assistant messages.
 * Features:
 * - Simple thumbs up/down buttons
 * - Optional feedback categories for negative ratings
 * - Optional comment textarea
 * - Disabled state after submission
 * - Loading state during submission
 *
 * Should be displayed after assistant messages only in the chat interface.
 *
 * @example
 * // Add to ChatInterface.tsx after assistant message content
 * <MessageFeedback
 *   messageId={message.id}
 *   sessionId={message.session_id}
 * />
 */
export function MessageFeedback({
  messageId,
  sessionId,
  className,
}: MessageFeedbackProps) {
  const { submitFeedback, getFeedbackForMessage, isLoading } = useMessageFeedback();
  const [existingFeedback, setExistingFeedback] = useState<MessageFeedbackType | null>(null);
  const [selectedRating, setSelectedRating] = useState<FeedbackRating | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null);
  const [comment, setComment] = useState("");
  const [showNegativeFeedback, setShowNegativeFeedback] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Check if user already submitted feedback
  useEffect(() => {
    async function checkExistingFeedback() {
      const feedback = await getFeedbackForMessage(messageId);
      if (feedback) {
        setExistingFeedback(feedback);
        setSelectedRating(feedback.rating);
        setIsSubmitted(true);
      }
    }
    checkExistingFeedback();
  }, [messageId, getFeedbackForMessage]);

  const handleRatingClick = async (rating: FeedbackRating) => {
    if (isSubmitted || isLoading) return;

    setSelectedRating(rating);

    if (rating === 'positive') {
      // Submit immediately for positive feedback
      const result = await submitFeedback({
        messageId,
        sessionId,
        rating: 'positive',
      });

      if (result) {
        setIsSubmitted(true);
        setExistingFeedback(result);
      }
    } else {
      // Show category/comment form for negative feedback
      setShowNegativeFeedback(true);
    }
  };

  const handleSubmitNegativeFeedback = async () => {
    if (!selectedRating || isLoading) return;

    const result = await submitFeedback({
      messageId,
      sessionId,
      rating: selectedRating,
      category: selectedCategory || undefined,
      comment: comment.trim() || undefined,
    });

    if (result) {
      setIsSubmitted(true);
      setExistingFeedback(result);
      setShowNegativeFeedback(false);
    }
  };

  const handleCancelNegativeFeedback = () => {
    setSelectedRating(null);
    setSelectedCategory(null);
    setComment("");
    setShowNegativeFeedback(false);
  };

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {/* Thumbs up/down buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-sm",
            selectedRating === 'positive' && "bg-green-500/10 text-green-600 hover:bg-green-500/20",
            isSubmitted && "cursor-not-allowed"
          )}
          onClick={() => handleRatingClick('positive')}
          disabled={isSubmitted || isLoading}
          aria-label="Helpful response"
          title="Helpful response"
        >
          {isLoading && selectedRating === 'positive' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ThumbsUp className="h-3.5 w-3.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-sm",
            selectedRating === 'negative' && "bg-red-500/10 text-red-600 hover:bg-red-500/20",
            isSubmitted && "cursor-not-allowed"
          )}
          onClick={() => handleRatingClick('negative')}
          disabled={isSubmitted || isLoading}
          aria-label="Not helpful"
          title="Not helpful"
        >
          {isLoading && selectedRating === 'negative' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ThumbsDown className="h-3.5 w-3.5" />
          )}
        </Button>

        {isLoading && (
          <span className="text-xs text-muted-foreground ml-2">Submitting...</span>
        )}
        {isSubmitted && (
          <span className="text-xs text-muted-foreground ml-2">
            Thank you for your feedback!
          </span>
        )}
      </div>

      {/* Negative feedback details */}
      {showNegativeFeedback && !isSubmitted && (
        <Collapsible open={showNegativeFeedback} className="space-y-3">
          <CollapsibleContent className="space-y-3">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3">
              {/* Category selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  What was the issue? (optional)
                </Label>
                <RadioGroup
                  value={selectedCategory || ""}
                  onValueChange={(value) => setSelectedCategory(value as FeedbackCategory)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inaccurate" id="inaccurate" />
                    <Label htmlFor="inaccurate" className="text-xs font-normal cursor-pointer">
                      Inaccurate
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unhelpful" id="unhelpful" />
                    <Label htmlFor="unhelpful" className="text-xs font-normal cursor-pointer">
                      Unhelpful
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="incomplete" id="incomplete" />
                    <Label htmlFor="incomplete" className="text-xs font-normal cursor-pointer">
                      Incomplete
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="off_topic" id="off_topic" />
                    <Label htmlFor="off_topic" className="text-xs font-normal cursor-pointer">
                      Off-topic
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Optional comment */}
              <div className="space-y-2">
                <Label htmlFor="feedback-comment" className="text-xs font-medium">
                  Additional details (optional)
                </Label>
                <Textarea
                  id="feedback-comment"
                  placeholder="Tell us more about what went wrong..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[60px] text-xs resize-none"
                  maxLength={500}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {comment.length}/500
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelNegativeFeedback}
                  disabled={isLoading}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSubmitNegativeFeedback}
                  disabled={isLoading}
                  className="h-7 text-xs"
                >
                  {isLoading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
