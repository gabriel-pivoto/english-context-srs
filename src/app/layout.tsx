import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "English Context SRS",
  description: "Local-only SRS powered by Gemini for contextual English practice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <Providers>
          <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-16 pt-10">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
