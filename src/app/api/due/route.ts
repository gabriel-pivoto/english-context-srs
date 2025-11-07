import { ItemType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { requireUser } from "../../../lib/auth";
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

export const GET = requireUser(async (request: NextRequest, _ctx, user) => {
  const contextId = request.nextUrl.searchParams.get("contextId") ?? undefined;

  const item = await prisma.item.findFirst({
    where: {
      userId: user.id,
      ...(contextId ? { contextId } : {}),
      due: {
        lte: new Date(),
      },
    },
    orderBy: {
      due: "asc",
    },
    include: {
      context: true,
    },
  });

  if (!item) {
    return new Response(null, { status: 204 });
  }

  const responsePayload: StudyItem = {
    id: item.id,
    contextId: item.contextId,
    contextTitle: item.context.title,
    type: item.type,
    prompt: item.prompt,
    choices: parseChoices(item.type, item.choices),
    answer: item.answer,
    explanation: item.explanation,
    lemma: item.lemma,
    ease: item.ease,
    interval: item.interval,
    due: item.due.toISOString(),
  };

  return NextResponse.json(responsePayload);
});
