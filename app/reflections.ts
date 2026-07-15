export const reflections = [
  {
    id: "keeps-moving",
    prompt: "When life gets difficult, what usually keeps you moving?",
  },
  {
    id: "quietly-proud",
    prompt: "What is something you’re quietly proud of?",
  },
  {
    id: "meaningful-effort",
    prompt: "What kind of effort feels meaningful to you?",
  },
  {
    id: "understood-without-explaining",
    prompt: "What do you wish people understood about you without having to explain it?",
  },
  {
    id: "better-next-year",
    prompt: "What do you hope becomes a little better over the next year?",
  },
] as const;

export type ReflectionId = (typeof reflections)[number]["id"];

export function isReflectionId(value: string): value is ReflectionId {
  return reflections.some((reflection) => reflection.id === value);
}
