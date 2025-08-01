import { describe, it, expect } from '@jest/globals';

// Direct copy of the pricing logic to test without dependencies
interface PricingModel {
  provider: 'gemini' | 'openai' | 'anthropic';
  model: string;
  inputPricePer1k: number;
  outputPricePer1k: number;
  currency: string;
  effectiveDate: Date;
}

const TEST_PRICING_MODELS: Record<string, PricingModel> = {
  'gemini-1.5-flash': {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    inputPricePer1k: 0.00025,
    outputPricePer1k: 0.00125,
    currency: 'USD',
    effectiveDate: new Date('2024-01-01')
  },
  'gemini-1.5-pro': {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    inputPricePer1k: 0.00125,
    outputPricePer1k: 0.00500,
    currency: 'USD',
    effectiveDate: new Date('2024-01-01')
  }
};

function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): { inputCost: number; outputCost: number; totalCost: number; currency: string } {
  const pricing = TEST_PRICING_MODELS[model] || TEST_PRICING_MODELS['gemini-1.5-flash']!;
  
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

describe('AI Pricing Calculations', () => {
  it('should calculate cost correctly for Gemini 1.5 Flash', () => {
    const cost = calculateCost(1000, 2000, 'gemini-1.5-flash');
    
    expect(cost.inputCost).toBe(0.00025);
    expect(cost.outputCost).toBe(0.0025);
    expect(cost.totalCost).toBe(0.00275);
    expect(cost.currency).toBe('USD');
  });

  it('should calculate cost for Gemini 1.5 Pro', () => {
    const cost = calculateCost(1000, 2000, 'gemini-1.5-pro');
    
    expect(cost.inputCost).toBe(0.00125);
    expect(cost.outputCost).toBe(0.01);
    expect(cost.totalCost).toBe(0.01125);
  });

  it('should handle large token counts (1M tokens)', () => {
    const cost = calculateCost(1000000, 1000000, 'gemini-1.5-flash');
    
    expect(cost.inputCost).toBe(0.25);
    expect(cost.outputCost).toBe(1.25);
    expect(cost.totalCost).toBe(1.5);
  });

  it('should handle small token counts', () => {
    const cost = calculateCost(10, 20, 'gemini-1.5-flash');
    
    expect(cost.inputCost).toBe(0.0000025);
    expect(cost.outputCost).toBe(0.000025);
    expect(cost.totalCost).toBe(0.0000275);
  });

  it('should default to Flash pricing for unknown models', () => {
    const cost = calculateCost(1000, 1000, 'unknown-model');
    
    expect(cost.inputCost).toBe(0.00025);
    expect(cost.outputCost).toBe(0.00125);
    expect(cost.totalCost).toBe(0.0015);
  });
});