import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { messages } = await getI18n();
  const copy = messages.errors;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg rounded-[32px] border border-white/10 bg-white/5 p-8 text-center shadow-glow">
        <p className="text-sm uppercase tracking-[0.28em] text-accentSoft">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">{copy.notFoundTitle}</h1>
        <p className="mt-4 text-sm leading-7 text-white/62">
          {copy.notFoundDescription}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/tg"
            className="rounded-2xl bg-white px-4 py-3 font-medium text-background transition hover:bg-goldSoft"
          >
            {copy.dashboard}
          </Link>
          <Link
            href="/tg/content"
            className="rounded-2xl border border-white/10 px-4 py-3 text-white/80 transition hover:border-accent/40 hover:text-white"
          >
            {copy.feed}
          </Link>
        </div>
      </div>
    </main>
  );
}
