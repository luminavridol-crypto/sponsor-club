import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap"
});

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
      <body className={manrope.variable} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
