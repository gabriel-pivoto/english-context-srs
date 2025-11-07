"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ContextDetail } from "../lib/types";
import { formatDate } from "../lib/utils";
import { Button } from "./ui/button";

type Props = {
  initialContext: ContextDetail;
};

export function ContextDetailClient({ initialContext }: Props) {
  const router = useRouter();
  const [context, setContext] = useState(initialContext);
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState(initialContext.title);
  const [level, setLevel] = useState(initialContext.level);
  const [notes, setNotes] = useState(initialContext.notes ?? "");
  const [nCloze, setNCloze] = useState(3);
  const [nVocab, setNVocab] = useState(3);

  useEffect(() => {
    setTitle(initialContext.title);
    setLevel(initialContext.level);
    setNotes(initialContext.notes ?? "");
    setContext(initialContext);
  }, [initialContext]);

  const selectedCount = selected.length;

  async function refreshContext() {
    const response = await fetch(`/api/contexts/${context.id}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to refresh context.");
    }
    const data = (await response.json()) as ContextDetail;
    setContext(data);
    setTitle(data.title);
    setLevel(data.level);
    setNotes(data.notes ?? "");
    setSelected([]);
  }

  async function handleSaveMeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/contexts/${context.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, level, notes }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to save changes.");
      }
      await refreshContext();
      setStatus("Context updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nCloze === 0 && nVocab === 0) {
      setStatus("Specify how many cards to add.");
      return;
    }
    setIsGenerating(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/contexts/${context.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nCloze, nVocab }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to generate cards.");
      }
      await refreshContext();
      setStatus("Added new questions.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to generate cards.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRemoveSelected(ids: string[]) {
    if (ids.length === 0) {
      return;
    }
    setStatus(null);
    try {
      const response = await fetch(`/api/contexts/${context.id}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: ids }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to remove cards.");
      }
      await refreshContext();
      setStatus("Removed selected cards.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to remove cards.");
    }
  }

  async function handleDeleteContext() {
    if (!window.confirm("Delete this entire context? This cannot be undone.")) {
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/contexts/${context.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to delete context.");
      }
      router.push("/");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to delete context.");
      setIsDeleting(false);
    }
  }

  const allItemIds = useMemo(() => context.items.map((item) => item.id), [context.items]);
  const allSelected = selected.length === allItemIds.length && selected.length > 0;

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Context</p>
            <h1 className="text-3xl font-semibold text-white">{context.title}</h1>
            <p className="text-sm text-slate-300">
              Level {context.level} · Created {formatDate(context.createdAt)} · {context.items.length} cards ·{" "}
              {context.dueCount} due
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/study?contextId=${context.id}`}>Study this set</Link>
            </Button>
            <Button variant="muted" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Scroll to edit
            </Button>
            <Button variant="ghost" onClick={refreshContext}>
              Refresh
            </Button>
            <Button variant="outline" className="border-red-500 text-red-300 hover:bg-red-500/10" onClick={handleDeleteContext} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete set"}
            </Button>
          </div>
        </div>
      </header>

      {status ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
          {status}
        </div>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={handleSaveMeta} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">Edit context</h2>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-slate-400">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-slate-400">Level</label>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-primary"
            >
              {["A1", "A2", "B1", "B2", "C1"].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-slate-400">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-primary"
            />
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </form>

        <form onSubmit={handleGenerate} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">Add questions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-400">Cloze</label>
              <input
                type="number"
                min={0}
                max={20}
                value={nCloze}
                onChange={(event) => setNCloze(Number(event.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-400">Vocab</label>
              <input
                type="number"
                min={0}
                max={20}
                value={nVocab}
                onChange={(event) => setNVocab(Number(event.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-primary"
              />
            </div>
          </div>
          <Button type="submit" disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate cards"}
          </Button>
          <p className="text-xs text-slate-400">Uses Gemini (or mock data) to append new items.</p>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Items</h2>
            <p className="text-sm text-slate-400">{context.items.length} cards total.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelected(allItemIds);
                  } else {
                    setSelected([]);
                  }
                }}
                className="h-4 w-4 rounded border border-white/20 bg-transparent"
              />
              Select all
            </label>
            <Button
              variant="outline"
              className="border-red-500 text-red-300 hover:bg-red-500/10"
              disabled={selectedCount === 0}
              onClick={() => {
                void handleRemoveSelected(selected);
              }}
            >
              Remove selected ({selectedCount})
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">Prompt</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Ease</th>
                <th className="px-3 py-2">Interval</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {context.items.map((item) => {
                const isSelected = selected.includes(item.id);
                return (
                  <tr key={item.id} className="border-t border-white/5">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelected((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
                          } else {
                            setSelected((prev) => prev.filter((id) => id !== item.id));
                          }
                        }}
                        className="h-4 w-4 rounded border border-white/20 bg-transparent"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-white">{item.prompt}</p>
                      <p className="text-xs text-slate-400">Answer: {item.answer}</p>
                    </td>
                    <td className="px-3 py-2 text-xs uppercase tracking-wide text-slate-400">{item.type}</td>
                    <td className="px-3 py-2">{formatDate(item.due)}</td>
                    <td className="px-3 py-2">{item.ease.toFixed(2)}</td>
                    <td className="px-3 py-2">{item.interval}d</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs text-red-300 hover:text-red-100"
                        onClick={() => {
                          void handleRemoveSelected([item.id]);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
