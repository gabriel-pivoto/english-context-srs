import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../lib/db";
import { requireUser } from "../../../../../lib/auth";
import { RemoveItemsSchema } from "../../../../../lib/zod";

type RouteParams = {
  id: string;
};

export const POST = requireUser(async (request: NextRequest, routeContext: { params: RouteParams }, user) => {
  const contextId = routeContext.params.id;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = RemoveItemsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const exists = await prisma.context.findFirst({
    where: { id: contextId, userId: user.id },
    select: { id: true },
  });

  if (!exists) {
    return NextResponse.json({ error: "Context not found." }, { status: 404 });
  }

  const result = await prisma.item.deleteMany({
    where: {
      userId: user.id,
      contextId,
      id: { in: parsed.data.itemIds },
    },
  });

  return NextResponse.json({ deleted: result.count });
});
