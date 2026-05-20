export const dynamic = "force-dynamic";

import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAnyProfile } from "@/lib/auth/guards";

export default async function TelegramSupportPage() {
  const profile = await requireAnyProfile();

  return (
    <MiniAppShell profile={profile} title="Задонатить" subtitle="Этот раздел я скоро доделаю прямо внутри Telegram.">
      <section className="rounded-[28px] border border-accent/25 bg-accent/10 p-5 shadow-glow">
        <p className="text-xs uppercase tracking-[0.24em] text-accentSoft">Скоро появится</p>
        <h2 className="mt-3 text-xl font-semibold text-white">Поддержка внутри Mini App</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Здесь скоро появится удобный раздел для доната прямо внутри этого Telegram Mini App.
        </p>
      </section>
    </MiniAppShell>
  );
}
