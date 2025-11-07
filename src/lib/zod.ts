import { z } from "zod";

export const LevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1"]);

export const GenerateRequestSchema = z
  .object({
    context: z.string().min(3, "Context must be at least 3 characters."),
    level: LevelSchema,
    nCloze: z.number().int().positive().max(20).optional(),
    nVocab: z.number().int().positive().max(20).optional(),
  })
  .transform((data) => ({
    ...data,
    nCloze: data.nCloze ?? 8,
    nVocab: data.nVocab ?? 8,
  }));

export const ClozeItemSchema = z.object({
  sentence_with_blank: z.string().min(1),
  options: z.array(z.string().min(1)).length(3),
  correct: z.string().min(1),
  brief_explanation: z.string().min(1).max(120),
});

export const VocabItemSchema = z.object({
  word: z.string().min(1),
  part_of_speech: z.string().min(1),
  frequency: z.enum(["high", "medium", "low"]),
  translation_pt: z.string().min(1),
  sample_sentence: z.string().min(1),
});

export const ClozeArraySchema = z.array(ClozeItemSchema).min(1);
export const VocabArraySchema = z.array(VocabItemSchema).min(1);

const BaseNormalizedSchema = z.object({
  prompt: z.string(),
  answer: z.string(),
  explanation: z.string().nullable(),
  lemma: z.string().nullable(),
});

export const NormalizedClozeSchema = BaseNormalizedSchema.extend({
  type: z.literal("CLOZE"),
  choices: z.array(z.string()).length(3),
});

export const VocabMetadataSchema = z.object({
  partOfSpeech: z.string().min(1),
  frequency: z.enum(["high", "medium", "low"]),
  sampleSentence: z.string().min(1),
});

export const NormalizedVocabSchema = BaseNormalizedSchema.extend({
  type: z.literal("VOCAB"),
  choices: VocabMetadataSchema,
});

export const NormalizedItemSchema = z.discriminatedUnion("type", [
  NormalizedClozeSchema,
  NormalizedVocabSchema,
]);

export const ReviewRequestSchema = z.object({
  itemId: z.string().min(1),
  grade: z.union([z.literal(0), z.literal(3), z.literal(4), z.literal(5)]),
});

export type Level = z.infer<typeof LevelSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type ClozeItem = z.infer<typeof ClozeItemSchema>;
export type VocabItem = z.infer<typeof VocabItemSchema>;
export type NormalizedItem = z.infer<typeof NormalizedItemSchema>;
