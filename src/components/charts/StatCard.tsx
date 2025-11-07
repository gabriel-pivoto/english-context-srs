"use client";

type Props = {
  label: string;
  value: string;
  helper?: string;
};

export function StatCard({ label, value, helper }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-3xl font-semibold text-white">{value}</p>
      {helper ? <p className="text-xs text-slate-400">{helper}</p> : null}
    </div>
  );
}
