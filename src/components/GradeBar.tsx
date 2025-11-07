"use client";

import { useEffect } from "react";
import type { Grade } from "../lib/sm2";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

const gradeOptions: Array<{ label: string; grade: Grade; hotkey: string }> = [
  { label: "Again", grade: 0, hotkey: "a" },
  { label: "Hard", grade: 3, hotkey: "h" },
  { label: "Good", grade: 4, hotkey: "g" },
  { label: "Easy", grade: 5, hotkey: "e" },
];

export function GradeBar({
  onGrade,
  disabled,
}: {
  onGrade: (grade: Grade) => void;
  disabled?: boolean;
}) {
  useEffect(() => {
    if (disabled) return;

    function handler(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const match = gradeOptions.find((option) => option.hotkey === key);
      if (!match) return;
      event.preventDefault();
      onGrade(match.grade);
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, onGrade]);

  return (
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
      {gradeOptions.map((option) => (
        <Button
          key={option.grade}
          type="button"
          disabled={disabled}
          variant="muted"
          className={cn(
            "justify-center uppercase tracking-wide",
            disabled && "cursor-not-allowed hover:text-foreground",
          )}
          onClick={() => onGrade(option.grade)}
        >
          {option.label}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ({option.hotkey.toUpperCase()})
          </span>
        </Button>
      ))}
    </div>
  );
}
