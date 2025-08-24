/**
 * User Profile Dropdown Component
 * Shows user info and account actions
 */

'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface UserProfileDropdownProps {
  className?: string;
  align?: 'start' | 'center' | 'end';
  showEmail?: boolean;
  showName?: boolean;
  onLogout?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

export function UserProfileDropdown({
  className,
  align = 'end',
  showEmail = true,
  showName = true,
  onLogout,
  onProfileClick,
  onSettingsClick
}: UserProfileDropdownProps) {
  const { user, logout, loading } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn('relative h-10 w-10 rounded-full', className)}
          disabled={loading}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.picture} alt={user.name || user.email} />
            <AvatarFallback>
              {user.name ? getInitials(user.name) : user.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align={align}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {showName && user.name && (
              <p className="text-sm font-medium leading-none">{user.name}</p>
            )}
            {showEmail && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onProfileClick && (
          <DropdownMenuItem onClick={onProfileClick}>
            <Icons.user className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
        )}
        {onSettingsClick && (
          <DropdownMenuItem onClick={onSettingsClick}>
            <Icons.settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={loading}>
          {loading ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              <span>Signing out...</span>
            </>
          ) : (
            <>
              <Icons.logout className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}