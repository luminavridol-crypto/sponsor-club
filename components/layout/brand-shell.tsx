import Link from "next/link";
import { ReactNode } from "react";
import { LogoMark } from "@/components/layout/logo-mark";
import { ScrollTopButton } from "@/components/layout/scroll-top-button";
import { ViewModeShell } from "@/components/layout/view-mode-shell";

export function BrandShell({
  children,
  rightSlot
}: {
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <ViewModeShell>
      <div className="min-h-screen bg-hero text-white">
        <header className="border-b border-white/10 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] shadow-glow">
                <LogoMark className="h-8 w-8" withGlow={false} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-[0.32em] text-white/50 sm:text-[11px]">
                  Пространство Lumina
                </p>
                <p className="truncate text-sm font-semibold text-white sm:text-base">Lumina</p>
              </div>
            </Link>
            <div className="w-full lg:w-auto">{rightSlot}</div>
          </div>
        </header>
        <main>{children}</main>
        <ScrollTopButton />
      </div>
    </ViewModeShell>
  );
}
