import { ItemType } from "@prisma/client";
import prisma from "./db";
import { generateClozeAndVocab } from "./gemini";
import { normalizeChoices, normalizeLemma, normalizePrompt } from "./normalize";
import {
  ClozeArraySchema,
  NormalizedClozeSchema,
  NormalizedItem,
  NormalizedVocabSchema,
  VocabArraySchema,
} from "./zod";

type BaseGenerationArgs = {
  scenario: string;
  level: string;
  nCloze: number;
  nVocab: number;
};

type PersistArgs = {
  userId: string;
  contextId: string;
  items: NormalizedItem[];
};

export async function generateItems({
  scenario,
  level,
  nCloze,
  nVocab,
}: BaseGenerationArgs): Promise<NormalizedItem[]> {
  if (shouldMockGeneration()) {
    return buildMockItems({ scenario, level, nCloze, nVocab });
  }

  const { cloze, vocab } = await generateClozeAndVocab({
    context: scenario,
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

  return [...clozeItems, ...vocabItems];
}

export async function persistGeneratedItems({ userId, contextId, items }: PersistArgs) {
  if (items.length === 0) {
    return { createdCloze: 0, createdVocab: 0, skipped: 0 };
  }

  const inMemoryDedup = new Set<string>();
  const deduped = items.filter((item) => {
    const key = item.lemma ?? `prompt:${item.prompt.toLowerCase()}`;
    if (inMemoryDedup.has(key)) {
      return false;
    }
    inMemoryDedup.add(key);
    return true;
  });

  const lemmas = Array.from(
    new Set(
      deduped
        .map((item) => item.lemma)
        .filter((lemma): lemma is string => Boolean(lemma?.length)),
    ),
  );
  const prompts = Array.from(
    new Set(deduped.map((item) => item.prompt).filter((prompt) => prompt.length > 0)),
  );

  const existingItems =
    lemmas.length === 0 && prompts.length === 0
      ? []
      : await prisma.item.findMany({
          where: {
            userId,
            OR: [
              lemmas.length > 0 ? { lemma: { in: lemmas } } : undefined,
              prompts.length > 0 ? { prompt: { in: prompts } } : undefined,
            ].filter(Boolean) as Array<{ lemma?: { in: string[] }; prompt?: { in: string[] } }>,
          },
          select: { lemma: true, prompt: true },
        });

  const existingLemmaSet = new Set(
    existingItems.map((item) => item.lemma).filter((lemma): lemma is string => Boolean(lemma)),
  );
  const existingPromptSet = new Set(existingItems.map((item) => item.prompt));

  let skipped = items.length - deduped.length;

  const toCreate = deduped.filter((item) => {
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

  if (toCreate.length > 0) {
    await prisma.item.createMany({
      data: toCreate.map((item) => ({
        userId,
        contextId,
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

  const createdCloze = toCreate.filter((item) => item.type === "CLOZE").length;
  const createdVocab = toCreate.filter((item) => item.type === "VOCAB").length;

  return { createdCloze, createdVocab, skipped };
}

export async function generateAndPersistItems({
  scenario,
  level,
  nCloze,
  nVocab,
  userId,
  contextId,
}: BaseGenerationArgs & { userId: string; contextId: string }) {
  const items = await generateItems({ scenario, level, nCloze, nVocab });
  return persistGeneratedItems({ userId, contextId, items });
}

function shouldMockGeneration() {
  if (process.env.MOCK_GEMINI === "1") {
    return true;
  }
  return !process.env.GEMINI_API_KEY;
}

function buildMockItems({
  scenario,
  level,
  nCloze,
  nVocab,
}: BaseGenerationArgs): NormalizedItem[] {
  const safeScenario = (scenario || "daily routine").slice(0, 60);
  const topicSlug = safeScenario
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
  const fallbackTopic = topicSlug || "context";

  const items: NormalizedItem[] = [];

  for (let i = 0; i < nCloze; i++) {
    const keyword = `${fallbackTopic.split("-")[0] ?? "note"}-${i + 1}`;
    const answer = `${keyword}`;
    items.push({
      type: "CLOZE",
      prompt: `(${level}) ${safeScenario} focused sentence ${i + 1} with ____ spot.`,
      choices: [answer, `${answer}-alt`, `${answer}-mix`],
      answer,
      explanation: `Key expression related to ${safeScenario}.`,
      lemma: answer,
    });
  }

  for (let i = 0; i < nVocab; i++) {
    const baseWord = `${fallbackTopic}-term-${i + 1}`;
    items.push({
      type: "VOCAB",
      prompt: baseWord,
      choices: {
        partOfSpeech: "noun",
        frequency: i % 2 === 0 ? "high" : "medium",
        sampleSentence: `Sample sentence using ${baseWord} in the ${safeScenario} setting.`,
      },
      answer: `tr-${baseWord}`,
      explanation: `Remember ${baseWord} for ${safeScenario}.`,
      lemma: baseWord,
    });
  }

  return items;
}
