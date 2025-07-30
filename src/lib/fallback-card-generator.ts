import { type GeneratedCard } from "@/server/services/ai";

/**
 * Fallback card generator for when AI service is unavailable
 * Creates basic cards from text using simple rules
 */
export function generateBasicCards(text: string): GeneratedCard[] {
  const cards: GeneratedCard[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Extract key patterns
  const definitions = text.match(/(.+?)(?:\s+is\s+|\s+are\s+|:\s+)(.+?)(?=[.!?])/gi) || [];
  const lists = text.match(/(?:(?:\d+\.|[-•])\s*.+?)(?=\n|$)/gm) || [];
  
  // Create cards from definitions
  definitions.forEach((def) => {
    const parts = def.split(/\s+(?:is|are|:)\s+/i);
    if (parts.length === 2) {
      cards.push({
        type: "BASIC",
        front: `What is ${parts[0].trim()}?`,
        back: parts[1].trim(),
        tags: ["definition"],
      });
    }
  });
  
  // Create cards from lists
  if (lists.length > 2) {
    const listText = lists.join('\n');
    const intro = sentences.find(s => lists.some(l => s.includes(l.substring(0, 20))));
    
    if (intro) {
      cards.push({
        type: "BASIC",
        front: intro.replace(/[:.]$/, '?'),
        back: listText,
        tags: ["list"],
      });
    }
  }
  
  // Create cloze cards for important sentences
  sentences.slice(0, 5).forEach((sentence) => {
    // Look for numbers, proper nouns, or key terms
    const importantTerms = sentence.match(/\b(?:\d+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
    
    if (importantTerms && importantTerms.length > 0 && importantTerms.length <= 3) {
      let clozeText = sentence;
      importantTerms.forEach((term, index) => {
        clozeText = clozeText.replace(term, `{{c${index + 1}::${term}}}`);
      });
      
      cards.push({
        type: "CLOZE",
        clozeText: clozeText.trim(),
        tags: ["fact"],
      });
    }
  });
  
  // If no cards were generated, create basic cards from first few sentences
  if (cards.length === 0) {
    sentences.slice(0, 3).forEach((sentence, index) => {
      cards.push({
        type: "BASIC",
        front: `Explain this concept:`,
        back: sentence.trim(),
        tags: ["concept"],
      });
    });
  }
  
  return cards;
}