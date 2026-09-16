import { BrandShell } from "@/components/layout/brand-shell";

export default function InviteLoading() {
  return <BrandShell><section className="mx-auto flex min-h-[calc(100vh-84px)] max-w-6xl items-center justify-center px-4 py-12 sm:px-6"><div className="w-full max-w-md animate-pulse rounded-[30px] border border-white/10 bg-white/[0.04] p-8"><div className="h-3 w-36 rounded bg-white/10" /><div className="mt-5 h-9 w-64 rounded bg-white/10" /><div className="mt-8 grid gap-4">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-12 rounded-2xl bg-white/[0.06]" />)}</div></div></section></BrandShell>;
}
