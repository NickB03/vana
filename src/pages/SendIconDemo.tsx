/**
 * SendIconDemo - Design exploration page for send/stop button variants
 *
 * Showcases multiple design options for chat interface action buttons:
 * - Send button variants (enabled/disabled states)
 * - Stop button variants for stream cancellation
 * - Different icon options, sizes, and styles
 * - Gradient, solid, outlined, and glass-morphic effects
 *
 * Purpose: Visual reference for design decisions and user testing
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowUp,
  Send,
  Sparkles,
  ChevronRight,
  Play,
  Square,
  CircleStop,
  Pause,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * GradientArrowIcon - Arrow icon with SVG gradient stroke
 * Uses inline SVG linearGradient for true gradient effect on strokes
 */
const GradientArrowIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="auroraGradientArrow" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#34d399" /> {/* emerald-400 */}
        <stop offset="100%" stopColor="#06b6d4" /> {/* cyan-400 */}
      </linearGradient>
    </defs>
    <path d="M5 12h14" stroke="url(#auroraGradientArrow)" />
    <path d="m12 5 7 7-7 7" stroke="url(#auroraGradientArrow)" />
  </svg>
);

/**
 * GradientSquareIcon - Square icon with SVG gradient stroke
 * Uses inline SVG linearGradient for true gradient effect on strokes
 */
const GradientSquareIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="auroraGradientSquare" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#34d399" /> {/* emerald-400 */}
        <stop offset="100%" stopColor="#06b6d4" /> {/* cyan-400 */}
      </linearGradient>
    </defs>
    <rect width="18" height="18" x="3" y="3" rx="2" stroke="url(#auroraGradientSquare)" />
  </svg>
);

interface ButtonVariantProps {
  label: string;
  description?: string;
  icon: React.ReactNode;
  inactiveIcon?: React.ReactNode; // Optional different icon for disabled state
  activeStyle: string;
  inactiveStyle: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  noGradient?: boolean; // Prevents CSS gradient override
}

