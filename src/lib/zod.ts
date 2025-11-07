import { z } from "zod";

export const LevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1"]);

export const CreateContextSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(10).max(600),
  level: LevelSchema,
  nCloze: z.number().int().min(0).max(20).default(6),
  nVocab: z.number().int().min(0).max(20).default(6),
});

export const UpdateContextSchema = z
  .object({
    title: z.string().min(3).max(80).optional(),
    notes: z.string().min(0).max(1000).optional(),
    level: LevelSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const GenerateMoreSchema = z
  .object({
    nCloze: z.number().int().min(0).max(20).default(3),
    nVocab: z.number().int().min(0).max(20).default(3),
  })
  .refine((data) => data.nCloze > 0 || data.nVocab > 0, {
    message: "Specify at least one item to generate.",
  });

export const RemoveItemsSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
});

export const ContextListQuerySchema = z.object({
  q: z.string().optional(),
  level: LevelSchema.optional(),
  cursor: z.string().optional(),
  take: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

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
export type ClozeItem = z.infer<typeof ClozeItemSchema>;
export type VocabItem = z.infer<typeof VocabItemSchema>;
export type NormalizedItem = z.infer<typeof NormalizedItemSchema>;
export type CreateContextInput = z.infer<typeof CreateContextSchema>;
export type UpdateContextInput = z.infer<typeof UpdateContextSchema>;
export type GenerateMoreInput = z.infer<typeof GenerateMoreSchema>;
