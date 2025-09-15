/**
 * Shared chat data types and utilities
 * Provides TypeScript types and functions for chat management across the application
 */

// Core chat data types
export interface Chat {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  isActive?: boolean;
}

export interface ChatGroup {
  id: string;
  label: string;
  chats: Chat[];
}

export type ChatData = ChatGroup[];

// Navigation item types
export interface NavItem {
  title: string;
  url: string;
  icon?: React.ComponentType;
  items?: NavSubItem[];
  isActive?: boolean;
}

// Admin navbar props interface
export interface AdminNavbarProps {
  title?: string;
  pathname?: string;
}

export interface NavSubItem {
  title: string;
  url: string;
}

// User data types
export interface UserData {
  name: string;
  email: string;
  avatar: string;
}

// Team data types
export interface TeamData {
  name: string;
  logo: React.ComponentType;
  plan: string;
}

// Enhanced chat data with proper time grouping
export const getChatData = (): ChatData => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

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
  ];
};

// Utility function to find chat by URL
export const findChatByUrl = (url: string): Chat | undefined => {
  const chatData = getChatData();
  for (const group of chatData) {
    const chat = group.chats.find((c) => c.url === url);
    if (chat) return chat;
  }
  return undefined;
};

// Utility function to get all chats as flat array
export const getAllChats = (): Chat[] => {
  return getChatData().flatMap((group) => group.chats);
};

// Utility function to generate dynamic title from pathname
export const getDynamicTitle = (pathname: string, fallback: string = "Vana AI"): string => {
  if (!pathname) return fallback;
  
  if (pathname.startsWith("/chat")) {
    const chat = findChatByUrl(pathname);
    if (chat?.title) return chat.title;
    if (pathname === "/chat" || pathname === "/chat/new") return "New Chat";
    return fallback;
  }
  
  if (pathname === "/login") return fallback;
  
  // Add more pathname-based title logic here as needed
  return fallback;
};

// Admin panel title mapping
const adminTitleMap: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/dashboard": "Dashboard",
  "/admin/users": "User Management",
  "/admin/settings": "Settings",
  "/admin/analytics": "Analytics",
  "/admin/reports": "Reports",
  "/admin/api-keys": "API Keys",
  "/admin/billing": "Billing",
  "/admin/logs": "System Logs",
};

// Utility function to generate dynamic admin title from pathname
export const getAdminTitle = (pathname: string, fallback: string = "Admin Panel"): string => {
  if (!pathname) return fallback;
  
  // Check exact matches first
  if (adminTitleMap[pathname]) {
    return adminTitleMap[pathname];
  }
  
  // Check for nested paths
  for (const [path, title] of Object.entries(adminTitleMap)) {
    if (pathname.startsWith(path + "/")) {
      // For nested paths, try to extract the sub-section
      const subPath = pathname.substring(path.length + 1);
      const formattedSubPath = subPath
        .split("/")[0] // Get first segment after base path
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return `${title} - ${formattedSubPath}`;
    }
  }
  
  // Fallback to extracting from pathname
  if (pathname.startsWith("/admin/")) {
    const segment = pathname.split("/")[2];
    if (segment) {
      return segment
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
  }
  
  return fallback;
};