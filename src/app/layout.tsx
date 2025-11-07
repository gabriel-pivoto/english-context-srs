import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell, type ClientUser } from "../components/AppShell";
import { getUserFromCookies } from "../lib/auth";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "English Context SRS",
  description: "Local-only SRS powered by Gemini for contextual English practice.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const sessionUser = await getUserFromCookies();
  const clientUser: ClientUser | null = sessionUser
    ? {
        id: sessionUser.id,
        email: sessionUser.email,
        profile: sessionUser.profile
          ? {
              level: sessionUser.profile.level ?? null,
              native: sessionUser.profile.native ?? null,
              target: sessionUser.profile.target ?? null,
            }
          : null,
      }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <Providers>
          <AppShell user={clientUser}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
