"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LevelSchema } from "../lib/zod";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

const levels = LevelSchema.options;

type GenerateResponse = {
  createdCloze: number;
  createdVocab: number;
  skipped: number;
};

export function GenerateForm() {
  const [context, setContext] = useState("");
  const [level, setLevel] = useState<(typeof levels)[number]>("A2");
  const [nCloze, setNCloze] = useState(8);
  const [nVocab, setNVocab] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  const disableSubmit =
    isSubmitting || context.trim().length < 3 || nCloze <= 0 || nVocab <= 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disableSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          level,
          nCloze,
          nVocab,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to generate items.");
      }

      const data = (await response.json()) as GenerateResponse;
      setResult(data);
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
      className="flex flex-col gap-6 rounded-xl border border-border bg-secondary/40 p-6 shadow-lg"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="context" className="text-sm font-semibold uppercase tracking-wide">
          Daily context
        </label>
        <textarea
          id="context"
          name="context"
          required
          rows={4}
          value={context}
          onChange={(event) => setContext(event.target.value)}
          placeholder='Example: "Airport check-in with a large suitcase"'
          className="rounded-lg border border-border bg-background/70 px-3 py-2 text-base shadow-sm transition hover:border-primary/60 focus:border-primary"
        />
        <p className="text-sm text-muted-foreground">
          Describe the situation you want to practice in one or two sentences.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="level" className="text-sm font-semibold uppercase tracking-wide">
            CEFR Level
          </label>
          <select
            id="level"
            name="level"
            value={level}
            onChange={(event) => setLevel(event.target.value as (typeof levels)[number])}
            className="rounded-lg border border-border bg-background/70 px-3 py-2 text-base shadow-sm transition hover:border-primary/60 focus:border-primary"
          >
            {levels.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <NumberField
          id="nCloze"
          label="Cloze items"
          value={nCloze}
          onChange={setNCloze}
        />

        <NumberField
          id="nVocab"
          label="Vocab items"
          value={nVocab}
          onChange={setNVocab}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={disableSubmit} className={cn(disableSubmit && "opacity-70")}>
          {isSubmitting ? "Generating..." : "Generate session"}
        </Button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {result ? (
          <div className="rounded-lg border border-border bg-background/80 p-4 text-sm text-muted-foreground">
            <p>
              Added <strong>{result.createdCloze}</strong> cloze and{" "}
              <strong>{result.createdVocab}</strong> vocab items.
            </p>
            {result.skipped > 0 ? (
              <p className="mt-1">
                Skipped <strong>{result.skipped}</strong> duplicates (already in the deck).
              </p>
            ) : null}
            <Link
              href="/study"
              className="mt-3 inline-flex items-center text-primary underline underline-offset-4 hover:no-underline"
            >
              {"Go to Study ->"}
            </Link>
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
      <label htmlFor={id} className="text-sm font-semibold uppercase tracking-wide">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="number"
        min={1}
        max={20}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-lg border border-border bg-background/70 px-3 py-2 text-base shadow-sm transition hover:border-primary/60 focus:border-primary"
      />
    </div>
  );
}
