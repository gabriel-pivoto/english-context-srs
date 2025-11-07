import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { ClozeArraySchema, VocabArraySchema, type ClozeItem, type VocabItem } from "./zod";

const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-1.5-flash-latest";

const CLOZE_SYSTEM_PROMPT = ({
  context,
  level,
  n,
}: {
  context: string;
  level: string;
  n: number;
}) => `You are an ESL content generator for Brazilian Portuguese speakers (pt-BR). CEFR level: ${level}. 
User context: ${context}.
Task: Create ${n} natural English sentences for this context.
For each, output JSON with:
  - sentence_with_blank (replace ONE word by "____")
  - options: 3 strings (include the correct word + 2 plausible distractors of same part of speech)
  - correct: the correct word
  - brief_explanation: <= 15 words in English
Return a strict JSON array only. Do not include Markdown, code fences, comments, or explanations. Avoid profanity. Respond with raw JSON (array).`;

const VOCAB_SYSTEM_PROMPT = ({
  context,
  level,
  n,
}: {
  context: string;
  level: string;
  n: number;
}) => `You help pt-BR learners of English.
Input: context=${context}, level=${level}, n=${n}
Task: Output ${n} vocabulary items relevant to the context.
Each item JSON:
  - word
  - part_of_speech
  - frequency: "high"|"medium"|"low"
  - translation_pt: one concise pt-BR translation
  - sample_sentence: simple English sentence with the word
Return a strict JSON array only. Do not include Markdown, code fences, comments, or explanations. Respond with raw JSON (array).`;

let cachedClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!cachedClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    cachedClient = new GoogleGenerativeAI(apiKey);
  }
  return cachedClient;
}

type RetryOptions<T> = {
  context: string;
  level: string;
  n: number;
  systemPromptBuilder: (args: { context: string; level: string; n: number }) => string;
  schema: z.ZodType<T>;
};

async function requestJsonArray<T>({
  context,
  level,
  n,
  systemPromptBuilder,
  schema,
}: RetryOptions<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    const systemInstruction =
      systemPromptBuilder({ context, level, n }) +
      (attempt === 0 ? "" : "\nReturn VALID JSON only.");
    const model = getClient().getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction,
    });

    let result;
    try {
      result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: "Generate the requested content now." }],
          },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes("404")
          ? `Model "${MODEL_NAME}" is not available. Update GEMINI_MODEL or check your Google AI Studio project.`
          : error instanceof Error
            ? error.message
            : "Unknown error while calling Gemini.";
      throw new Error(message);
    }

    const text = result.response?.text();
    if (!text) {
      lastError = new Error("Model returned an empty response.");
      continue;
    }

    try {
      const parsed = JSON.parse(extractJsonPayload(text));
      return schema.parse(parsed);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Model returned invalid JSON; retried once. Last error: ${lastError instanceof Error ? lastError.message : "Unknown error"}`,
  );
}

export async function generateClozeAndVocab({
  context,
  level,
  nCloze,
  nVocab,
}: {
  context: string;
  level: string;
  nCloze: number;
  nVocab: number;
}): Promise<{ cloze: ClozeItem[]; vocab: VocabItem[] }> {
  const [cloze, vocab] = await Promise.all([
    requestJsonArray({
      context,
      level,
      n: nCloze,
      schema: ClozeArraySchema,
      systemPromptBuilder: CLOZE_SYSTEM_PROMPT,
    }),
    requestJsonArray({
      context,
      level,
      n: nVocab,
      schema: VocabArraySchema,
      systemPromptBuilder: VOCAB_SYSTEM_PROMPT,
    }),
  ]);

  return { cloze, vocab };
}

function extractJsonPayload(raw: string): string {
  let sanitized = raw.trim();

  // Remove Markdown code fences if the model returned ```json ... ```
  if (sanitized.startsWith("```")) {
    sanitized = sanitized.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
    sanitized = sanitized.replace(/```$/i, "").trim();
  }

  // Remove any occurrences of ```json ... ``` inside the response.
  sanitized = sanitized.replace(/```json\s*([\s\S]*?)```/gi, "$1").trim();

  // If there is leading commentary, attempt to slice from first JSON array/object.
  const firstJsonStart = sanitized.indexOf("[") !== -1 ? sanitized.indexOf("[") : sanitized.indexOf("{");
  if (firstJsonStart > 0) {
    sanitized = sanitized.slice(firstJsonStart);
  }

  const lastArrayEnd = sanitized.lastIndexOf("]");
  const lastObjectEnd = sanitized.lastIndexOf("}");
  const lastJsonEnd = Math.max(lastArrayEnd, lastObjectEnd);
  if (lastJsonEnd !== -1 && lastJsonEnd < sanitized.length - 1) {
    sanitized = sanitized.slice(0, lastJsonEnd + 1);
  }

  return sanitized;
}
