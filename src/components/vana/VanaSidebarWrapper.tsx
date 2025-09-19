"use client"

import { VanaSidebar } from "@/components/vana/VanaSidebar";

interface VanaSidebarWrapperProps {
  children: React.ReactNode;
}

export function VanaSidebarWrapper({ children }: VanaSidebarWrapperProps) {
  // Note: Sidebar collapse functionality could be implemented in VanaSidebar component if needed
  // const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-full">
      {/* Persistent Sidebar - Always Rendered */}
      <VanaSidebar />
      
      {/* Main Content Area - Conditional Rendering */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}