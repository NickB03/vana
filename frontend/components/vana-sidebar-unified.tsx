"use client"

import * as React from "react"
import {
  BookOpen,
  MessageCircle,
  Plus,
  SquareTerminal,
  GalleryVerticalEnd,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
} from "lucide-react"

import { NavUser } from "@/components/sidebar/nav-user"
import Image from "next/image"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuAction,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

// Enhanced chat data with proper time grouping
const getChatData = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  return [
    {
      id: "today",
      label: "Today",
      chats: [
        {
          id: "t1",
          title: "Project roadmap discussion",
          url: "/chat/t1",
          createdAt: today.toISOString(),
          isActive: true,
        },
        {
          id: "t2",
          title: "API Documentation Review",
          url: "/chat/t2",
          createdAt: today.toISOString(),
        },
        {
          id: "t3",
          title: "Frontend Bug Analysis",
          url: "/chat/t3",
          createdAt: today.toISOString(),
        },
      ],
    },
    {
      id: "yesterday",
      label: "Yesterday",
      chats: [
        {
          id: "y1",
          title: "Database Schema Design",
          url: "/chat/y1",
          createdAt: yesterday.toISOString(),
        },
        {
          id: "y2",
          title: "Performance Optimization",
          url: "/chat/y2",
          createdAt: yesterday.toISOString(),
        },
      ],
    },
    {
      id: "week",
      label: "Last 7 days",
      chats: [
        {
          id: "w1",
          title: "Authentication Flow",
          url: "/chat/w1",
          createdAt: new Date(weekAgo.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "w2",
          title: "UI Component Library",
          url: "/chat/w2",
          createdAt: new Date(weekAgo.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "w3",
          title: "Testing Strategy",
          url: "/chat/w3",
          createdAt: weekAgo.toISOString(),
        },
      ],
    },
    {
      id: "month",
      label: "Last month",
      chats: [
        {
          id: "m1",
          title: "Initial Project Setup",
          url: "/chat/m1",
          createdAt: new Date(monthAgo.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "m2",
          title: "Requirements Gathering",
          url: "/chat/m2",
          createdAt: new Date(monthAgo.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "m3",
          title: "Tech Stack Selection",
          url: "/chat/m3",
          createdAt: monthAgo.toISOString(),
        },
      ],
    },
  ]
}

// Application data
const data = {
  user: {
    name: "Vana User",
    email: "user@vana.ai",
    avatar: "/avatars/user.jpg",
  },
  teams: [
    {
      name: "Vana AI",
      logo: GalleryVerticalEnd,
      plan: "Research",
    },
  ],
  navMain: [
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "User Guide", url: "#" },
        { title: "API Reference", url: "#" },
      ],
    },
    {
      title: "Agent Builder",
      url: "/canvas",
      icon: SquareTerminal,
    },
  ],
}

// Navigation component
function UnifiedNavMain({
  items,
  className,
}: {
  items: typeof data.navMain
  className?: string
}) {
  return (
    <SidebarGroup className={cn("group-data-[collapsible=icon]:hidden mt-2", className)}>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.items && item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={Boolean((item as any).isActive)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenu className="ml-6 mt-1">
                    {item.items?.map((subItem) => (
                      <SidebarMenuItem key={subItem.title}>
                        <SidebarMenuButton asChild size="sm">
                          <a href={subItem.url}>
                            <span>{subItem.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <a href={item.url}>
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}

// Enhanced chat history component
function UnifiedChatHistory() {
  const { isMobile } = useSidebar()
  const chatData = getChatData()

  return (
    <>
      {chatData.map((group) => (
        <SidebarGroup key={group.id} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.chats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                  asChild
                  isActive={chat.isActive}
                  className={cn(
                    "w-full justify-start",
                    chat.isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  )}
                >
                  <a href={chat.url}>
                    <MessageCircle className="h-4 w-4" />
                    <span className="truncate flex-1">{chat.title}</span>
                  </a>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem>
                      <Edit className="text-muted-foreground" />
                      <span>Rename Chat</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MessageCircle className="text-muted-foreground" />
                      <span>Open Chat</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="text-destructive" />
                      <span>Delete Chat</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}

      {/* Platform section moved below chat history */}
      <UnifiedNavMain items={data.navMain} className="group-data-[collapsible=icon]:hidden mt-2" />

      {/* New Chat Button */}
      <SidebarGroup className="group-data-[collapsible=icon]:hidden mt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Plus className="text-sidebar-foreground/70" />
              <span>New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}

// Main unified sidebar component
export function VanaSidebarUnified({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAuthenticated, user } = useAuth()

  // Use authenticated user data if available, fallback to sample data
  const userData = React.useMemo(() => {
    if (isAuthenticated && user) {
      return {
        name: user.name || user.email || "Vana User",
        email: user.email || "user@vana.ai",
        avatar: user.avatar || "/avatars/user.jpg",
      }
    }
    return data.user
  }, [isAuthenticated, user])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        {/* Logo and Search */}
        <div className="flex items-center justify-between px-2 py-1">
          <Image src="/vana-logo.png" alt="Vana AI logo" width={32} height={32} className="h-8 w-auto rounded-md" priority />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 group-data-[collapsible=icon]:hidden"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
        </div>


      </SidebarHeader>

      <SidebarContent>
        <UnifiedChatHistory />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}