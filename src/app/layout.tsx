import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const robotoCondensed = localFont({
  src: [
    { path: "./fonts/RobotoCondensed-Regular.woff", weight: "400", style: "normal" },
    { path: "./fonts/RobotoCondensed-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/RobotoCondensed-SemiBold.woff", weight: "600", style: "normal" },
  ],
  variable: "--font-roboto-condensed",
  display: "swap",
});

const benzin = localFont({
  src: "./fonts/Benzin-ExtraBold.woff",
  variable: "--font-benzin",
  weight: "800",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "UISamurai — UI-тренажёр",
    template: "%s · UISamurai",
  },
  description: "Тренажёр по интерфейсам: теория, задания и обсуждения.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${robotoCondensed.variable} ${benzin.variable}`}>
        {children}
      </body>
    </html>
  );
}
