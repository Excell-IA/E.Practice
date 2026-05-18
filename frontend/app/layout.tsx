import type { Metadata } from "next";
import { Inter, Manrope, Space_Grotesk } from "next/font/google";
import Script from "next/script";

import { Providers } from "@/components/Providers";
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

const CLARITY_PROJECT_ID = "wszktplc5x";

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
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
