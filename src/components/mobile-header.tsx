"use client";

import { Brain } from "lucide-react";

export function MobileHeader() {
  return (
    <header className="bg-background sticky top-0 z-40 flex items-center justify-center border-b p-4 md:hidden">
      <div className="flex items-center gap-2">
        <Brain className="text-primary h-5 w-5" />
        <span className="font-semibold">Anki</span>
      </div>
    </header>
  );
}
