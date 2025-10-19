"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

interface ScrollButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  onClick?: () => void
}

function ScrollButton({ className, onClick, ...props }: ScrollButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("size-9 rounded-full", className)}
      onClick={onClick}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  )
}

export { ScrollButton }
