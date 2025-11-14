"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown, Circle, Search, Lightbulb, Target, Sparkles } from "lucide-react";
import React, { useState } from "react";

// Icon mapping for reasoning steps
const iconMap = {
  search: Search,
  lightbulb: Lightbulb,
  target: Target,
  sparkles: Sparkles,
} as const;

export function getIconComponent(icon?: string) {
  if (!icon || !(icon in iconMap)) return null;
  const IconComponent = iconMap[icon as keyof typeof iconMap];
  return <IconComponent className="h-4 w-4" />;
}

export type ChainOfThoughtItemProps = React.ComponentProps<"div">;

export const ChainOfThoughtItem = ({
  children,
  className,
  ...props
}: ChainOfThoughtItemProps) => (
  <div className={cn("text-muted-foreground text-sm", className)} {...props}>
    {children}
  </div>
);

export type ChainOfThoughtTriggerProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  leftIcon?: React.ReactNode;
  swapIconOnHover?: boolean;
};

export const ChainOfThoughtTrigger = ({
  children,
  className,
  leftIcon,
  swapIconOnHover = true,
  ...props
}: ChainOfThoughtTriggerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract text content for ARIA label
  const getTextContent = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (React.isValidElement(node)) {
      return getTextContent(node.props.children);
    }
    if (Array.isArray(node)) {
      return node.map(getTextContent).join('');
    }
    return '';
  };

  const textContent = getTextContent(children);

  return (
    <CollapsibleTrigger
      className={cn(
        "group text-muted-foreground hover:text-foreground flex cursor-pointer items-center justify-start gap-1 text-left text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-1",
        className
      )}
      onClick={() => setIsExpanded(!isExpanded)}
      // Accessibility: ARIA attributes for screen readers
      aria-expanded={isExpanded}
      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} reasoning step: ${textContent}`}
      role="button"
      tabIndex={0}
      // Accessibility: Keyboard navigation
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
      {...props}
    >
      <div className="flex items-center gap-2">
        {leftIcon ? (
          <span
            className="relative inline-flex size-4 items-center justify-center"
            aria-hidden="true" // Decorative icon
          >
            <span
              className={cn(
                "transition-opacity",
                swapIconOnHover && "group-hover:opacity-0"
              )}
            >
              {leftIcon}
            </span>
            {swapIconOnHover && (
              <ChevronDown
                className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100 group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            )}
          </span>
        ) : (
          <span
            className="relative inline-flex size-4 items-center justify-center"
            aria-hidden="true"
          >
            <Circle className="size-2 fill-current" />
          </span>
        )}
        <span>{children}</span>
      </div>
      {!leftIcon && (
        <ChevronDown
          className="size-4 transition-transform group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      )}
      {/* Visually hidden status for screen readers */}
      <span className="sr-only">
        {isExpanded ? 'Expanded' : 'Collapsed'}
      </span>
    </CollapsibleTrigger>
  );
};

export type ChainOfThoughtContentProps = React.ComponentProps<
  typeof CollapsibleContent
>;

export const ChainOfThoughtContent = ({
  children,
  className,
  ...props
}: ChainOfThoughtContentProps) => {
  return (
    <CollapsibleContent
      className={cn(
        "text-popover-foreground data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="grid grid-cols-[min-content_minmax(0,1fr)] gap-x-4">
        <div className="bg-primary/20 ml-1.75 h-full w-px group-data-[last=true]:hidden" />
        <div className="ml-1.75 h-full w-px bg-transparent group-data-[last=false]:hidden" />
        <div className="mt-2 space-y-2">{children}</div>
      </div>
    </CollapsibleContent>
  );
};

export type ChainOfThoughtProps = {
  children: React.ReactNode;
  className?: string;
};

export function ChainOfThought({ children, className }: ChainOfThoughtProps) {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={cn("space-y-0", className)}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {React.isValidElement(child) &&
            React.cloneElement(
              child as React.ReactElement<ChainOfThoughtStepProps>,
              {
                isLast: index === childrenArray.length - 1,
              }
            )}
        </React.Fragment>
      ))}
    </div>
  );
}

export type ChainOfThoughtStepProps = {
  children: React.ReactNode;
  className?: string;
  isLast?: boolean;
};

export const ChainOfThoughtStep = ({
  children,
  className,
  isLast = false,
  ...props
}: ChainOfThoughtStepProps & React.ComponentProps<typeof Collapsible>) => {
  return (
    <Collapsible
      className={cn("group", className)}
      data-last={isLast}
      {...props}
    >
      {children}
      <div className="flex justify-start group-data-[last=true]:hidden">
        <div className="bg-primary/20 ml-1.75 h-4 w-px" />
      </div>
    </Collapsible>
  );
};
