import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { requireUser } from "../../../lib/auth";
import { generateAndPersistItems } from "../../../lib/item-generation";
import { ContextListQuerySchema, CreateContextSchema } from "../../../lib/zod";

function serializeContext(context: {
  id: string;
  title: string;
  level: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: context.id,
    title: context.title,
    level: context.level,
    notes: context.notes,
    createdAt: context.createdAt.toISOString(),
    updatedAt: context.updatedAt.toISOString(),
  };
}

export const GET = requireUser(async (request: NextRequest, _ctx, user) => {
  const url = new URL(request.url);
  const queryParams = {
    q: url.searchParams.get("q") ?? undefined,
    level: url.searchParams.get("level") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
  };

  const parsed = ContextListQuerySchema.safeParse(queryParams);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { q, level, cursor } = parsed.data;
  const take = parsed.data.take ?? 20;

  const where = {
    userId: user.id,
    ...(q
      ? {
          title: {
            contains: q,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(level ? { level } : {}),
  };

  const contexts = await prisma.context.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = contexts.length > take;
  const slice = hasMore ? contexts.slice(0, take) : contexts;
  const nextCursor = hasMore ? contexts[contexts.length - 1]?.id ?? null : null;

  const contextIds = slice.map((ctx) => ctx.id);
  const now = new Date();

  const [dueCountsRaw, totalCountsRaw, overallDueCount, latestReviews] = await Promise.all([
    contextIds.length === 0
      ? Promise.resolve([])
      : prisma.item.groupBy({
          by: ["contextId"],
          where: {
            userId: user.id,
            contextId: { in: contextIds },
            due: { lte: now },
          },
          _count: { _all: true },
        }),
    contextIds.length === 0
      ? Promise.resolve([])
      : prisma.item.groupBy({
          by: ["contextId"],
          where: { userId: user.id, contextId: { in: contextIds } },
          _count: { _all: true },
        }),
    prisma.item.count({
      where: {
        userId: user.id,
        due: { lte: now },
      },
    }),
    contextIds.length === 0
      ? Promise.resolve([])
      : prisma.review.findMany({
          where: { userId: user.id, item: { contextId: { in: contextIds } } },
          select: {
            createdAt: true,
            item: {
              select: { contextId: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
  ]);

  const dueMap = new Map<string, number>();
  for (const entry of dueCountsRaw) {
    dueMap.set(entry.contextId, entry._count._all);
  }

  const totalMap = new Map<string, number>();
  for (const entry of totalCountsRaw) {
    totalMap.set(entry.contextId, entry._count._all);
  }

  const lastActivityMap = new Map<string, string>();
  for (const review of latestReviews) {
    const contextId = review.item.contextId;
    if (!lastActivityMap.has(contextId)) {
      lastActivityMap.set(contextId, review.createdAt.toISOString());
    }
  }

  const payload = slice.map((context) => ({
    ...serializeContext(context),
    dueCount: dueMap.get(context.id) ?? 0,
    totalItems: totalMap.get(context.id) ?? 0,
    lastActivity: lastActivityMap.get(context.id) ?? context.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    contexts: payload,
    nextCursor,
    overallDueCount,
  });
});

export const POST = requireUser(async (request: NextRequest, _ctx, user) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = CreateContextSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, level, nCloze, nVocab } = parsed.data;

  const context = await prisma.context.create({
    data: {
      userId: user.id,
      title,
      level,
      notes: description,
    },
  });

  try {
    const stats =
      nCloze === 0 && nVocab === 0
        ? { createdCloze: 0, createdVocab: 0, skipped: 0 }
        : await generateAndPersistItems({
            scenario: description,
            level,
            nCloze,
            nVocab,
            userId: user.id,
            contextId: context.id,
          });

    return NextResponse.json(
      {
        context: serializeContext(context),
        stats,
      },
      { status: 201 },
    );
  } catch (error) {
    await prisma.context.delete({ where: { id: context.id } });
    const message = error instanceof Error ? error.message : "Failed to create context.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
