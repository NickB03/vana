"use client"

import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import React, { createContext, useContext, useState } from "react"

type StepsContextType = {
  isOpen: boolean
  toggleOpen: () => void
}

const StepsContext = createContext<StepsContextType>({
  isOpen: false,
  toggleOpen: () => {},
})

function useSteps() {
  const context = useContext(StepsContext)
  if (!context) {
    throw new Error("Steps components must be used within a Steps component")
  }
  return context
}

interface StepsProps {
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Steps({ children, defaultOpen = false, className }: StepsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const toggleOpen = () => setIsOpen(!isOpen)

  return (
    <StepsContext.Provider value={{ isOpen, toggleOpen }}>
      <div className={cn("border-l-2 border-border pl-4", className)}>
        {children}
      </div>
    </StepsContext.Provider>
  )
}

interface StepsTriggerProps {
  children: React.ReactNode
  className?: string
}

export function StepsTrigger({ children, className }: StepsTriggerProps) {
  const { isOpen, toggleOpen } = useSteps()

  return (
    <button
      onClick={toggleOpen}
      className={cn(
        "flex w-full items-center justify-between gap-2 text-left text-sm font-medium transition-colors hover:text-foreground",
        className
      )}
    >
      <span>{children}</span>
      <ChevronDown
        className={cn(
          "h-4 w-4 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  )
}

interface StepsContentProps {
  children: React.ReactNode
  className?: string
}

export function StepsContent({ children, className }: StepsContentProps) {
  const { isOpen } = useSteps()

  if (!isOpen) return null

  return (
    <div className={cn("mt-2 space-y-1.5", className)}>
      {children}
    </div>
  )
}

interface StepsItemProps {
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
  isLoading?: boolean
}

export function StepsItem({ children, icon, className, isLoading = false }: StepsItemProps) {
  return (
    <div className={cn("flex items-start gap-2 text-sm text-muted-foreground", className)}>
      {icon && <span className="mt-0.5 flex-shrink-0">{icon}</span>}
      <span className={cn("break-words", isLoading && "animate-pulse")}>{children}</span>
    </div>
  )
}

interface StepsBarProps {
  className?: string
}

export function StepsBar({ className }: StepsBarProps) {
  return (
    <div className={cn("my-1.5 h-px w-full bg-border", className)} />
  )
}
