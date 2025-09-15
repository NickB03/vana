"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <TooltipProvider disableHoverableContent>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            className="rounded-full w-8 h-8 bg-background mr-2"
            variant="outline"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className={`w-[1.2rem] h-[1.2rem] transition-transform ease-in-out duration-500 ${resolvedTheme === 'dark' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`} />
            <Moon className={`absolute w-[1.2rem] h-[1.2rem] transition-transform ease-in-out duration-500 ${resolvedTheme === 'dark' ? '-rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
            <span className="sr-only">Switch Theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Switch Theme</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
