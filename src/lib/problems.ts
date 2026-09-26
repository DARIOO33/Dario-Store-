// What a customer can pick in "Report a problem" (the labels are in the dictionaries: chat.problemReasons).
export const PROBLEM_REASONS = ["NOT_WORKING", "WRONG_ITEM", "MISSING", "OTHER"] as const;
export type ProblemReason = (typeof PROBLEM_REASONS)[number];

export function isProblemReason(value: string): value is ProblemReason {
  return (PROBLEM_REASONS as readonly string[]).includes(value);
}
