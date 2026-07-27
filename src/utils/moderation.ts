export type FastModerationDecision =
  | { outcome: "blocked"; reason: string }
  | { outcome: "pending" };

const ABUSIVE_PROFANITY_PATTERN =
  /\b(f+u+c+k+(?:ing|er|ed)?|f+ck(?:ing|er|ed)?|shit+|bitch+|cunt+|motherf+u+c+k+(?:er|ing)?|asshole+)\b/i;
const CLEAR_VULGARITY_PATTERN =
  /\b(f+u+c+k+(?:ing|er|ed)?|f+ck(?:ing|er|ed)?|motherf+u+c+k+(?:er|ing)?|cunt+)\b/i;
const DIRECTED_ATTACK_PATTERN =
  /\b(u|you|ur|your|idiot|moron|stupid|dumb|loser)\b/i;
const DIRECTED_HARASSMENT_PATTERN =
  /\b(i\s+hate\s+you|(?:u|you|you're|youre|you\s+are|ur)\s+(?:useless|worthless|trash|garbage)|kys|kill\s+yourself)\b/i;

export function classifyFastChatModeration(content: string): FastModerationDecision {
  const trimmed = content.trim();

  if (DIRECTED_HARASSMENT_PATTERN.test(trimmed)) {
    return {
      outcome: "blocked",
      reason: "Targets another user with harassment.",
    };
  }

  if (
    ABUSIVE_PROFANITY_PATTERN.test(trimmed) &&
    DIRECTED_ATTACK_PATTERN.test(trimmed)
  ) {
    return {
      outcome: "blocked",
      reason: "Targets another user with abusive profanity.",
    };
  }

  if (CLEAR_VULGARITY_PATTERN.test(trimmed)) {
    return {
      outcome: "blocked",
      reason: "Contains clearly vulgar language.",
    };
  }

  return { outcome: "pending" };
}
