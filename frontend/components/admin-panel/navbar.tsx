"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/admin-panel/user-nav";
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { getAdminTitle, type AdminNavbarProps } from "@/lib/chat-data";

interface NavbarProps extends AdminNavbarProps {
  title?: string;
}

export function Navbar({ title, pathname: propPathname }: NavbarProps) {
  const routerPathname = usePathname();
  const pathname = propPathname || routerPathname;
  
  const dynamicTitle = React.useMemo(() => {
    if (title) return title;
    return getAdminTitle(pathname, "Admin Panel");
  }, [title, pathname]);

  return (
    <header className="sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary">
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
          <h1 className="font-bold">{dynamicTitle}</h1>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
