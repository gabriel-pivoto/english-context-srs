import { GenerateForm } from "../components/GenerateForm";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-12">
      <section className="space-y-4">
        <p className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
          Local-first · Single learner · Gemini assisted
        </p>
        <h1 className="text-4xl font-bold sm:text-5xl">Contextual English SRS</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Describe today&apos;s situation, choose your CEFR level, and instantly create a
          study batch. Everything lives in your local Postgres database—no accounts, no
          cloud storage.
        </p>
      </section>
      <section className="max-w-3xl">
        <GenerateForm />
      </section>
    </div>
  );
}
