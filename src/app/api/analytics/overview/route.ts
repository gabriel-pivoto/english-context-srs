import { NextResponse } from "next/server";
import prisma from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";

const easeBuckets = [
  { label: "<1.5", predicate: (ease: number) => ease < 1.5 },
  { label: "1.5-2.0", predicate: (ease: number) => ease >= 1.5 && ease < 2.0 },
  { label: "2.0-2.5", predicate: (ease: number) => ease >= 2.0 && ease < 2.5 },
  { label: "2.5-3.0", predicate: (ease: number) => ease >= 2.5 && ease < 3.0 },
  { label: ">3.0", predicate: (ease: number) => ease >= 3.0 },
];

const intervalBuckets = [
  { label: "1 day", predicate: (interval: number) => interval <= 1 },
  { label: "2-3 days", predicate: (interval: number) => interval >= 2 && interval <= 3 },
  { label: "4-7 days", predicate: (interval: number) => interval >= 4 && interval <= 7 },
  { label: "8-14 days", predicate: (interval: number) => interval >= 8 && interval <= 14 },
  { label: "15-30 days", predicate: (interval: number) => interval >= 15 && interval <= 30 },
  { label: ">30 days", predicate: (interval: number) => interval > 30 },
];

export const GET = requireUser(async (_request, _ctx, user) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 29);

  const [items, recentReviews, totalReviews, accurateReviews, lapses] = await Promise.all([
    prisma.item.findMany({
      where: { userId: user.id },
      select: { ease: true, interval: true },
    }),
    prisma.review.findMany({
      where: { userId: user.id, createdAt: { gte: start } },
      select: { grade: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.review.count({ where: { userId: user.id } }),
    prisma.review.count({ where: { userId: user.id, grade: { gte: 4 } } }),
    prisma.review.count({ where: { userId: user.id, grade: 0 } }),
  ]);

  const easeData = easeBuckets.map((bucket) => ({
    bucket: bucket.label,
    count: items.filter((item) => bucket.predicate(item.ease)).length,
  }));

  const intervalData = intervalBuckets.map((bucket) => ({
    bucket: bucket.label,
    count: items.filter((item) => bucket.predicate(item.interval)).length,
  }));

  const dailyMap = new Map<string, { count: number; correct: number }>();
  for (let i = 0; i < 30; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = day.toISOString().slice(5, 10); // MM-DD
    dailyMap.set(key, { count: 0, correct: 0 });
  }

  recentReviews.forEach((review) => {
    const key = review.createdAt.toISOString().slice(5, 10);
    if (!dailyMap.has(key)) {
      dailyMap.set(key, { count: 0, correct: 0 });
    }
    const bucket = dailyMap.get(key);
    if (bucket) {
      bucket.count += 1;
      if (review.grade >= 4) {
        bucket.correct += 1;
      }
    }
  });

  const dailyReviews = Array.from(dailyMap.entries()).map(([date, values]) => ({
    date,
    count: values.count,
    accuracy: values.count === 0 ? 0 : Math.round((values.correct / values.count) * 100),
  }));

  const overallAccuracy = totalReviews === 0 ? 0 : Math.round((accurateReviews / totalReviews) * 100);

  return NextResponse.json({
    easeBuckets: easeData,
    intervalBuckets: intervalData,
    dailyReviews,
    overallAccuracy,
    lapses,
  });
});
