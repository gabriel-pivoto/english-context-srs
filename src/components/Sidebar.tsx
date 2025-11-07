"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClientUser } from "./AppShell";
import type { ContextSummary } from "../lib/types";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { ContextList } from "./ContextList";

type SidebarProps = {
  user: ClientUser | null;
  isOpen: boolean;
  onToggle: (next: boolean) => void;
};

type ContextsResponse = {
  contexts: ContextSummary[];
  nextCursor: string | null;
  overallDueCount: number;
};

const levels = ["ALL", "A1", "A2", "B1", "B2", "C1"] as const;

export function Sidebar({ user, isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<(typeof levels)[number]>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  function handleOpenCreate() {
    setIsCreateOpen(true);
  }

  const debouncedSearch = useDebouncedValue(search, 350);

  const { data, isLoading, error } = useQuery({
    queryKey: ["contexts", debouncedSearch, level],
    queryFn: () =>
      fetchContexts({
        q: debouncedSearch || undefined,
        level: level === "ALL" ? undefined : level,
      }),
    enabled: Boolean(user),
  });

  const activeContextId = useMemo(() => {
    const match = pathname?.match(/\/contexts\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const content = !user ? (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-300">
      <p className="text-base font-semibold text-white">Sign in to unlock your contexts</p>
      <p>Use the magic link login to create study sets and keep progress synced locally.</p>
      <Button asChild className="w-full justify-center bg-primary/80 text-white hover:bg-primary">
        <Link href="/login">Sign in</Link>
      </Button>
    </div>
  ) : (
    <>
      <div className="space-y-2 px-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Search
        </label>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Airport, hospital, daily stand-up..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="px-4">
        <div className="flex flex-wrap gap-2">
          {levels.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLevel(option)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                level === option ? "bg-primary/80 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        <Button className="w-full justify-center bg-primary text-white hover:bg-primary/90" onClick={handleOpenCreate}>
          + New context
        </Button>
      </div>

      <div className="border-t border-white/5 px-4 pt-4">
        <Link
          href="/study"
          className={cn(
            "flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-primary",
            pathname === "/study" && "border-primary bg-white/5",
          )}
        >
          <span>All contexts</span>
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary-foreground">
            {data?.overallDueCount ?? 0} due
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <p className="px-2 py-6 text-sm text-slate-400">Loading contexts...</p>
        ) : error ? (
          <p className="px-2 py-6 text-sm text-red-300">Failed to load contexts.</p>
        ) : data && data.contexts.length > 0 ? (
          <ContextList contexts={data.contexts} activeId={activeContextId ?? undefined} />
        ) : (
          <p className="px-2 py-6 text-sm text-slate-400">No contexts yet.</p>
        )}
      </div>
    </>
  );

  const sidebarClassName = cn(
    "fixed inset-y-0 left-0 z-30 flex w-80 flex-col gap-4 border-r border-white/10 bg-slate-950/95 pb-6 pt-6 shadow-2xl backdrop-blur transition-transform duration-300 lg:static lg:translate-x-0",
    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
  );

  return (
    <>
      <aside className={sidebarClassName}>
        <div className="px-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Contexts</p>
          <p className="text-sm text-slate-300">Local-first decks per situation.</p>
        </div>
        {content}
      </aside>
      {user ? (
        <CreateContextDialog
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async () => {
            await queryClient.invalidateQueries({ queryKey: ["contexts"] });
            setIsCreateOpen(false);
          }}
        />
      ) : null}
      {user && isOpen ? (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => onToggle(false)}
        />
      ) : null}
    </>
  );
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

async function fetchContexts(params: { q?: string; level?: string }) {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.level) searchParams.set("level", params.level);
  searchParams.set("take", "50");

  const response = await fetch(`/api/contexts?${searchParams.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load contexts");
  }
  return (await response.json()) as ContextsResponse;
}

type CreateContextDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

function CreateContextDialog({ open, onClose, onCreated }: CreateContextDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("B1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/contexts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          level,
          nCloze: 4,
          nVocab: 4,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to create context.");
      }
      setTitle("");
      setDescription("");
      await onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-slate-950/90 p-6 text-sm text-white shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New context</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            Close
          </button>
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-slate-400">Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-slate-400">Notes</label>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-slate-400">Level</label>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-primary"
          >
            {levels
              .filter((lvl) => lvl !== "ALL")
              .map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
          </select>
        </div>
        {error ? <p className="text-red-300">{error}</p> : null}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 border border-white/10 bg-transparent text-white"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !title || !description} className="flex-1">
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
        <p className="text-xs text-slate-400">Generates 4 cloze + 4 vocab cards immediately.</p>
      </form>
    </div>
  );
}
