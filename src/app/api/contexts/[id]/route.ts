import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";
import { UpdateContextSchema } from "../../../../lib/zod";

type RouteParams = {
  id: string;
};

function serializeItem(item: {
  id: string;
  type: string;
  prompt: string;
  answer: string;
  due: Date;
  ease: number;
  interval: number;
  lemma: string | null;
}) {
  return {
    id: item.id,
    type: item.type,
    prompt: item.prompt,
    answer: item.answer,
    due: item.due.toISOString(),
    ease: item.ease,
    interval: item.interval,
    lemma: item.lemma,
  };
}

export const GET = requireUser(async (_request: NextRequest, context: { params: RouteParams }, user) => {
  const contextId = context.params.id;

  const data = await prisma.context.findFirst({
    where: { id: contextId, userId: user.id },
    include: {
      items: {
        orderBy: { due: "asc" },
      },
    },
  });

  if (!data) {
    return NextResponse.json({ error: "Context not found." }, { status: 404 });
  }

  const dueCount = await prisma.item.count({
    where: {
      userId: user.id,
      contextId,
      due: { lte: new Date() },
    },
  });

  return NextResponse.json({
    id: data.id,
    title: data.title,
    level: data.level,
    notes: data.notes,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
    dueCount,
    items: data.items.map(serializeItem),
  });
});

export const PATCH = requireUser(async (request: NextRequest, routeContext: { params: RouteParams }, user) => {
  const contextId = routeContext.params.id;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = UpdateContextSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.context.findFirst({
    where: { id: contextId, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Context not found." }, { status: 404 });
  }

  const updated = await prisma.context.update({
    where: { id: contextId },
    data: parsed.data,
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    level: updated.level,
    notes: updated.notes,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export const DELETE = requireUser(async (_request: NextRequest, routeContext: { params: RouteParams }, user) => {
  const contextId = routeContext.params.id;

  const existing = await prisma.context.findFirst({
    where: { id: contextId, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Context not found." }, { status: 404 });
  }

  await prisma.context.delete({ where: { id: contextId } });

  return NextResponse.json({ success: true });
});
