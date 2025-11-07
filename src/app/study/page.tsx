"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Grade } from "../../lib/sm2";
import type { StudyItem, ContextSummary } from "../../lib/types";
import { StudyCard } from "../../components/StudyCard";
import { Button } from "../../components/ui/button";

async function fetchDueItem(contextId?: string): Promise<StudyItem | null> {
  const searchParams = new URLSearchParams();
  if (contextId) {
    searchParams.set("contextId", contextId);
  }
  const query = searchParams.toString();
  const endpoint = query.length > 0 ? `/api/due?${query}` : "/api/due";
  const response = await fetch(endpoint, { cache: "no-store" });
  if (response.status === 204) {
    return null;
  }
  if (response.status === 401) {
    throw new Error("Please sign in to study your contexts.");
  }
  if (!response.ok) {
    throw new Error("Failed to load due items.");
  }
  return (await response.json()) as StudyItem;
}

async function fetchContextOptions(): Promise<ContextSummary[]> {
  const response = await fetch("/api/contexts?take=200", { cache: "no-store" });
  if (response.status === 401) {
    return [];
  }
  if (!response.ok) {
    throw new Error("Failed to load contexts.");
  }
  const data = (await response.json()) as { contexts: ContextSummary[] };
  return data.contexts;
}

export default function StudyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contextFromUrl = useMemo(() => searchParams.get("contextId") ?? "all", [searchParams]);
  const [selectedContext, setSelectedContext] = useState(contextFromUrl);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const contextIdParam = selectedContext === "all" ? undefined : selectedContext;

  useEffect(() => {
    setSelectedContext(contextFromUrl);
  }, [contextFromUrl]);

  const {
    data: contexts,
    isLoading: contextsLoading,
    isError: contextsError,
  } = useQuery({
    queryKey: ["contexts", "study"],
    queryFn: fetchContextOptions,
  });

  const {
    data: item,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["due-item", contextIdParam ?? "all"],
    queryFn: () => fetchDueItem(contextIdParam),
  });

  async function handleGrade(grade: Grade) {
    if (!item) return;
    setIsReviewing(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, grade }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to save review.");
      }
      await refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save review.");
    } finally {
      setIsReviewing(false);
    }
  }

  function handleContextChange(next: string) {
    setSelectedContext(next);
    const url = new URL(window.location.href);
    if (next === "all") {
      url.searchParams.delete("contextId");
    } else {
      url.searchParams.set("contextId", next);
    }
    router.replace(`${url.pathname}${url.search}`);
  }

  const showLoading = isLoading || isRefetching;

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-3xl border border-white/5 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Context filter</p>
          <p className="text-sm text-slate-300">Pick a set to focus your reviews.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedContext}
            onChange={(event) => handleContextChange(event.target.value)}
            disabled={contextsLoading || contextsError}
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All contexts</option>
            {contexts?.map((context) => (
              <option key={context.id} value={context.id}>
                {context.title} · {context.dueCount} due
              </option>
            ))}
          </select>
          <Button asChild variant="ghost" className="text-sm text-slate-200">
            <Link href="/">New context</Link>
          </Button>
        </div>
      </div>

      {showLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-b-transparent" />
          <p className="text-sm text-slate-300">Fetching your next due card...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-2xl font-semibold text-red-400">Failed to load cards</h1>
          <p className="max-w-md text-slate-400">
            {error instanceof Error ? error.message : "Unknown error occurred."}
          </p>
          <Button asChild variant="muted">
            <Link href="/">Back to generator</Link>
          </Button>
        </div>
      ) : !item ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-3xl font-semibold">Nothing due right now!</h1>
          <p className="max-w-md text-slate-300">
            Generate a new session or come back later for scheduled reviews.
          </p>
          <Button asChild>
            <Link href="/">Generate more cards</Link>
          </Button>
        </div>
      ) : (
        <>
          <StudyCard item={item} onGrade={handleGrade} isReviewing={isReviewing} />
          {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}
        </>
      )}
    </div>
  );
}
