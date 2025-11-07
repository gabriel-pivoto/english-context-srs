"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { cn } from "../lib/utils";
import type { VocabMetadata } from "../lib/types";
import { Button } from "./ui/button";

const collator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  usage: "search",
  ignorePunctuation: true,
});

export function VocabCard({
  prompt,
  translation,
  metadata,
  onAnswered,
}: {
  prompt: string;
  translation: string;
  metadata: VocabMetadata;
  onAnswered: (result: { guess: string; correct: boolean }) => void;
}) {
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    setGuess("");
    setRevealed(false);
    setWasCorrect(null);
  }, [prompt, translation]);

  const frequencyLabel = useMemo(
    () => metadata.frequency.charAt(0).toUpperCase() + metadata.frequency.slice(1),
    [metadata.frequency],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (revealed) return;
    revealResult(guess);
  }

  function revealResult(input: string) {
    if (revealed) return;
    const trimmed = input.trim();
    const correct = trimmed.length > 0 && collator.compare(trimmed, translation) === 0;
    setWasCorrect(correct);
    setRevealed(true);
    onAnswered({ guess: trimmed || "(no answer)", correct });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-background/70 p-5">
        <h2 className="text-3xl font-bold tracking-wide">{prompt}</h2>
        <p className="mt-2 text-sm uppercase tracking-widest text-muted-foreground">
          {metadata.partOfSpeech} · {frequencyLabel} frequency
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="guess" className="text-sm font-semibold uppercase tracking-wide">
          Meaning (pt-BR or English)
        </label>
        <input
          id="guess"
          name="guess"
          disabled={revealed}
          value={guess}
          onChange={(event) => setGuess(event.target.value)}
          placeholder='Example: "balcão de atendimento"'
          className="rounded-lg border border-border bg-background/70 px-3 py-2 text-base shadow-sm transition hover:border-primary/60 focus:border-primary disabled:opacity-70"
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={revealed} className={cn(revealed && "opacity-70")}>
            Check meaning
          </Button>
          <Button
            type="button"
            variant="muted"
            disabled={revealed}
            className={cn(revealed && "opacity-70")}
            onClick={() => revealResult("")}
          >
            I don&apos;t know
          </Button>
        </div>
      </form>

      {revealed ? (
        <div className="rounded-lg border border-border bg-background/80 p-4 text-sm text-muted-foreground">
          <p>
            Translation: <strong>{translation}</strong>
          </p>
          {metadata.sampleSentence ? (
            <p className="mt-2">
              Example: <em>{metadata.sampleSentence}</em>
            </p>
          ) : null}
          {wasCorrect !== null ? (
            <p className={cn("mt-3 font-semibold", wasCorrect ? "text-emerald-400" : "text-red-400")}>
              {wasCorrect ? "Nice! You nailed it." : "Review this word carefully."}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
