import { ItemType } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "../../../lib/db";
import type { StudyItem, VocabMetadata } from "../../../lib/types";

const isFrequency = (value: unknown): value is VocabMetadata["frequency"] =>
  value === "high" || value === "medium" || value === "low";

const parseChoices = (type: ItemType, raw: unknown): StudyItem["choices"] => {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (type === ItemType.CLOZE && Array.isArray(raw) && raw.every((option) => typeof option === "string")) {
    return raw.map((option) => option.trim());
  }

  if (type === ItemType.VOCAB && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const partOfSpeech = record.partOfSpeech;
    const frequency = record.frequency;
    const sampleSentence = record.sampleSentence;

    if (
      typeof partOfSpeech === "string" &&
      typeof sampleSentence === "string" &&
      isFrequency(frequency)
    ) {
      return {
        partOfSpeech,
        frequency,
        sampleSentence,
      };
    }
  }

  return null;
};

export async function GET() {
  const item = await prisma.item.findFirst({
    where: {
      due: {
        lte: new Date(),
      },
    },
    orderBy: {
      due: "asc",
    },
  });

  if (!item) {
    return new Response(null, { status: 204 });
  }

  const responsePayload: StudyItem = {
    id: item.id,
    type: item.type,
    prompt: item.prompt,
    choices: parseChoices(item.type, item.choices),
    answer: item.answer,
    explanation: item.explanation,
    lemma: item.lemma,
  };

  return NextResponse.json(responsePayload);
}
