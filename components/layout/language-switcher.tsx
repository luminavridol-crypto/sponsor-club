"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { localeCookieName } from "@/lib/i18n/config";

type Option = { value: Locale; label: string };

export function LanguageSwitcher({ locale, label, options }: { locale: Locale; label: string; options: Option[] }) {
  const router = useRouter();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={locale}
        onChange={(event) => {
          document.cookie = `${localeCookieName}=${event.target.value}; Path=/; Max-Age=31536000; SameSite=Lax`;
          router.refresh();
        }}
        className="h-10 cursor-pointer rounded-full border border-white/12 bg-[#100b18]/85 px-3 text-xs font-semibold text-white/78 outline-none transition focus:border-accent/50"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
