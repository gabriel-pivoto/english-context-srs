import type { Metadata } from "next";
import { LoginForm } from "../../components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in | English Context SRS",
};

const ERROR_MESSAGES: Record<string, string> = {
  expired: "This link has expired. Request a fresh one below.",
  used: "This link was already used. Request a new link to sign in.",
  invalid: "That link is invalid. Request a new one to continue.",
  missing: "Magic link token missing. Request a new link below.",
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LoginPage({ searchParams }: PageProps) {
  const errorKey = typeof searchParams?.error === "string" ? searchParams?.error : null;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] ?? "Unable to sign you in with that link." : null;
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 py-12">
      <div className="space-y-2 text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Magic link sign-in</p>
        <h1 className="text-4xl font-semibold text-foreground">Welcome back</h1>
        <p className="text-base text-muted-foreground">
          Enter your email to receive a secure one-time link. No passwords or third-party providers.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-amber-500/50 bg-amber-950/40 px-4 py-3 text-center text-sm text-amber-100">
          {errorMessage}
        </p>
      ) : null}

      <LoginForm isDev={isDev} />
    </div>
  );
}
