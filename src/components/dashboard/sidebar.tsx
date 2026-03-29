"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: icons.dashboard },
      { href: "/dashboard/map", label: "Map", icon: icons.map },
    ],
  },
  {
    label: "Response",
    items: [
      { href: "/dashboard/sms", label: "SMS Agent", icon: icons.chatText },
      { href: "/dashboard/alerts", label: "Alerts", icon: icons.bellRinging },
      { href: "/dashboard/reports", label: "Reports", icon: icons.notepad },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/dashboard/resources", label: "Resources", icon: icons.firstAid },
      { href: "/dashboard/reunification", label: "Reunification", icon: icons.family },
      { href: "/dashboard/recovery", label: "Recovery", icon: icons.hardHat },
    ],
  },
];

function NavContent() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Icon icon={icons.shield} className="h-5 w-5 text-[#1A1A1A]" />
          <span className="text-base font-semibold tracking-tight text-[#1A1A1A]">
            Aegis
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-1 space-y-5">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-[#999] font-medium">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                      active
                        ? "bg-[#1A1A1A] text-[#F8F8F6] font-medium shadow-sm"
                        : "text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F0EFED]/60"
                    )}
                  >
                    <Icon icon={item.icon} className="h-[17px] w-[17px]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-[#E5E4E2]">
        <p className="text-[10px] text-[#6B6B6B]/40 tracking-wider">
          HackUSF 2026
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <>
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 bg-[#F8F8F6] border-r border-[#E5E4E2]">
        <NavContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#F8F8F6]/80 backdrop-blur-md border-b border-[#E5E4E2]/50 px-4 py-3 flex items-center gap-3">
        <Sheet>
          <SheetTrigger className="p-2 rounded-md hover:bg-[#F0EFED] transition-colors">
            <Icon icon={icons.menu} className="h-5 w-5 text-[#1A1A1A]" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-56 bg-[#F8F8F6]">
            <NavContent />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Icon icon={icons.shield} className="h-4 w-4 text-[#1A1A1A]" />
          <span className="text-sm font-semibold text-[#1A1A1A]">Aegis</span>
        </div>
      </div>
    </>
  );
}
