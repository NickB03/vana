import {
  Plus,
  Package,
  User,
  MessageSquare,
  Search,
  Bot,
  Settings,
  LucideIcon
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/",
          label: "New Chat",
          icon: Plus,
          active: pathname === "/",
          submenus: []
        },
        {
          href: "/agent-builder",
          label: "Agent Builder",
          icon: Bot,
          active: pathname.includes("/agent-builder")
        }
      ]
    }
  ];
}

export function getBottomMenuList(): Menu[] {
  return [
    {
      href: "#search",
      label: "Search chats",
      icon: Search,
      active: false
    },
    {
      href: "#settings",
      label: "Settings",
      icon: Settings,
      active: false
    }
  ];
}
