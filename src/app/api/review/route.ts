import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { requireUser } from "../../../lib/auth";
import { updateSchedule } from "../../../lib/sm2";
import { ReviewRequestSchema } from "../../../lib/zod";

export const POST = requireUser(async (request: NextRequest, _ctx, user) => {
  const raw = await request.json().catch(() => null);
  if (!raw) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = ReviewRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { itemId, grade } = parsed.data;

  const item = await prisma.item.findFirst({
    where: { id: itemId, userId: user.id },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const { ease, interval, nextDue } = updateSchedule(item.ease, item.interval, grade);

  await prisma.$transaction([
    prisma.item.update({
      where: { id: itemId },
      data: {
        ease,
        interval,
        due: nextDue,
      },
    }),
    prisma.review.create({
      data: {
        itemId,
        userId: user.id,
        grade,
      },
    }),
  ]);

  return NextResponse.json({
    nextDue: nextDue.toISOString(),
    ease,
    interval,
  });
});
