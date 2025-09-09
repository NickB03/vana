"use client";

import React, { useState, createContext, useContext } from 'react';
import { 
    ChevronLeft, 
    ChevronRight, 
    ChevronsLeft, 
    ChevronsRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Typed Context ---
interface SidebarContextProps {
    isCollapsed: boolean;
    setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

// --- Custom Hook ---
const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};

// --- Main Sidebar Container ---
interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
    defaultCollapsed?: boolean;
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
    ({ className, children, defaultCollapsed = false, ...props }, ref) => {
        const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

        return (
            <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
                <aside
                    ref={ref}
                    className={cn(
                        "relative bg-[#000000] text-gray-200 transition-all duration-300 ease-in-out flex flex-col",
                        isCollapsed ? "w-20" : "w-64",
                        className
                    )}
                    {...props}
                >
                    {children}
                </aside>
            </SidebarContext.Provider>
        );
    }
);
Sidebar.displayName = "Sidebar";

// --- Sidebar Toggle Button ---
const SidebarToggle = React.forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
    ({ className, ...props }, ref) => {
        const { isCollapsed, setIsCollapsed } = useSidebar();

        const handleToggle = () => {
            setIsCollapsed(prevState => !prevState);
        };

        return (
            <button
                ref={ref}
                onClick={handleToggle}
                className={cn(
                    "absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-7 w-7 flex items-center justify-center bg-gray-800 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors group",
                    className
                )}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                {...props}
            >
                {isCollapsed ? (
                    <div className="relative flex items-center justify-center h-full w-full">
                        <ChevronsRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity absolute" />
                        <ChevronRight size={16} className="group-hover:opacity-0 transition-opacity" />
                    </div>
                ) : (
                    <div className="relative flex items-center justify-center h-full w-full">
                        <ChevronsLeft size={18} className="opacity-0 group-hover:opacity-100 transition-opacity absolute" />
                        <ChevronLeft size={16} className="group-hover:opacity-0 transition-opacity" />
                    </div>
                )}
            </button>
        );
    }
);
SidebarToggle.displayName = "SidebarToggle";

// --- Sidebar Content Wrapper ---
const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <div ref={ref} className={cn("flex flex-col h-full p-2", className)} {...props}>
                {children}
            </div>
        );
    }
);
SidebarContent.displayName = "SidebarContent";

// --- Sidebar Navigation Section ---
const SidebarNav = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <nav ref={ref} className={cn("flex-grow overflow-y-auto overflow-x-hidden", className)} {...props}>
                <ul className="list-none">
                    {children}
                </ul>
            </nav>
        );
    }
);
SidebarNav.displayName = "SidebarNav";

// --- Sidebar Navigation Item ---
interface SidebarNavItemProps extends React.HTMLAttributes<HTMLLIElement> {
    title: string;
}
const SidebarNavItem = React.forwardRef<HTMLLIElement, SidebarNavItemProps>(
    ({ className, children, title, ...props }, ref) => {
        const { isCollapsed } = useSidebar();
        return (
            <li ref={ref} className={cn("relative group", className)} {...props}>
                {children}
                {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {title}
                    </div>
                )}
            </li>
        );
    }
);
SidebarNavItem.displayName = "SidebarNavItem";

// --- Sidebar Link (used inside a Nav Item) ---
const SidebarNavLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
    ({ className, href, children, ...props }, ref) => {
        return (
            <a ref={ref} href={href} className={cn("flex items-center p-2 text-sm rounded-lg hover:bg-gray-700/80 transition-colors overflow-hidden", className)} {...props}>
                {children}
            </a>
        );
    }
);
SidebarNavLink.displayName = "SidebarNavLink";

// --- Sidebar Text (for items in links) ---
const SidebarNavText = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({ className, children, ...props }, ref) => {
        const { isCollapsed } = useSidebar();
        return (
            <span
                ref={ref}
                className={cn(
                    "ml-3 truncate transition-all duration-300",
                    isCollapsed ? "max-w-0 opacity-0" : "max-w-full opacity-100",
                    className
                )}
                {...props}
            >
                {children}
            </span>
        );
    }
);
SidebarNavText.displayName = "SidebarNavText";

// --- Sidebar Footer ---
const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <div ref={ref} className={cn("mt-auto pt-2", className)} {...props}>
                <ul className="list-none">
                    {children}
                </ul>
            </div>
        );
    }
);
SidebarFooter.displayName = "SidebarFooter";

export {
    Sidebar,
    SidebarToggle,
    SidebarContent,
    SidebarNav,
    SidebarNavItem,
    SidebarNavLink,
    SidebarNavText,
    SidebarFooter,
};
