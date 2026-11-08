/** Each password rule: a test the password must pass, and what to say when it doesn't. */
const RULES: { passes: (password: string) => boolean; problem: string }[] = [
  { passes: (p) => p.length >= 8, problem: "Паролата трябва да бъде поне 8 символа" },
  { passes: (p) => p.length <= 20, problem: "Паролата трябва да бъде по-малко от 20 символа" },
  { passes: (p) => /[A-Z]/.test(p), problem: "Трябва да съдържа поне една главна буква" },
  { passes: (p) => /[a-z]/.test(p), problem: "Трябва да съдържа поне една малка буква" },
  { passes: (p) => /[0-9]/.test(p), problem: "Трябва да съдържа поне едно число" },
  { passes: (p) => /[!@#$%^&*]/.test(p), problem: "Трябва да съдържа специален символ (!@#$%^&*)" },
];

/** What's wrong with a new password, rule by rule; empty when it may be used. */
export function passwordProblems(password: string): string[] {
  return RULES.filter((rule) => !rule.passes(password)).map((rule) => rule.problem);
}
