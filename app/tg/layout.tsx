import Script from "next/script";
import { headers } from "next/headers";
import { TelegramAuthGate } from "@/components/telegram/telegram-auth-gate";
import { readTelegramSession } from "@/lib/telegram/session";

export default async function TelegramLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await readTelegramSession();

  if (!session) {
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
