"use client";

import { useState, type FormEvent } from "react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

type Props = {
  isDev: boolean;
};

export function LoginForm({ isDev }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter an email address.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = data?.error ?? "Could not send the magic link.";
        throw new Error(message);
      }

      setStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      setStatus("idle");
    }
  }

  const isDisabled = status === "loading" || status === "success";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card px-6 py-8 shadow-sm">
      <div className="space-y-2">
        <label className="text-sm font-semibold">Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className={cn(
            "w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-base outline-none transition",
            "focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60",
          )}
          disabled={isDisabled}
          required
        />
      </div>

      <Button type="submit" disabled={isDisabled} className="w-full justify-center">
        {status === "loading" ? "Sending link..." : status === "success" ? "Email sent" : "Send magic link"}
      </Button>

      {status === "success" ? (
        <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Check your inbox for a one-time link. It expires in 15 minutes.
          {isDev ? (
            <>
              {" "}
              During local dev, open <span className="font-semibold">/api/dev/last-email</span> to copy the latest link.
            </>
          ) : null}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </form>
  );
}
