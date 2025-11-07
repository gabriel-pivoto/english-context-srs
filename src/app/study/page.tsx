"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Grade } from "../../lib/sm2";
import type { StudyItem } from "../../lib/types";
import { StudyCard } from "../../components/StudyCard";

async function fetchDueItem(): Promise<StudyItem | null> {
  const response = await fetch("/api/due", { cache: "no-store" });
  if (response.status === 204) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Failed to load due items.");
  }
  const data = (await response.json()) as StudyItem;
  return data;
}

export default function StudyPage() {
  const [error, setError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const {
    data: item,
    isLoading,
    refetch,
    isRefetching,
    isError,
    error: loadError,
  } = useQuery({
    queryKey: ["due-item"],
    queryFn: fetchDueItem,
  });

  async function handleGrade(grade: Grade) {
    if (!item) return;
    setIsReviewing(true);
    setError(null);

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
      const message =
        err instanceof Error ? err.message : "Unexpected error while saving review.";
      setError(message);
    } finally {
      setIsReviewing(false);
    }
  }

  if (isLoading || isRefetching) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-b-transparent" />
        <p className="text-sm text-muted-foreground">Fetching your next due card...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-red-400">Failed to load cards</h1>
        <p className="max-w-md text-muted-foreground">
          {loadError instanceof Error ? loadError.message : "Unknown error occurred."}
        </p>
        <Link
          href="/"
          className="rounded-lg border border-border bg-secondary/60 px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary"
        >
          Back to generator
        </Link>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-3xl font-semibold">Nothing due right now!</h1>
        <p className="max-w-md text-muted-foreground">
          Generate a new session or come back later for scheduled reviews.
        </p>
        <Link
          href="/"
          className="rounded-lg border border-border bg-secondary/60 px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary"
        >
          Generate more cards
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <StudyCard item={item} onGrade={handleGrade} isReviewing={isReviewing} />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
