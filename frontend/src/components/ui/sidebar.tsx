/**
 * LEGACY SIDEBAR COMPONENT (DEPRECATED)
 *
 * This file has been refactored into modular components.
 * Please use the new modular sidebar components from:
 * @/components/ui/sidebar
 *
 * This file is maintained for backward compatibility only.
 *
 * Migration guide:
 * 1. Update imports to use @/components/ui/sidebar
 * 2. The API remains the same
 * 3. Benefits: Better maintainability, smaller bundle sizes, easier testing
 */

// Re-export all components from the new modular structure
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./sidebar/"

// Export types and constants for backward compatibility
export type { SidebarContextProps } from "./sidebar/types"
export {
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_MOBILE,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_KEYBOARD_SHORTCUT,
} from "./sidebar/constants"
