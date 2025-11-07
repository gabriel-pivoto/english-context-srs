"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

function renderPrompt(prompt: string, answer: string, revealed: boolean) {
  const parts = prompt.split("____");
  if (parts.length === 1) {
    return <span>{prompt}</span>;
  }

  return (
    <span>
      {parts[0]}
      <span
        className={cn(
          "rounded-md px-1 font-semibold",
          revealed ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {revealed ? answer : "____"}
      </span>
      {parts[1]}
    </span>
  );
}

export function ClozeCard({
  prompt,
  options,
  answer,
  explanation,
  onAnswered,
}: {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string | null;
  onAnswered: (result: { guess: string; correct: boolean }) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setSelectedIndex(null);
    setRevealed(false);
  }, [prompt, options, answer]);

  const handleSelect = useCallback(
    (index: number) => {
      if (revealed) return;
      const guess = options[index];
      if (typeof guess !== "string") {
        return;
      }
      const correct = guess === answer;
      setSelectedIndex(index);
      setRevealed(true);
      onAnswered({ guess, correct });
    },
    [revealed, options, answer, onAnswered],
  );

  useEffect(() => {
    if (revealed) return;
    function handleKey(event: KeyboardEvent) {
      if (revealed) return;
      const key = event.key;
      if (!["1", "2", "3"].includes(key)) return;
      const index = Number(key) - 1;
      if (index >= options.length) return;
      event.preventDefault();
      handleSelect(index);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [revealed, options.length, handleSelect]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-background/70 p-5 text-lg leading-relaxed">
        {renderPrompt(prompt, answer, revealed)}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = option === answer;
          return (
            <Button
              key={option}
              type="button"
              disabled={revealed}
              variant="muted"
              className={cn(
                "justify-start px-3 py-3 text-base",
                revealed && !isSelected && "opacity-70",
                revealed && isCorrect && "border-accent text-accent-foreground",
                revealed && isSelected && !isCorrect && "border-red-500 text-red-400",
              )}
              onClick={() => handleSelect(index)}
            >
              <span className="mr-2 text-xs text-muted-foreground">{index + 1}.</span>
              {option}
            </Button>
          );
        })}
      </div>
      {revealed ? (
        <div className="rounded-lg border border-border bg-background/80 p-4 text-sm text-muted-foreground">
          <p>
            Correct answer: <strong>{answer}</strong>
          </p>
          {explanation ? <p className="mt-2">{explanation}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
