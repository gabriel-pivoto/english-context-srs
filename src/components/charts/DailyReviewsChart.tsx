"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { DailyReviewPoint } from "../../lib/types";

type Props = {
  data: DailyReviewPoint[];
};

export function DailyReviewsChart({ data }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <p className="text-sm font-semibold">Daily reviews (last 30 days)</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" stroke="#cbd5f5" tick={{ fill: "#cbd5f5", fontSize: 11 }} />
            <YAxis allowDecimals={false} stroke="#cbd5f5" tick={{ fill: "#cbd5f5", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
