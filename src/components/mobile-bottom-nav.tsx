"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Play, BookOpen, BarChart3, User } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    title: "Home",
    href: "/",
    icon: Home,
  },
  {
    title: "Study",
    href: "/study",
    icon: Play,
  },
  {
    title: "Decks",
    href: "/decks",
    icon: BookOpen,
  },
  {
    title: "Stats",
    href: "/stats",
    icon: BarChart3,
  },
  {
    title: "Profile",
    href: "/account",
    icon: User,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-background fixed right-0 bottom-0 left-0 z-50 border-t md:hidden">
      <div className="grid h-16 grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                "hover:text-foreground focus:text-foreground focus:outline-none",
                "min-h-[44px]", // Ensure minimum touch target size
                isActive ? "text-foreground" : "text-muted-foreground/60",
              )}
            >
              <Icon
                className={cn(
                  "transition-all duration-200",
                  isActive
                    ? "text-foreground h-6 w-6"
                    : "text-muted-foreground/60 h-5 w-5",
                )}
              />
              <span
                className={cn(
                  "transition-all duration-200",
                  isActive
                    ? "text-foreground text-[11px] font-semibold"
                    : "text-muted-foreground/60 text-[10px] font-medium",
                )}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
