export type Grade = 0 | 3 | 4 | 5;

export function updateSchedule(
  ease: number,
  interval: number,
  grade: Grade,
): { ease: number; interval: number; nextDue: Date } {
  const q = grade === 0 ? 0 : grade;
  const newEase = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  let newInterval = interval;

  if (grade === 0) newInterval = 1;
  else if (interval === 0) newInterval = 1;
  else if (interval === 1) newInterval = 3;
  else newInterval = Math.round(interval * newEase);

  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + newInterval);
  return { ease: newEase, interval: newInterval, nextDue };
}
