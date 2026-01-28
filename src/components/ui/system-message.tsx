import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import React from "react"

const systemMessageVariants = cva(
  "flex flex-row items-center gap-3 rounded-lg border-2 py-2.5 pr-2.5 pl-3.5",
  {
    variants: {
      variant: {
        action: "text-blue-700 dark:text-blue-300",
        error: "text-red-700 dark:text-red-400",
        warning: "text-amber-700 dark:text-amber-400",
      },
      fill: {
        true: "bg-background",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "action",
        fill: true,
        class: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50",
      },
      {
        variant: "error",
        fill: true,
        class: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50",
      },
      {
        variant: "warning",
        fill: true,
        class: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
      },
      {
        variant: "action",
        fill: false,
        class: "border-blue-300 dark:border-blue-700",
      },
      {
        variant: "error",
        fill: false,
        class: "border-red-300 dark:border-red-700",
      },
      {
        variant: "warning",
        fill: false,
        class: "border-amber-300 dark:border-amber-700",
      },
    ],
    defaultVariants: {
      variant: "action",
      fill: false,
    },
  }
)

export type SystemMessageProps = React.ComponentProps<"div"> &
  VariantProps<typeof systemMessageVariants> & {
    icon?: React.ReactNode
    isIconHidden?: boolean
    cta?: {
      label: string
      onClick?: () => void
      variant?: "solid" | "outline" | "ghost"
    }
  }

export function SystemMessage({
  children,
  variant = "action",
  fill = false,
  icon,
  isIconHidden = false,
  cta,
  className,
  ...props
}: SystemMessageProps) {
  const getDefaultIcon = () => {
    if (isIconHidden) return null

    switch (variant) {
      case "error":
        return <AlertCircle className="size-4" />
      case "warning":
        return <AlertTriangle className="size-4" />
      default:
        return <Info className="size-4" />
    }
  }

  const getIconToShow = () => {
    if (isIconHidden) return null
    if (icon) return icon
    return getDefaultIcon()
  }

  const shouldShowIcon = getIconToShow() !== null

  return (
    <div
      className={cn(systemMessageVariants({ variant, fill }), className)}
      {...props}
    >
      <div className="flex flex-1 flex-row items-center gap-3 leading-normal">
        {shouldShowIcon && (
          <div className="flex h-[1lh] shrink-0 items-center justify-center self-start">
            {getIconToShow()}
          </div>
        )}

        <div
          className={cn(
            "flex min-w-0 flex-1 items-center",
            shouldShowIcon ? "gap-3" : "gap-0"
          )}
        >
          <div className="text-sm">{children}</div>
        </div>
      </div>

      {cta && (
        <Button
          variant={variant === "action" ? "default" : "destructive"}
          size="sm"
          onClick={cta.onClick}
          className={cn(
            "shrink-0",
            variant === "action" && "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          )}
        >
          {cta.label}
        </Button>
      )}
    </div>
  )
}
