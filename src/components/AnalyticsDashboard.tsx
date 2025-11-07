"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AnalyticsOverview } from "../lib/types";
import { Button } from "./ui/button";
import { HistogramChart } from "./charts/HistogramChart";
import { DailyReviewsChart } from "./charts/DailyReviewsChart";
import { StatCard } from "./charts/StatCard";

async function fetchAnalytics(): Promise<AnalyticsOverview> {
  const response = await fetch("/api/analytics/overview", { cache: "no-store" });
  if (response.status === 401) {
    throw new Error("Sign in to view analytics.");
  }
  if (!response.ok) {
    throw new Error("Failed to load analytics.");
  }
  return (await response.json()) as AnalyticsOverview;
}

type Props = {
  enabled: boolean;
};

export function AnalyticsDashboard({ enabled }: Props) {
  const [visible, setVisible] = useState(false);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: fetchAnalytics,
    enabled: enabled && visible,
  });

  if (!enabled) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
        Sign in to unlock charts with your ease, intervals, and accuracy.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button onClick={() => setVisible((prev) => !prev)} variant="muted">
        {visible ? "Hide analytics" : "Show analytics"}
      </Button>

      {!visible ? (
        <p className="text-sm text-slate-400">Scroll and click “Show analytics” to load your stats.</p>
      ) : isLoading ? (
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-b-transparent" />
          Loading charts...
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-red-500/40 bg-red-500/10 px-4 py-6 text-sm text-red-100">
          {error instanceof Error ? error.message : "Failed to load analytics."}
          <Button variant="ghost" className="ml-4 text-white" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard label="Overall accuracy" value={`${data.overallAccuracy}%`} helper="Grades ≥ 4 / total reviews" />
            <StatCard label="Total lapses" value={`${data.lapses}`} helper="Grade 0 count" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <HistogramChart title="Ease distribution" data={data.easeBuckets} color="#34d399" />
            <HistogramChart title="Interval distribution" data={data.intervalBuckets} color="#a78bfa" />
          </div>
          <DailyReviewsChart data={data.dailyReviews} />
        </div>
      ) : null}
    </div>
  );
}
