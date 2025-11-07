"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { LevelSchema } from "../lib/zod";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

const levels = LevelSchema.options;

type CreateContextResponse = {
  context: {
    id: string;
    title: string;
    level: string;
  };
  stats: {
    createdCloze: number;
    createdVocab: number;
    skipped: number;
  };
};

export function GenerateForm() {
  const [title, setTitle] = useState("");
  const [scenario, setScenario] = useState("");
  const [level, setLevel] = useState<(typeof levels)[number]>("A2");
  const [nCloze, setNCloze] = useState(6);
  const [nVocab, setNVocab] = useState(6);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateContextResponse | null>(null);

  const disableSubmit =
    isSubmitting || title.trim().length < 3 || scenario.trim().length < 10;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disableSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/contexts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: scenario,
          level,
          nCloze,
          nVocab,
        }),
      });

      if (response.status === 401) {
        throw new Error("Sign in to generate personalized decks.");
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to create context.");
      }

      const payload = (await response.json()) as CreateContextResponse;
      setResult(payload);
      setTitle("");
      setScenario("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-xs font-semibold uppercase tracking-wide text-primary/80">
          Context title
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder='Example: "Airport check-in with a large suitcase"'
          className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-base text-white shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="scenario" className="text-xs font-semibold uppercase tracking-wide text-primary/80">
          Describe the situation
        </label>
        <textarea
          id="scenario"
          name="scenario"
          required
          rows={4}
          value={scenario}
          onChange={(event) => setScenario(event.target.value)}
          placeholder='Explain what you want to practice. Example: "Checking in a suitcase that is overweight and negotiating with the attendant."'
          className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-base text-white shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-sm text-slate-300">
          Give 1-2 sentences so the generator can build realistic prompts for you.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="level" className="text-xs font-semibold uppercase tracking-wide text-primary/80">
            CEFR Level
          </label>
          <select
            id="level"
            name="level"
            value={level}
            onChange={(event) => setLevel(event.target.value as (typeof levels)[number])}
            className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-base text-white shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
          >
            {levels.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <NumberField id="nCloze" label="Cloze cards" value={nCloze} onChange={setNCloze} />
        <NumberField id="nVocab" label="Vocab cards" value={nVocab} onChange={setNVocab} />
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={disableSubmit} className={cn(disableSubmit && "opacity-70")}>
          {isSubmitting ? "Creating context..." : "Create study context"}
        </Button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {result ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm text-emerald-50">
            <p className="font-semibold text-white">
              Created {result.context.title} ({result.context.level}).
            </p>
            <p className="mt-1">
              Added <strong>{result.stats.createdCloze}</strong> cloze ·{" "}
              <strong>{result.stats.createdVocab}</strong> vocab.
            </p>
            {result.stats.skipped > 0 ? (
              <p className="mt-1 text-emerald-200/80">
                Skipped {result.stats.skipped} duplicates already stored.
              </p>
            ) : null}
            <div className="mt-3 flex gap-4">
              <Link
                href={`/contexts/${result.context.id}`}
                className="text-sm font-semibold text-emerald-200 underline underline-offset-4 hover:text-white"
              >
                Edit set
              </Link>
              <Link
                href={`/study?contextId=${result.context.id}`}
                className="text-sm font-semibold text-emerald-200 underline underline-offset-4 hover:text-white"
              >
                Study now →
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-primary/80">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="number"
        min={0}
        max={20}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-base text-white shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
      />
      <p className="text-xs text-slate-400">Set zero to skip this type for now.</p>
    </div>
  );
}
