export interface PricingModel {
  provider: 'gemini' | 'openai' | 'anthropic';
  model: string;
  inputPricePer1k: number;
  outputPricePer1k: number;
  currency: string;
  effectiveDate: Date;
}

// Gemini pricing as of January 2024
// https://ai.google.dev/pricing
export const AI_PRICING_MODELS: Record<string, PricingModel> = {
  'gemini-1.5-flash': {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    inputPricePer1k: 0.00025,  // $0.25 per 1M input tokens
    outputPricePer1k: 0.00125, // $1.25 per 1M output tokens
    currency: 'USD',
    effectiveDate: new Date('2024-01-01')
  },
  'gemini-1.5-flash-latest': {
    provider: 'gemini',
    model: 'gemini-1.5-flash-latest',
    inputPricePer1k: 0.00025,  // $0.25 per 1M input tokens
    outputPricePer1k: 0.00125, // $1.25 per 1M output tokens
    currency: 'USD',
    effectiveDate: new Date('2024-01-01')
  },
  'gemini-1.5-pro': {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    inputPricePer1k: 0.00125,  // $1.25 per 1M input tokens
    outputPricePer1k: 0.00500, // $5.00 per 1M output tokens
    currency: 'USD',
    effectiveDate: new Date('2024-01-01')
  }
};

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): { inputCost: number; outputCost: number; totalCost: number; currency: string } {
  const pricing = AI_PRICING_MODELS[model] ?? AI_PRICING_MODELS['gemini-1.5-flash']!;
  
  // Convert to cost (price is per 1k tokens)
  const inputCost = (inputTokens / 1000) * pricing.inputPricePer1k;
  const outputCost = (outputTokens / 1000) * pricing.outputPricePer1k;
  const totalCost = inputCost + outputCost;
  
  return {
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
    currency: pricing.currency
  };
}

export function getPricingModel(model: string): PricingModel {
  return AI_PRICING_MODELS[model] ?? AI_PRICING_MODELS['gemini-1.5-flash']!;
}