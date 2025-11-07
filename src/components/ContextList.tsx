"use client";

import Link from "next/link";
import type { ContextSummary } from "../lib/types";
import { cn, formatRelativeDay } from "../lib/utils";

type Props = {
  contexts: ContextSummary[];
  activeId?: string;
};

export function ContextList({ contexts, activeId }: Props) {
  return (
    <nav className="space-y-2">
      {contexts.map((context) => {
        const isActive = activeId === context.id;
        return (
          <Link
            key={context.id}
            href={`/contexts/${context.id}`}
            className={cn(
              "flex items-center justify-between rounded-2xl border border-white/5 px-4 py-3 text-sm text-white transition hover:border-primary/60 hover:bg-white/5",
              isActive && "border-primary bg-white/10",
            )}
          >
            <div>
              <p className="font-semibold">{context.title}</p>
              <p className="text-xs text-slate-400">
                Level {context.level} · Updated {formatRelativeDay(context.lastActivity ?? context.updatedAt)}
              </p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-200">
                {context.dueCount} due
              </span>
              <p className="text-[11px] text-slate-400">{context.totalItems} cards</p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
