import Link from "next/link";
import { ReactNode } from "react";

export function BrandShell({
  children,
  rightSlot
}: {
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-hero text-white">
      <header className="border-b border-white/10 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 shadow-glow" />
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-[0.24em] text-white/50 sm:text-xs sm:tracking-[0.32em]">
                Private Club
              </p>
              <p className="truncate text-base font-semibold text-white sm:text-lg">Sponsor Lounge</p>
            </div>
          </Link>
          <div className="w-full lg:w-auto">{rightSlot}</div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
