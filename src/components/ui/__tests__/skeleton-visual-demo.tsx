/**
 * Visual Demo for Skeleton Primitives & Loading States
 *
 * This file demonstrates usage of Tier 1 skeleton components
 * AND loading state patterns for buttons/feedback.
 * Not imported anywhere - for documentation/reference only.
 */

import { useState } from 'react';
import { SkeletonLine } from '../skeleton-line';
import { SkeletonParagraph } from '../skeleton-paragraph';
import { SkeletonAvatar } from '../skeleton-avatar';
import { SkeletonCard } from '../skeleton-card';
import { Button } from '../button';
import { Loader2, ThumbsUp, ThumbsDown, Send, LogIn } from 'lucide-react';

export function SkeletonPrimitivesDemo() {
  return (
    <div className="space-y-8 p-8 max-w-2xl mx-auto">
      {/* SkeletonLine Demo */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">SkeletonLine</h2>
        <div className="space-y-2">
          <SkeletonLine width="full" />
          <SkeletonLine width="3/4" />
          <SkeletonLine width="2/3" />
          <SkeletonLine width="1/2" />
          <SkeletonLine width="1/3" />
          <SkeletonLine width="1/4" />
        </div>
      </section>

      {/* SkeletonParagraph Demo */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">SkeletonParagraph</h2>
        <SkeletonParagraph lines={3} />
        <SkeletonParagraph lines={5} />
      </section>

      {/* SkeletonAvatar Demo */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">SkeletonAvatar</h2>
        <div className="flex gap-4 items-center">
          <SkeletonAvatar size="sm" />
          <SkeletonAvatar size="md" />
          <SkeletonAvatar size="lg" />
        </div>
      </section>

      {/* SkeletonCard Demo */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">SkeletonCard</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard hasImage={true} />
          <SkeletonCard hasImage={false} />
        </div>
      </section>

      {/* Common Patterns */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Common Pattern: Avatar + Text</h2>
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="md" />
          <div className="space-y-2 flex-1">
            <SkeletonLine width="1/3" />
            <SkeletonLine width="1/4" className="h-3" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Common Pattern: List Items</h2>
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={`list-${i}`} className="flex items-center gap-3 p-3 border rounded">
              <SkeletonAvatar size="sm" />
              <div className="flex-1">
                <SkeletonLine width="2/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * =============================================================================
 * LOADING STATE DEMOS
 * =============================================================================
 * These demonstrate proper loading patterns for buttons and feedback components.
 */

/**
 * Demo: Feedback Submission with Spinner
 *
 * Shows how to add a spinner to feedback buttons during submission.
 * This pattern should be applied to MessageFeedback.tsx
 */
export function FeedbackSpinnerDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState<'positive' | 'negative' | null>(null);

  const simulateSubmit = async (rating: 'positive' | 'negative') => {
    setIsLoading(true);
    setSelectedRating(rating);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 p-8 max-w-md mx-auto">
      <h2 className="text-lg font-semibold">Feedback with Spinner</h2>

      {/* Current implementation (no spinner) */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">❌ Current (text only):</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLoading}>
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLoading}>
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
          {isLoading && (
            <span className="text-xs text-muted-foreground">Submitting...</span>
          )}
        </div>
      </div>

      {/* Improved implementation (with spinner) */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">✅ Improved (with spinner):</p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 relative"
            disabled={isLoading}
            onClick={() => simulateSubmit('positive')}
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
            className="h-7 w-7 relative"
            disabled={isLoading}
            onClick={() => simulateSubmit('negative')}
          >
            {isLoading && selectedRating === 'negative' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ThumbsDown className="h-3.5 w-3.5" />
            )}
          </Button>
          {isLoading && (
            <span className="text-xs text-muted-foreground ml-1">
              Submitting feedback...
            </span>
          )}
        </div>
      </div>

      {/* Alternative: Overlay spinner on the whole feedback area */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">✅ Alternative (subtle overlay):</p>
        <div className={`flex items-center gap-2 p-2 rounded transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isLoading}
            onClick={() => simulateSubmit('positive')}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isLoading}
            onClick={() => simulateSubmit('negative')}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Demo: Login Button with Loader2 Icon
 *
 * Shows proper button loading states with spinner icons.
 * This pattern should be applied consistently to LoginForm.tsx
 */
export function LoginButtonDemo() {
  const [isLoading, setIsLoading] = useState(false);

  const simulateLogin = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 p-8 max-w-md mx-auto">
      <h2 className="text-lg font-semibold">Login Button with Loader2</h2>

      {/* Current implementation (text only) */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">❌ Current (text change only):</p>
        <Button className="w-full" disabled={isLoading}>
          {isLoading ? "Loading..." : "Login"}
        </Button>
      </div>

      {/* Improved implementation (with Loader2 spinner) */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">✅ Improved (with Loader2 spinner):</p>
        <Button
          className="w-full"
          disabled={isLoading}
          onClick={simulateLogin}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </>
          )}
        </Button>
      </div>

      {/* Submit button variant */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">✅ Submit button variant:</p>
        <Button
          className="w-full"
          disabled={isLoading}
          onClick={simulateLogin}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Feedback
            </>
          )}
        </Button>
      </div>

      {/* Icon-only button (for compact spaces) */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">✅ Icon-only variant:</p>
        <div className="flex gap-2">
          <Button
            size="icon"
            disabled={isLoading}
            onClick={simulateLogin}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            (Icon swaps to spinner when loading)
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Combined Demo Page
 *
 * Shows all loading state patterns together for easy reference.
 */
export function LoadingStatesDemo() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8 px-8">Loading States Reference</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="border rounded-lg">
            <FeedbackSpinnerDemo />
          </div>
          <div className="border rounded-lg">
            <LoginButtonDemo />
          </div>
        </div>

        {/* Code snippets for implementation */}
        <div className="mt-12 px-8 space-y-6">
          <h2 className="text-xl font-semibold">Implementation Snippets</h2>

          <div className="space-y-2">
            <h3 className="font-medium">For MessageFeedback.tsx (line ~137):</h3>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`// Import Loader2
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

// In the button:
<Button variant="ghost" size="icon" disabled={isLoading}>
  {isLoading && selectedRating === 'positive' ? (
    <Loader2 className="h-3.5 w-3.5 animate-spin" />
  ) : (
    <ThumbsUp className="h-3.5 w-3.5" />
  )}
</Button>`}
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">For LoginForm.tsx (line ~115-117):</h3>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`// Loader2 already imported at line 13

// Change from:
{isLoading ? "Loading..." : "Login"}

// To:
{isLoading ? (
  <>
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    Signing in...
  </>
) : (
  "Login"
)}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
