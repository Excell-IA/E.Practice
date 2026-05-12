import type { Metadata } from "next";

import "@/styles/globals.css";

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
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
