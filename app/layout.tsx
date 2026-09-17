import type { Metadata } from "next";
import "./globals.css";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  if (locale === "en") return { title: "Lumina Private Club", description: "Lumina's private membership space and exclusive content" };
  if (locale === "vi") return { title: "Lumina Club", description: "Không gian thành viên và nội dung riêng của Lumina" };
  return { title: "Приватный клуб Lumina", description: "Закрытый клуб Lumina для подписчиков и эксклюзивного контента" };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
