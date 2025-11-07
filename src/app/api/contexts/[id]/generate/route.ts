import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../lib/db";
import { requireUser } from "../../../../../lib/auth";
import { generateAndPersistItems } from "../../../../../lib/item-generation";
import { GenerateMoreSchema } from "../../../../../lib/zod";

type RouteParams = {
  id: string;
};

export const POST = requireUser(async (request: NextRequest, routeContext: { params: RouteParams }, user) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = GenerateMoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const context = await prisma.context.findFirst({
    where: { id: routeContext.params.id, userId: user.id },
  });

  if (!context) {
    return NextResponse.json({ error: "Context not found." }, { status: 404 });
  }

  const scenario = context.notes && context.notes.length > 0 ? context.notes : context.title;

  const stats = await generateAndPersistItems({
    scenario,
    level: context.level,
    nCloze: parsed.data.nCloze,
    nVocab: parsed.data.nVocab,
    userId: user.id,
    contextId: context.id,
  });

  return NextResponse.json({ stats });
});
