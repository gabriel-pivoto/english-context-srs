"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { AnalyticsBucket } from "../../lib/types";

type Props = {
  title: string;
  data: AnalyticsBucket[];
  color?: string;
};

export function HistogramChart({ title, data, color = "#34d399" }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <p className="text-sm font-semibold">{title}</p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="bucket" stroke="#cbd5f5" tick={{ fill: "#cbd5f5", fontSize: 12 }} />
            <YAxis allowDecimals={false} stroke="#cbd5f5" tick={{ fill: "#cbd5f5", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Bar dataKey="count" fill={color} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
