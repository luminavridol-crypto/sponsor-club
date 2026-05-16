"use client";

import { ReactNode } from "react";
import { ScrollTopButton } from "@/components/layout/scroll-top-button";
import { ViewModeShell } from "@/components/layout/view-mode-shell";

export function DevPreviewShell({ children }: { children: ReactNode }) {
  return (
    <ViewModeShell>
      {children}
      <ScrollTopButton />
    </ViewModeShell>
  );
}
