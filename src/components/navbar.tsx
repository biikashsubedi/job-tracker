"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, KeyRound, LogOut, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Applications" },
  { href: "/board", label: "Board" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/system", label: "System", icon: Settings },
];

export interface NavUser {
  name?: string | null;
  email?: string | null;
}

function initialOf(user: NavUser): string {
  const source = user.name || user.email || "?";
  return source.charAt(0).toUpperCase();
}

function UserMenu({ user }: { user: NavUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {initialOf(user)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel className="flex flex-col">
          {user.name && <span className="truncate">{user.name}</span>}
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2">
          <Link href="/account">
            <KeyRound className="h-4 w-4" />
            Change password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-red-600 focus:text-red-600 dark:text-red-400"
          onSelect={(e) => {
            e.preventDefault();
            logout();
          }}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:gap-6 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Briefcase className="h-4 w-4" />
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">
            JobTrack
          </span>
        </Link>

        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto sm:gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-2.5 sm:text-sm",
                (link.href === "/system"
                  ? pathname.startsWith("/system")
                  : pathname === link.href) && "bg-accent text-foreground"
              )}
            >
              {link.icon && <link.icon className="h-3.5 w-3.5" />}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <Button
            size="sm"
            className="gap-1.5 rounded-lg shadow-sm"
            onClick={() => router.push("/?new=1")}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Application</span>
            <span className="sm:hidden">Add</span>
          </Button>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
