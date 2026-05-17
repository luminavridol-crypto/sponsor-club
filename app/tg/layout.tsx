import Script from "next/script";
import { headers } from "next/headers";
import { TelegramAuthGate } from "@/components/telegram/telegram-auth-gate";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";

export default async function TelegramLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getTelegramProfileFromSession();

  if (!profile) {
    const headerStore = await headers();
    const pathname = headerStore.get("x-current-pathname") || "/tg";
    return (
      <>
        <Script src="https://telegram.org/js/telegram-web-app.js?62" strategy="beforeInteractive" />
        <TelegramAuthGate pathname={pathname} />
      </>
    );
  }

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js?62" strategy="beforeInteractive" />
      {children}
    </>
  );
}
