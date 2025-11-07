export type VocabMetadata = {
  partOfSpeech: string;
  frequency: "high" | "medium" | "low";
  sampleSentence: string;
};

export type StudyItem = {
  id: string;
  type: "CLOZE" | "VOCAB";
  prompt: string;
  choices: string[] | VocabMetadata | null;
  answer: string;
  explanation: string | null;
  lemma?: string | null;
};
