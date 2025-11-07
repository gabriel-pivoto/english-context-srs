export type VocabMetadata = {
  partOfSpeech: string;
  frequency: "high" | "medium" | "low";
  sampleSentence: string;
};

export type StudyItem = {
  id: string;
  contextId: string;
  contextTitle: string;
  type: "CLOZE" | "VOCAB";
  prompt: string;
  choices: string[] | VocabMetadata | null;
  answer: string;
  explanation: string | null;
  lemma?: string | null;
  ease: number;
  interval: number;
  due: string;
};

export type SidebarContext = {
  id: string;
  title: string;
  level: string;
  dueCount: number;
};

export type ContextSummary = SidebarContext & {
  totalItems: number;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContextItemRow = {
  id: string;
  type: "CLOZE" | "VOCAB";
  prompt: string;
  answer: string;
  due: string;
  ease: number;
  interval: number;
  lemma: string | null;
};

export type ContextDetail = {
  id: string;
  title: string;
  level: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  dueCount: number;
  items: ContextItemRow[];
};

export type AnalyticsBucket = {
  bucket: string;
  count: number;
};

export type DailyReviewPoint = {
  date: string;
  count: number;
  accuracy: number;
};

export type AnalyticsOverview = {
  easeBuckets: AnalyticsBucket[];
  intervalBuckets: AnalyticsBucket[];
  dailyReviews: DailyReviewPoint[];
  overallAccuracy: number;
  lapses: number;
};
