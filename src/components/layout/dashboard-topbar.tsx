"use client";

import { Bell, ChevronsUpDown, LogOut, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  clearAllNotificationsAction,
  clearNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import { ThemeSelector } from "@/components/layout/theme-selector";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NotificationItem = {
  id: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function DashboardTopbar({
  homeHref,
  userName,
  userEmail,
  userImage,
  unreadCount,
  notifications,
}: {
  homeHref: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  unreadCount: number;
  notifications: NotificationItem[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleMarkRead(id: string) {
    startTransition(async () => {
      try {
        const result = await markNotificationReadAction(id);
        if (!result.success) {
          toast.error("Couldn't mark notification as read", {
            description: result.error,
          });
        }
      } catch {
        toast.error("Couldn't mark notification as read");
      }
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      try {
        const result = await markAllNotificationsReadAction();
        if (!result.success) {
          toast.error("Couldn't mark notifications as read", {
            description: result.error,
          });
        }
      } catch {
        toast.error("Couldn't mark notifications as read");
      }
    });
  }

  function handleClear(id: string) {
    startTransition(async () => {
      try {
        const result = await clearNotificationAction(id);

        if (!result.success) {
          toast.error("Couldn't clear notification", {
            description: result.error,
          });
        }
      } catch {
        toast.error("Couldn't clear notification");
      }
    });
  }

  function handleClearAll() {
    startTransition(async () => {
      try {
        const result = await clearAllNotificationsAction();

        if (!result.success) {
          toast.error("Couldn't clear notifications", {
            description: result.error,
          });
        }
      } catch {
        toast.error("Couldn't clear notifications");
      }
    });
  }

  const notificationList = notifications.map((notification) => (
    // The highlight lives on the row, not the item, so it covers the X too:
    // Radix drops an item's focus when the pointer leaves it, which moving
    // onto the X would do. The X stays a sibling so clicking it never fires
    // the item's mark-as-read select.
    <div
      key={notification.id}
      className="relative rounded-sm hover:bg-accent has-[[data-slot=dropdown-menu-item]:focus]:bg-accent"
    >
      <DropdownMenuItem
        onSelect={() => !notification.readAt && handleMarkRead(notification.id)}
        className="flex w-full flex-col items-start gap-1 whitespace-normal pr-9 focus:bg-transparent"
      >
        <div className="flex w-full items-start gap-2">
          {!notification.readAt && (
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
          )}
          <p
            className={
              notification.readAt
                ? "text-sm text-muted-foreground"
                : "text-sm text-foreground"
            }
          >
            {notification.message}
          </p>
        </div>
        <span className="pl-3.5 text-xs text-muted-foreground">
          {timeAgo(notification.createdAt)}
        </span>
      </DropdownMenuItem>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => handleClear(notification.id)}
        disabled={isPending}
        className="absolute top-1 right-1 h-7 w-7 text-muted-foreground"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Clear notification</span>
      </Button>
    </div>
  ));

  return (
    <header className="sticky top-0 z-10 w-full bg-background">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
        <Link href={homeHref} className="flex items-center">
          <Image
            src="/logo_whitebg.png"
            alt="GMC"
            width={80}
            height={38}
            priority
            className="dark:hidden"
          />
          <Image
            src="/logo.png"
            alt="GMC"
            width={80}
            height={38}
            priority
            className="hidden dark:block"
          />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeSelector />
          <DropdownMenu>
            <DropdownMenuTrigger className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive" />
              )}
              <span className="sr-only">Notifications</span>
            </DropdownMenuTrigger>
            {/* About 4 notifications tall (header + the old 18rem list), never
                taller than the space Radix leaves below the bell. The menu's
                own overflow-y-auto is the only scroll bar. */}
            <DropdownMenuContent
              align="end"
              className="max-h-[min(21rem,var(--radix-dropdown-menu-content-available-height))] w-80"
            >
              <DropdownMenuLabel className="flex items-center justify-between font-normal">
                <span className="text-sm font-medium text-foreground">
                  Notifications
                </span>
                <span className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={isPending}
                      className="cursor-pointer text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
                    >
                      Mark all as read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      disabled={isPending}
                      className="cursor-pointer text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
                    >
                      Clear all
                    </button>
                  )}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet
                </p>
              ) : (
                notificationList
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <Avatar className="h-8 w-8">
                {userImage && <AvatarImage src={userImage} alt={userName} />}
                <AvatarFallback className="text-xs">
                  {initials(userName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">
                {userName}
              </span>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            {/* At least as wide as the trigger, wider for a long email (which
                a short name's trigger can't fit), and wrapping past max-w-xs
                rather than being clipped. */}
            <DropdownMenuContent
              align="end"
              className="w-max min-w-(--radix-dropdown-menu-trigger-width) max-w-xs"
            >
              <DropdownMenuLabel className="font-normal">
                <p className="break-all text-xs text-muted-foreground">
                  {userEmail}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" asChild>
                <Link href="/sign-out">
                  <LogOut />
                  Sign out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
