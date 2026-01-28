import { cn } from "@/lib/utils";
import { Eye, Code } from "lucide-react";

interface ArtifactViewToggleProps {
  value: 'preview' | 'code';
  onChange: (value: 'preview' | 'code') => void;
  className?: string;
}

export function ArtifactViewToggle({ value, onChange, className }: ArtifactViewToggleProps) {
  return (
    <div
      className={cn("flex items-center bg-[#404040] rounded-full p-0.5", className)}
      role="group"
      aria-label="View mode"
    >
      <button
        onClick={() => onChange('preview')}
        className={cn(
          "flex items-center justify-center size-7 rounded-full transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          value === 'preview'
            ? "bg-[#5a5a5a] text-white"
            : "text-gray-300 hover:text-gray-100"
        )}
        aria-label="Preview mode"
        aria-pressed={value === 'preview'}
        type="button"
      >
        <Eye className="size-4" />
      </button>
      <button
        onClick={() => onChange('code')}
        className={cn(
          "flex items-center justify-center size-7 rounded-full transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          value === 'code'
            ? "bg-[#5a5a5a] text-white"
            : "text-gray-300 hover:text-gray-100"
        )}
        aria-label="Code mode"
        aria-pressed={value === 'code'}
        type="button"
      >
        <Code className="size-4" />
      </button>
    </div>
  );
}
