import { PrismaClient, ItemType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
    },
  ];

  for (const item of demoItems) {
    // Upsert ensures seeds are idempotent for local dev.
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
        due: new Date(),
      },
      create: {
        ...item,
        due: new Date(),
      },
    });
  }
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
