export const locales = ["ru", "en", "vi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";
export const localeCookieName = "lumina_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function localeFromAcceptLanguage(value: string | null): Locale {
  const languages = (value ?? "").toLowerCase().split(",").map((item) => item.trim().split(";")[0]);
  if (languages.some((item) => item === "vi" || item.startsWith("vi-"))) return "vi";
  if (languages.some((item) => item === "en" || item.startsWith("en-"))) return "en";
  return defaultLocale;
}

export function intlLocale(locale: Locale) {
  return locale === "vi" ? "vi-VN" : locale === "en" ? "en-US" : "ru-RU";
}
