"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: icons.dashboard },
  { href: "/dashboard/map", label: "Map", icon: icons.map },
  { href: "/dashboard/sms", label: "SMS Agent", icon: icons.chatText },
  { href: "/dashboard/resources", label: "Resources", icon: icons.firstAid },
  { href: "/dashboard/reunification", label: "Reunification", icon: icons.family },
];

function NavContent() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Icon icon={icons.shield} className="h-5 w-5 text-foreground" />
          <span className="text-base font-semibold tracking-tight text-foreground">
            Aegis
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-1">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  active
                    ? "bg-hover text-foreground font-medium"
                    : "text-foreground-secondary hover:text-foreground hover:bg-hover"
                )}
              >
                <Icon icon={item.icon} className="h-[17px] w-[17px]" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <p className="text-[10px] tracking-wider text-foreground-muted">
          HackUSF 2026
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <>
      <aside className="hidden md:flex md:w-52 md:flex-col md:fixed md:inset-y-0 bg-surface border-r border-border">
        <NavContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <Sheet>
          <SheetTrigger className="p-2 rounded-md hover:bg-hover transition-colors">
            <Icon icon={icons.menu} className="h-5 w-5 text-foreground" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-52 bg-surface">
            <NavContent />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Icon icon={icons.shield} className="h-4 w-4 text-foreground" />
          <span className="text-sm font-semibold text-foreground">Aegis</span>
        </div>
      </div>
    </>
  );
}
