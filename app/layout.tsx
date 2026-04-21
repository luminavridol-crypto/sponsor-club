import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Приватный клуб Lumina",
  description: "Закрытый клуб Lumina для подписчиков и эксклюзивного контента"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
