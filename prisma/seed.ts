import { PrismaClient, ItemType } from "@prisma/client";

const prisma = new PrismaClient();

const NOW = new Date();
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

async function main() {
  const demoEmail = "demo@example.com";

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      level: "B1",
      native: "pt-BR",
      target: "en",
    },
    create: {
      userId: user.id,
      level: "B1",
      native: "pt-BR",
      target: "en",
    },
  });

  const travelContext = await prisma.context.upsert({
    where: { id: "seed-context-travel" },
    update: {
      title: "Business trip to Boston",
      level: "B1",
      notes: "Airport scenarios, check-in, small talk with colleagues.",
      userId: user.id,
    },
    create: {
      id: "seed-context-travel",
      userId: user.id,
      title: "Business trip to Boston",
      level: "B1",
      notes: "Airport scenarios, check-in, small talk with colleagues.",
    },
  });

  const demoItems = [
    {
      id: "seed-cloze-1",
      type: ItemType.CLOZE,
      prompt:
        "At the airport counter, the agent asked me to place my suitcase on the ____.",
      choices: ["scale", "bench", "chair"],
      answer: "scale",
      explanation: "Bags are weighed on a scale.",
      lemma: "scale",
      ease: 2.5,
      interval: 0,
      due: daysAgo(0),
    },
    {
      id: "seed-cloze-2",
      type: ItemType.CLOZE,
      prompt: "I showed the officer my passport and boarding ____.",
      choices: ["pass", "card", "letter"],
      answer: "pass",
      explanation: "Boarding pass grants access to the plane.",
      lemma: "boarding pass",
      ease: 2.5,
      interval: 0,
      due: daysAgo(1),
    },
    {
      id: "seed-vocab-1",
      type: ItemType.VOCAB,
      prompt: "check-in",
      choices: {
        partOfSpeech: "noun",
        frequency: "high",
        sampleSentence: "We arrived early to avoid a long check-in line.",
      },
      answer: "fazer check-in",
      explanation: "We arrived early to avoid a long check-in line.",
      lemma: "check-in",
      ease: 2.6,
      interval: 1,
      due: daysAgo(2),
    },
    {
      id: "seed-vocab-2",
      type: ItemType.VOCAB,
      prompt: "layover",
      choices: {
        partOfSpeech: "noun",
        frequency: "medium",
        sampleSentence: "Our layover in Lisbon lasts three hours.",
      },
      answer: "escala",
      explanation: "Our layover in Lisbon lasts three hours.",
      lemma: "layover",
      ease: 2.4,
      interval: 0,
      due: daysAgo(3),
    },
  ];

  for (const item of demoItems) {
    await prisma.item.upsert({
      where: { id: item.id },
      update: {
        type: item.type,
        prompt: item.prompt,
        choices: item.choices,
        answer: item.answer,
        explanation: item.explanation,
        lemma: item.lemma,
        ease: item.ease,
        interval: item.interval,
        due: item.due,
        contextId: travelContext.id,
        userId: user.id,
      },
      create: {
        ...item,
        contextId: travelContext.id,
        userId: user.id,
      },
    });
  }

  await prisma.review.deleteMany({ where: { userId: user.id } });
  await prisma.review.createMany({
    data: [
      {
        itemId: "seed-cloze-1",
        userId: user.id,
        grade: 4,
        createdAt: daysAgo(5),
      },
      {
        itemId: "seed-cloze-2",
        userId: user.id,
        grade: 5,
        createdAt: daysAgo(2),
      },
      {
        itemId: "seed-vocab-1",
        userId: user.id,
        grade: 0,
        createdAt: daysAgo(1),
      },
      {
        itemId: "seed-vocab-2",
        userId: user.id,
        grade: 3,
        createdAt: daysAgo(7),
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
