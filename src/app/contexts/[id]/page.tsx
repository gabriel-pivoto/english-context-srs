import { notFound, redirect } from "next/navigation";
import prisma from "../../../lib/db";
import { getUserFromCookies } from "../../../lib/auth";
import type { ContextDetail } from "../../../lib/types";
import { ContextDetailClient } from "../../../components/ContextDetailClient";

type PageProps = {
  params: { id: string };
};

export default async function ContextPage({ params }: PageProps) {
  const user = await getUserFromCookies();
  if (!user) {
    redirect("/login");
  }

  const context = await prisma.context.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      items: {
        orderBy: { due: "asc" },
      },
    },
  });

  if (!context) {
    notFound();
  }

  const dueCount = await prisma.item.count({
    where: {
      userId: user.id,
      contextId: context.id,
      due: { lte: new Date() },
    },
  });

  const detail: ContextDetail = {
    id: context.id,
    title: context.title,
    level: context.level,
    notes: context.notes,
    createdAt: context.createdAt.toISOString(),
    updatedAt: context.updatedAt.toISOString(),
    dueCount,
    items: context.items.map((item) => ({
      id: item.id,
      type: item.type,
      prompt: item.prompt,
      answer: item.answer,
      due: item.due.toISOString(),
      ease: item.ease,
      interval: item.interval,
      lemma: item.lemma,
    })),
  };

  return <ContextDetailClient initialContext={detail} />;
}
