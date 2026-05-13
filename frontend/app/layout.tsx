import type { Metadata } from "next";
import { Inter, Manrope, Space_Grotesk } from "next/font/google";

import "@/styles/globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const label = Inter({
  subsets: ["latin"],
  variable: "--font-label",
});

export const metadata: Metadata = {
  title: "E.Practice",
  description: "Modulo case management E.Work per studi professionali",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" data-theme="excellia" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} ${label.variable}`}>
        {children}
      </body>
    </html>
  );
}
