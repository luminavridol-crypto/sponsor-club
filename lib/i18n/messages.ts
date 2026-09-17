import ru from "@/locales/ru.json";
import en from "@/locales/en.json";
import vi from "@/locales/vi.json";
import type { Locale } from "@/lib/i18n/config";

export type Messages = typeof ru;
const dictionaries: Record<Locale, Messages> = { ru, en, vi };

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}
