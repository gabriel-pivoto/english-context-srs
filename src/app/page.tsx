import Link from "next/link";
import { GenerateForm } from "../components/GenerateForm";
import { AnalyticsDashboard } from "../components/AnalyticsDashboard";
import { getUserFromCookies } from "../lib/auth";

export default async function HomePage() {
  const user = await getUserFromCookies();

  return (
    <div className="space-y-16">
      <section className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <p className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
            Local-first · Gemini assisted · Multi-user
          </p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Own your English contexts, one review at a time.
          </h1>
          <p className="text-lg text-slate-200">
            Describe any situation, auto-generate cloze + vocab cards, and keep your statistics offline in Postgres.
            Email magic links replace passwords—no third-party auth.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• CEFR-aware prompts with Gemini</li>
            <li>• Context library in the left sidebar</li>
            <li>• JWT-protected APIs + magic-link login</li>
          </ul>
          {!user ? (
            <Link
              href="/login"
              className="inline-flex w-fit items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-primary"
            >
              Sign in to start
            </Link>
          ) : null}
        </div>
        <GenerateForm />
      </section>

      <section id="analytics" className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Your progress</h2>
          <p className="text-sm text-slate-400">
            Scroll to load charts for accuracy, lapses, and daily reviews.
          </p>
        </div>
        <AnalyticsDashboard enabled={Boolean(user)} />
      </section>
    </div>
  );
}
