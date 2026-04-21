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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 shadow-glow" />
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-white/50">
                Private Club
              </p>
              <p className="text-lg font-semibold text-white">Sponsor Lounge</p>
            </div>
          </Link>
          {rightSlot}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
