"use client";

import { useEffect, useState } from "react";
import type { Grade } from "../lib/sm2";
import type { StudyItem, VocabMetadata } from "../lib/types";
import { formatDate } from "../lib/utils";
import { ClozeCard } from "./ClozeCard";
import { GradeBar } from "./GradeBar";
import { VocabCard } from "./VocabCard";

export function StudyCard({
  item,
  onGrade,
  isReviewing,
}: {
  item: StudyItem;
  onGrade: (grade: Grade) => Promise<void> | void;
  isReviewing: boolean;
}) {
  const [answered, setAnswered] = useState(false);
  const [lastGuess, setLastGuess] = useState<string | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    setAnswered(false);
    setWasCorrect(null);
    setLastGuess(null);
  }, [item.id]);

  const metadata: VocabMetadata | null =
    item.type === "VOCAB" && item.choices && !Array.isArray(item.choices)
      ? item.choices
      : null;

  function handleAnswered(result: { guess: string; correct: boolean }) {
    setAnswered(true);
    setLastGuess(result.guess);
    setWasCorrect(result.correct);
  }

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.contextTitle}</p>
          <p className="text-sm text-slate-300">
            Due {formatDate(item.due)} · Interval {item.interval}d · Ease {item.ease.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            {item.type === "CLOZE" ? "Cloze" : "Vocabulary"}
          </span>
          {wasCorrect !== null ? (
            <span
              className={`text-sm font-semibold ${
                wasCorrect ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {wasCorrect ? "Correct" : "Incorrect"}
            </span>
          ) : null}
        </div>
      </header>

      {item.type === "CLOZE" && Array.isArray(item.choices) ? (
        <ClozeCard
          prompt={item.prompt}
          options={item.choices}
          answer={item.answer}
          explanation={item.explanation}
          onAnswered={handleAnswered}
        />
      ) : null}

      {item.type === "VOCAB" && metadata ? (
        <VocabCard
          prompt={item.prompt}
          translation={item.answer}
          metadata={metadata}
          onAnswered={handleAnswered}
        />
      ) : null}

      {lastGuess ? (
        <div className="rounded-lg border border-border bg-background/80 p-4 text-xs uppercase tracking-wide text-muted-foreground">
          Your answer: <strong>{lastGuess}</strong>
        </div>
      ) : null}

      <GradeBar
        disabled={!answered || isReviewing}
        onGrade={(grade) => {
          setAnswered(false);
          onGrade(grade);
        }}
      />
    </div>
  );
}
