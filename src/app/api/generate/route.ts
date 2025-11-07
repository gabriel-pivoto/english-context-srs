import { NextResponse } from "next/server";
import { ItemType } from "@prisma/client";
import prisma from "../../../lib/db";
import { generateClozeAndVocab } from "../../../lib/gemini";
import { normalizeChoices, normalizeLemma, normalizePrompt } from "../../../lib/normalize";
import {
  ClozeArraySchema,
  GenerateRequestSchema,
  NormalizedClozeSchema,
  NormalizedItem,
  NormalizedVocabSchema,
  VocabArraySchema,
} from "../../../lib/zod";

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  if (!raw) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { context, level, nCloze, nVocab } = parsed.data;

  try {
    const { cloze, vocab } = await generateClozeAndVocab({
      context,
      level,
      nCloze,
      nVocab,
    });

    const clozeItems = ClozeArraySchema.parse(cloze).map((item) =>
      NormalizedClozeSchema.parse({
        type: "CLOZE",
        prompt: normalizePrompt(item.sentence_with_blank),
        choices: normalizeChoices(item.options) ?? item.options,
        answer: item.correct.trim(),
        explanation: item.brief_explanation.trim(),
        lemma: normalizeLemma(item.correct),
      }),
    );

    const vocabItems = VocabArraySchema.parse(vocab).map((item) =>
      NormalizedVocabSchema.parse({
        type: "VOCAB",
        prompt: normalizePrompt(item.word),
        choices: {
          partOfSpeech: item.part_of_speech.trim(),
          frequency: item.frequency,
          sampleSentence: item.sample_sentence.trim(),
        },
        answer: item.translation_pt.trim(),
        explanation: item.sample_sentence.trim(),
        lemma: normalizeLemma(item.word),
      }),
    );

    const normalizedItems: NormalizedItem[] = [...clozeItems, ...vocabItems];
    const inMemoryDuplicates = new Set<string>();
    const dedupedItems = normalizedItems.filter((item) => {
      const key = item.lemma ?? `prompt:${item.prompt.toLowerCase()}`;
      if (inMemoryDuplicates.has(key)) {
        return false;
      }
      inMemoryDuplicates.add(key);
      return true;
    });

    const lemmaCandidates = Array.from(
      new Set(
        dedupedItems
          .map((item) => item.lemma)
          .filter((lemma): lemma is string => Boolean(lemma?.length)),
      ),
    );

    const promptCandidates = Array.from(
      new Set(dedupedItems.map((item) => item.prompt).filter((prompt) => prompt.length > 0)),
    );

    const existingItems: Array<{ lemma: string | null; prompt: string }> =
      lemmaCandidates.length > 0 || promptCandidates.length > 0
        ? await prisma.item.findMany({
            where: {
              OR: [
                lemmaCandidates.length > 0 ? { lemma: { in: lemmaCandidates } } : undefined,
                promptCandidates.length > 0 ? { prompt: { in: promptCandidates } } : undefined,
              ].filter(Boolean) as { lemma?: { in: string[] }; prompt?: { in: string[] } }[],
            },
            select: { lemma: true, prompt: true },
          })
        : [];

    const existingLemmaSet = new Set(
      existingItems.map((item) => item.lemma).filter((lemma): lemma is string => Boolean(lemma)),
    );
    const existingPromptSet = new Set(existingItems.map((item) => item.prompt));

    let skipped = normalizedItems.length - dedupedItems.length;

    const itemsToCreate = dedupedItems.filter((item) => {
      if (item.lemma && existingLemmaSet.has(item.lemma)) {
        skipped += 1;
        return false;
      }
      if (existingPromptSet.has(item.prompt)) {
        skipped += 1;
        return false;
      }
      return true;
    });

    if (itemsToCreate.length > 0) {
      await prisma.item.createMany({
        data: itemsToCreate.map((item) => ({
          type: item.type as ItemType,
          prompt: item.prompt,
          choices: item.choices,
          answer: item.answer,
          explanation: item.explanation,
          lemma: item.lemma,
          due: new Date(),
        })),
      });
    }

    const createdCloze = itemsToCreate.filter((item) => item.type === "CLOZE").length;
    const createdVocab = itemsToCreate.filter((item) => item.type === "VOCAB").length;

    return NextResponse.json({
      createdCloze,
      createdVocab,
      skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
