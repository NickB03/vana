import { ReactNode } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
  tooltip?: string;
}

export function SidebarItem({ icon, label, onClick, isActive, className, tooltip }: SidebarItemProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <SidebarMenuButton
      onClick={onClick}
      isActive={isActive}
      tooltip={collapsed ? tooltip || label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 transition-all duration-200",
        collapsed ? "justify-center" : "justify-start",
        className
      )}
    >
      <div className="flex items-center justify-center w-5 h-5 shrink-0 transition-all duration-200">
        {icon}
      </div>
      {!collapsed && <span className="truncate text-sm transition-opacity duration-200">{label}</span>}
    </SidebarMenuButton>
  );
}
