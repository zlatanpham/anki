"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";

export function MobileHeader() {
  return (
    <div className="flex items-center gap-2 border-b p-4 md:hidden">
      <SidebarTrigger className="p-2" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </SidebarTrigger>
      <span className="font-semibold">Anki AI</span>
    </div>
  );
}
