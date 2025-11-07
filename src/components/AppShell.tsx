"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export type ClientUser = {
  id: string;
  email: string;
  profile: {
    level: string | null;
    native: string | null;
    target: string | null;
  } | null;
};

type Props = {
  user: ClientUser | null;
  children: ReactNode;
};

export function AppShell({ user, children }: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <Sidebar user={user} isOpen={isSidebarOpen} onToggle={setIsSidebarOpen} />
      <div className="flex flex-1 flex-col">
        <TopNav user={user} onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
        <main className="flex-1 px-4 py-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