const ButtonVariant = ({
  label,
  description,
  icon,
  inactiveIcon,
  activeStyle,
  inactiveStyle,
  size = "md",
  onClick,
  noGradient = false
}: ButtonVariantProps) => {
  const [clicked, setClicked] = useState(false);

  const sizeClasses = {
    sm: "size-8",
    md: "size-9",
    lg: "size-11"
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20
  };

  const handleClick = () => {
    setClicked(true);
    onClick?.();
    setTimeout(() => setClicked(false), 300);
  };

  return (
    <div
      className="flex flex-col items-center gap-3 p-4 rounded-lg bg-black/30 border border-white/10 hover:border-white/20 transition-colors"
      data-no-gradient={noGradient ? "true" : undefined}
    >
      <div className="flex items-center gap-4">
        {/* Active state */}
        <div className="flex flex-col items-center gap-2">
          <Button
            size="icon"
            className={cn(
              sizeClasses[size],
              "rounded-full transition-all duration-200",
              activeStyle,
              clicked && "scale-95"
            )}
            onClick={handleClick}
          >
            {React.cloneElement(icon as React.ReactElement, { size: iconSizes[size] })}
          </Button>
          <span className="text-xs text-muted-foreground">Active</span>
        </div>

        {/* Inactive/disabled state */}
        <div className="flex flex-col items-center gap-2">
          <Button
            size="icon"
            disabled
            className={cn(
              sizeClasses[size],
              "rounded-full",
              inactiveStyle
            )}
          >
            {React.cloneElement((inactiveIcon || icon) as React.ReactElement, { size: iconSizes[size] })}
          </Button>
          <span className="text-xs text-muted-foreground">Disabled</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
};

export default function SendIconDemo() {
  return (
    <div className="min-h-screen bg-background">
      {/* Aurora gradient background matching the site theme */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_60%,rgba(99,179,237,0.2),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_20%_70%,rgba(52,211,153,0.2),rgba(255,255,255,0))]" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">
            Send & Stop Button Design Options
          </h1>
          <p className="text-muted-foreground">
            Explore different visual styles for chat interface action buttons
          </p>
        </div>

        {/* Send Button Variants */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Send Button Variants</h2>
            <p className="text-sm text-muted-foreground">
              Different styles and icons for the send message button
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Current Design - Teal Gradient with ArrowRight */}
            <ButtonVariant
              label="Current Design"
              description="Teal gradient with shadow"
              icon={<ArrowRight className="text-white" />}
              activeStyle="hover:brightness-115 hover:-translate-y-0.5"
              inactiveStyle="opacity-40"
              size="md"
              onClick={() => console.log("Send clicked")}
            />

            {/* Teal Gradient with ArrowUp */}
            <ButtonVariant
              label="Teal Gradient - Arrow Up"
              description="Vertical arrow for 'send up'"
              icon={<ArrowUp className="text-white" />}
              activeStyle="hover:brightness-115 hover:-translate-y-0.5"
              inactiveStyle="opacity-40"
              size="md"
            />

            {/* Teal Gradient with Send (Paper Plane) */}
            <ButtonVariant
              label="Teal Gradient - Send Icon"
              description="Classic paper plane icon"
              icon={<Send className="text-white" />}
              activeStyle="hover:brightness-115 hover:-translate-y-0.5"
              inactiveStyle="opacity-40"
              size="md"
            />

            {/* Purple Gradient with Sparkles */}
            <ButtonVariant
              label="Purple Gradient - Sparkles"
              description="AI-themed with sparkles"
              icon={<Sparkles className="text-white" />}
              activeStyle="hover:brightness-115 hover:-translate-y-0.5"
              inactiveStyle="opacity-40"
              size="md"
            />

            {/* Blue Gradient with ArrowRight */}
            <ButtonVariant
              label="Blue Gradient"
              description="Ocean blue theme"
              icon={<ArrowRight className="text-white" />}
              activeStyle="hover:brightness-115 hover:-translate-y-0.5"
              inactiveStyle="opacity-40"
              size="md"
            />

            {/* Solid Teal */}
            <ButtonVariant
              label="Solid Teal"
              description="No gradient, pure teal"
              icon={<ArrowRight className="text-white" />}
              activeStyle="bg-teal-500 hover:bg-teal-600 shadow-lg shadow-teal-500/40"
              inactiveStyle="bg-teal-500/20"
              size="md"
            />

            {/* Glass/Frosted Effect */}
            <ButtonVariant
              label="Glass Morphism"
              description="Frosted glass effect"
              icon={<ArrowRight className="text-white" />}
              activeStyle="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 shadow-lg"
              inactiveStyle="bg-white/5 backdrop-blur-md border border-white/10 opacity-40"
              size="md"
            />

            {/* Outlined/Ghost Teal */}
            <ButtonVariant
              label="Outlined Teal"
              description="Ghost style with border"
              icon={<ArrowRight className="text-teal-400" />}
              activeStyle="border-2 border-teal-400 hover:bg-teal-400/10 shadow-lg shadow-teal-400/20"
              inactiveStyle="border border-teal-400/30 text-muted-foreground/40"
              size="md"
            />

            {/* Aurora Gradient Outline on Black - User Requested */}
            <ButtonVariant
              label="Aurora Gradient"
              description="Green→blue gradient on black"
              icon={<GradientArrowIcon size={18} />}
              inactiveIcon={<ArrowRight className="text-neutral-500" />}
              activeStyle="bg-black border-2 border-emerald-400 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-400/30"
              inactiveStyle="bg-neutral-800 border border-neutral-600"
              size="md"
              noGradient
            />

            {/* Cyan-Pink Gradient */}
            <ButtonVariant
              label="Vibrant Gradient"
              description="Cyan to pink gradient"
              icon={<Send className="text-white" />}
              activeStyle="hover:brightness-110 hover:-translate-y-0.5"
              inactiveStyle="opacity-40"
              size="md"
            />

            {/* Dark Minimal */}
            <ButtonVariant
              label="Dark Minimal"
              description="Subtle dark theme"
              icon={<ArrowUp className="text-foreground" />}
              activeStyle="bg-foreground/10 hover:bg-foreground/20 border border-border"
              inactiveStyle="bg-foreground/5 border border-border/50 opacity-40"
              size="md"
            />

            {/* Large Size Variant */}
            <ButtonVariant
              label="Large Teal (11px)"
              description="Bigger for mobile"
              icon={<ArrowRight className="text-white" />}
              activeStyle="hover:brightness-115 hover:-translate-y-0.5"
              inactiveStyle="opacity-40"
              size="lg"
            />

            {/* Small Size Variant */}
            <ButtonVariant
              label="Small Teal (8px)"
              description="Compact variant"
              icon={<ArrowRight className="text-white" />}
              activeStyle="hover:brightness-115 hover:-translate-y-0.5"
              inactiveStyle="opacity-40"
              size="sm"
            />
          </div>
        </section>

        {/* Stop Button Variants */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Stop Button Variants</h2>
            <p className="text-sm text-muted-foreground">
              Different styles for stopping AI generation during streaming
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current Design - Square icon */}
            <ButtonVariant
              label="Current Design"
              description="Square icon, neutral muted"
              icon={<Square className="text-muted-foreground" />}
              activeStyle="bg-muted/80 hover:bg-muted border border-border/50"
              inactiveStyle="bg-muted/40 border border-border/30 opacity-40"
              size="md"
              onClick={() => console.log("Stop clicked")}
            />

            {/* Red Gradient Square */}
            <ButtonVariant
              label="Red Alert Square"
              description="Urgent red styling"
              icon={<Square className="text-white" />}
              activeStyle="hover:brightness-110 hover:-translate-y-0.5"
              inactiveStyle="opacity-40"
              size="md"
            />

            {/* CircleStop icon with red */}
            <ButtonVariant
              label="Circle Stop - Red"
              description="Classic stop icon"
              icon={<CircleStop className="text-white" />}
              activeStyle="hover:brightness-110 hover:-translate-y-0.5"
              inactiveStyle="opacity-40"
              size="md"
            />

            {/* Pause icon */}
            <ButtonVariant
              label="Pause Icon"
              description="Alternative pause action"
              icon={<Pause className="text-muted-foreground" />}
              activeStyle="bg-muted/80 hover:bg-muted border border-border/50"
              inactiveStyle="bg-muted/40 border border-border/30 opacity-40"
              size="md"
            />

            {/* X icon */}
            <ButtonVariant
              label="X Icon"
              description="Cancel/close action"
              icon={<X className="text-muted-foreground" />}
              activeStyle="bg-muted/80 hover:bg-muted border border-border/50"
              inactiveStyle="bg-muted/40 border border-border/30 opacity-40"
              size="md"
            />

            {/* Outlined Red Square */}
            <ButtonVariant
              label="Outlined Red"
              description="Ghost style warning"
              icon={<Square className="text-red-400" />}
              activeStyle="border-2 border-red-400 hover:bg-red-400/10 shadow-lg shadow-red-400/20"
              inactiveStyle="border border-red-400/30 opacity-40"
              size="md"
            />

            {/* Glass Stop */}
            <ButtonVariant
              label="Glass Stop"
              description="Frosted with square"
              icon={<Square className="text-white" />}
              activeStyle="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 shadow-lg"
              inactiveStyle="bg-white/5 backdrop-blur-md border border-white/10 opacity-40"
              size="md"
            />

            {/* Aurora Gradient Stop - Matches Send */}
            <ButtonVariant
              label="Aurora Gradient Stop"
              description="Green→blue gradient on black"
              icon={<GradientSquareIcon size={18} />}
              inactiveIcon={<Square className="text-neutral-500" />}
              activeStyle="bg-black border-2 border-emerald-400 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-400/30"
              inactiveStyle="bg-neutral-800 border border-neutral-600"
              size="md"
              noGradient
            />

            {/* Dark Stop */}
            <ButtonVariant
              label="Dark Minimal Stop"
              description="Subtle dark with X"
              icon={<X className="text-foreground" />}
              activeStyle="bg-foreground/10 hover:bg-foreground/20 border border-border"
              inactiveStyle="bg-foreground/5 border border-border/50 opacity-40"
              size="md"
            />
          </div>
        </section>

        {/* Additional Context Section */}
        <section className="mt-12 p-6 rounded-lg bg-black/30 border border-white/10">
          <h3 className="text-lg font-semibold mb-3">Design Considerations</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Send Button:</strong> Should feel inviting and positive. Teal/cyan matches the aurora theme.
            </li>
            <li>
              <strong>Stop Button:</strong> Should be noticeable but not alarming. Neutral or subtle red works well.
            </li>
            <li>
              <strong>Accessibility:</strong> Ensure sufficient contrast and clear visual affordances for button states.
            </li>
            <li>
              <strong>Consistency:</strong> Match the overall dark theme and glass-morphic aesthetic of the site.
            </li>
            <li>
              <strong>Feedback:</strong> Hover and click animations provide important tactile feedback.
            </li>
          </ul>
        </section>

        {/* Custom inline styles for variants that need specific gradients */}
        {/* Note: [data-no-gradient] elements are excluded to preserve their explicit styles */}
        <style>{`
          /* Apply custom gradients to specific buttons - exclude noGradient variants */
          .grid > div:not([data-no-gradient]):nth-child(1) button:not([disabled]) {
            background: linear-gradient(135deg, hsl(180 60% 35%), hsl(160 50% 45%));
            box-shadow: 0 4px 14px hsl(170 50% 40% / 0.4);
          }
          .grid > div:not([data-no-gradient]):nth-child(2) button:not([disabled]) {
            background: linear-gradient(135deg, hsl(180 60% 35%), hsl(160 50% 45%));
            box-shadow: 0 4px 14px hsl(170 50% 40% / 0.4);
          }
          .grid > div:not([data-no-gradient]):nth-child(3) button:not([disabled]) {
            background: linear-gradient(135deg, hsl(180 60% 35%), hsl(160 50% 45%));
            box-shadow: 0 4px 14px hsl(170 50% 40% / 0.4);
          }
          .grid > div:not([data-no-gradient]):nth-child(4) button:not([disabled]) {
            background: linear-gradient(135deg, hsl(270 60% 40%), hsl(290 50% 50%));
            box-shadow: 0 4px 14px hsl(280 50% 45% / 0.4);
          }
          .grid > div:not([data-no-gradient]):nth-child(5) button:not([disabled]) {
            background: linear-gradient(135deg, hsl(200 70% 40%), hsl(220 60% 50%));
            box-shadow: 0 4px 14px hsl(210 60% 45% / 0.4);
          }
          .grid > div:not([data-no-gradient]):nth-child(10) button:not([disabled]) {
            background: linear-gradient(135deg, hsl(180 80% 50%), hsl(330 80% 60%));
            box-shadow: 0 4px 14px hsl(255 70% 55% / 0.4);
          }
          .grid > div:not([data-no-gradient]):nth-child(12) button:not([disabled]) {
            background: linear-gradient(135deg, hsl(180 60% 35%), hsl(160 50% 45%));
            box-shadow: 0 4px 14px hsl(170 50% 40% / 0.4);
          }
          .grid > div:not([data-no-gradient]):nth-child(13) button:not([disabled]) {
            background: linear-gradient(135deg, hsl(180 60% 35%), hsl(160 50% 45%));
            box-shadow: 0 4px 14px hsl(170 50% 40% / 0.4);
          }

          /* Stop button section gradients */
          section:last-of-type .grid > div:not([data-no-gradient]):nth-child(2) button:not([disabled]) {
            background: linear-gradient(135deg, hsl(0 70% 45%), hsl(10 65% 55%));
            box-shadow: 0 4px 14px hsl(5 70% 50% / 0.4);
          }
          section:last-of-type .grid > div:not([data-no-gradient]):nth-child(3) button:not([disabled]) {
            background: linear-gradient(135deg, hsl(0 70% 45%), hsl(10 65% 55%));
            box-shadow: 0 4px 14px hsl(5 70% 50% / 0.4);
          }
        `}</style>
      </div>
    </div>
  );
}
