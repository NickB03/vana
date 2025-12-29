import { useState, useEffect } from "react";
import { User, Settings, HelpCircle, LogOut, Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { useTheme } from "@/hooks/use-theme";

interface UserProfileButtonProps {
  collapsed?: boolean;
}

export function UserProfileButton({ collapsed = false }: UserProfileButtonProps) {
  const navigate = useNavigate();
  const { themeMode, colorTheme, setThemeMode, setColorTheme } = useTheme();
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        });
      }
      setIsLoading(false);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Show skeleton while loading user data
  if (isLoading) {
    return (
      <div
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5",
          collapsed && "justify-center px-2"
        )}
        role="status"
        aria-label="Loading profile"
      >
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        {!collapsed && (
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        )}
        <span className="sr-only">Loading profile</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-auto px-3 py-2.5 hover:bg-accent/50 transition-colors",
            collapsed && "justify-center px-2"
          )}
          aria-label="User account menu"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={undefined} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(user.name || 'U')}
            </AvatarFallback>
          </Avatar>

          {!collapsed && (
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span className="text-sm font-medium truncate w-full">
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground truncate w-full">
                {user.email}
              </span>
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64"
        align={collapsed ? "end" : "start"}
        side="top"
        sideOffset={8}
      >
        {/* User Info Header */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={undefined} alt={user.name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(user.name || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold truncate">{user.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Settings Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Settings
        </DropdownMenuLabel>

        {/* Theme Mode */}
        <div className="px-2 py-2">
          <div className="text-xs font-medium mb-2 text-muted-foreground">Theme Mode</div>
          <ThemeSwitcher value={themeMode} onChange={setThemeMode} />
        </div>

        <DropdownMenuSeparator />

        {/* Color Theme Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            <span>Color Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => setColorTheme("default")}>
              <Check className={`mr-2 h-4 w-4 ${colorTheme === "default" ? "opacity-100" : "opacity-0"}`} />
              <span>Default</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColorTheme("charcoal")}>
              <Check className={`mr-2 h-4 w-4 ${colorTheme === "charcoal" ? "opacity-100" : "opacity-0"}`} />
              <span>Charcoal</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColorTheme("gemini")}>
              <Check className={`mr-2 h-4 w-4 ${colorTheme === "gemini" ? "opacity-100" : "opacity-0"}`} />
              <span>Sky Blue</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColorTheme("ocean")}>
              <Check className={`mr-2 h-4 w-4 ${colorTheme === "ocean" ? "opacity-100" : "opacity-0"}`} />
              <span>Ocean Breeze</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColorTheme("sunset")}>
              <Check className={`mr-2 h-4 w-4 ${colorTheme === "sunset" ? "opacity-100" : "opacity-0"}`} />
              <span>Sunset</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColorTheme("forest")}>
              <Check className={`mr-2 h-4 w-4 ${colorTheme === "forest" ? "opacity-100" : "opacity-0"}`} />
              <span>Forest</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColorTheme("rose")}>
              <Check className={`mr-2 h-4 w-4 ${colorTheme === "rose" ? "opacity-100" : "opacity-0"}`} />
              <span>Rose</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Learn More */}
        <DropdownMenuItem>
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Learn More</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
