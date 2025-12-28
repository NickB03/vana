"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type LucideIcon, XIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";

export type ArtifactProps = HTMLAttributes<HTMLDivElement>;

export const Artifact = (props: ArtifactProps) => {
  const { className, ...rest } = props;
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        // Transparent - inherits styling from unified parent container
        className
      )}
      {...rest}
    />
  );
};

export type ArtifactHeaderProps = HTMLAttributes<HTMLDivElement>;

export const ArtifactHeader = (props: ArtifactHeaderProps) => {
  const { className, ...rest } = props;
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b h-12 border-border/30 bg-white/5 px-3",
        // Subtle header - inherits from unified parent container
        className
      )}
      {...rest}
    />
  );
};

export type ArtifactCloseProps = ComponentProps<typeof Button>;

export const ArtifactClose = (props: ArtifactCloseProps) => {
  const { className, children, size = "sm", variant = "ghost", ...rest } = props;
  return (
    <Button
      className={cn(
        "size-8 p-0 text-gray-400 hover:text-gray-200 hover:bg-[#404040] rounded",
        className
      )}
      size={size}
      type="button"
      variant={variant}
      {...rest}
    >
      {children ?? <XIcon className="size-4" />}
      <span className="sr-only">Close</span>
    </Button>
  );
};

export type ArtifactTitleProps = HTMLAttributes<HTMLParagraphElement>;

export const ArtifactTitle = (props: ArtifactTitleProps) => {
  const { className, ...rest } = props;
  return (
    <p
      className={cn("font-medium text-gray-200 text-sm", className)}
      {...rest}
    />
  );
};

export type ArtifactDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const ArtifactDescription = (props: ArtifactDescriptionProps) => {
  const { className, ...rest } = props;
  return (
    <p className={cn("text-muted-foreground text-sm", className)} {...rest} />
  );
};

export type ArtifactActionsProps = HTMLAttributes<HTMLDivElement>;

export const ArtifactActions = (props: ArtifactActionsProps) => {
  const { className, ...rest } = props;
  return (
    <div className={cn("flex items-center gap-1", className)} {...rest} />
  );
};

export type ArtifactActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
  icon?: LucideIcon;
};

export const ArtifactAction = (props: ArtifactActionProps) => {
  const { tooltip, label, icon: Icon, children, className, size = "sm", variant = "ghost", ...rest } = props;

  const button = (
    <Button
      className={cn(
        "size-8 p-0 text-gray-400 hover:text-gray-200 hover:bg-[#404040] rounded",
        className
      )}
      size={size}
      type="button"
      variant={variant}
      {...rest}
    >
      {Icon ? <Icon className="size-4" /> : children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

export type ArtifactContentProps = HTMLAttributes<HTMLDivElement>;

export const ArtifactContent = (props: ArtifactContentProps) => {
  const { className, ...rest } = props;
  return (
    <div className={cn("flex-1 overflow-auto p-4", className)} {...rest} />
  );
};
