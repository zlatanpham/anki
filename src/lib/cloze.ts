/**
 * Utility functions for handling cloze deletion cards
 */

export interface ClozeCard {
  question: string;
  answer: string;
  context: string;
}

/**
 * Parses cloze deletion text and generates question/answer pairs
 * Example: "The capital of {{c1::France}} is {{c2::Paris}}"
 * Returns multiple cards, one for each cloze deletion
 */
export function parseClozeText(clozeText: string): ClozeCard[] {
  const clozeRegex = /\{\{c(\d+)::([^}]+)\}\}/g;
  const cards: ClozeCard[] = [];
  const matches = [...clozeText.matchAll(clozeRegex)];

  if (matches.length === 0) {
    return [];
  }

  // Group matches by cloze number
  const clozeGroups = new Map<
    number,
    Array<{ match: string; content: string; index: number }>
  >();

  matches.forEach((match) => {
    const clozeNumber = parseInt(match[1] ?? "0");
    const content = match[2] ?? "";

    if (!clozeGroups.has(clozeNumber)) {
      clozeGroups.set(clozeNumber, []);
    }

    clozeGroups.get(clozeNumber)?.push({
      match: match[0] ?? "",
      content,
      index: match.index ?? 0,
    });
  });

  // Generate a card for each cloze group
  clozeGroups.forEach((group, clozeNumber) => {
    // Create question: replace target cloze with [...] and others with their content
    let question = clozeText;
    let answer = "";

    // First pass: collect all answers for this cloze number
    const answers = group.map((item) => item.content);
    answer = answers.join(", ");

    // Second pass: replace cloze deletions in question
    matches.forEach((match) => {
      const matchClozeNumber = parseInt(match[1] ?? "0");
      const content = match[2] ?? "";

      if (matchClozeNumber === clozeNumber) {
        // Replace with blank for the target cloze
        question = question.replace(match[0], "[...]");
      } else {
        // Replace with content for other clozes
        question = question.replace(match[0] ?? "", content);
      }
    });

    cards.push({
      question: question.trim(),
      answer: answer.trim(),
      context: clozeText,
    });
  });

  return cards;
}

/**
 * Renders cloze text for display, showing all content
 * Used in card listings and context display
 */
export function renderClozeContext(clozeText: string): string {
  const clozeRegex = /\{\{c\d+::([^}]+)\}\}/g;
  return clozeText.replace(clozeRegex, "$1");
}

/**
 * Validates cloze deletion syntax
 */
export function validateClozeText(clozeText: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const clozeRegex = /\{\{c(\d+)::([^}]+)\}\}/g;
  const matches = [...clozeText.matchAll(clozeRegex)];

  if (matches.length === 0) {
    errors.push("No cloze deletions found. Use {{c1::text}} format.");
    return { isValid: false, errors };
  }

  // Check for empty cloze content
  matches.forEach((match, index) => {
    if (!match[2] || match[2].trim().length === 0) {
      errors.push(`Cloze deletion ${index + 1} has empty content.`);
    }
  });

  // Check for malformed syntax
  const malformedRegex = /\{\{c\d*::[^}]*\}\}/g;
  const allMatches = [...clozeText.matchAll(malformedRegex)];
  if (allMatches.length !== matches.length) {
    errors.push(
      "Some cloze deletions have malformed syntax. Use {{c1::text}} format.",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generates a preview of how cloze cards will appear
 */
export function previewClozeCards(
  clozeText: string,
): Array<{ cardNumber: number; question: string; answer: string }> {
  const cards = parseClozeText(clozeText);
  return cards.map((card, index) => ({
    cardNumber: index + 1,
    question: card.question,
    answer: card.answer,
  }));
}
