"use client";

import { Brain } from "lucide-react";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-center border-b bg-background p-4 md:hidden">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <span className="font-semibold">Anki AI</span>
      </div>
    </header>
  );
}
