"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Cake,
  Clock,
  LayoutDashboard,
  PartyPopper,
  Plug,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/birthdays", label: "Birthdays", icon: Cake },
  { href: "/holidays", label: "Holidays", icon: PartyPopper },
  { href: "/lead-times", label: "Lead times", icon: Clock },
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Nav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex gap-1", className)}>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export { CalendarDays };
