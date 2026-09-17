import "server-only";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, localeCookieName, localeFromAcceptLanguage } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

export async function getLocale() {
  const cookieLocale = (await cookies()).get(localeCookieName)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  const detected = localeFromAcceptLanguage((await headers()).get("accept-language"));
  return detected ?? defaultLocale;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, messages: getMessages(locale) };
}
