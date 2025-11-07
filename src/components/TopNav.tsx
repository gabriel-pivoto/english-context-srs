"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import type { ClientUser } from "./AppShell";

type Props = {
  user: ClientUser | null;
  onToggleSidebar: () => void;
};

export function TopNav({ user, onToggleSidebar }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-white/5 px-4 py-4 backdrop-blur lg:px-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-100 shadow lg:hidden"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          English Context SRS
        </Link>
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-300">
        {user ? (
          <>
            <div className="hidden flex-col text-right sm:flex">
              <span className="font-semibold text-white">{user.email}</span>
              {user.profile?.level ? (
                <span className="text-xs text-slate-400">
                  Level {user.profile.level} · {user.profile.target ?? "EN"}
                </span>
              ) : null}
            </div>
            <Button variant="muted" className="bg-white/10 text-white hover:bg-white/20" onClick={handleLogout}>
              Sign out
            </Button>
          </>
        ) : (
          <Button asChild variant="muted" className="bg-white/10 text-white hover:bg-white/20">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
