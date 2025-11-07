const punctuationRegex = /[^\p{L}\p{N}\s-]/gu;
const whitespaceRegex = /\s+/g;

export function normalizeLemma(input: string | null | undefined): string | null {
  if (!input) return null;
  return input
    .toLowerCase()
    .replace(punctuationRegex, " ")
    .replace(whitespaceRegex, " ")
    .trim();
}

export function normalizePrompt(input: string): string {
  return input.replace(whitespaceRegex, " ").trim();
}

export function normalizeChoices(options: string[] | null | undefined): string[] | null {
  if (!options) return null;
  return options.map((option) => option.trim());
}
