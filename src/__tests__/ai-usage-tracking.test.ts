import { describe, it, expect } from '@jest/globals';
import { extractUsageMetrics } from '@/lib/ai-usage-tracker';
import { AI_PRICING_MODELS, calculateCost } from '@/lib/ai-pricing';

describe('AI Usage Tracking', () => {
  describe('extractUsageMetrics', () => {
    it('should extract usage from Gemini response metadata', () => {
      const response = {
        text: 'Test response',
        model: 'gemini-1.5-flash',
        experimental_providerMetadata: {
          google: {
            usage: {
              inputTokens: 150,
              outputTokens: 250,
              totalTokens: 400,
              cachedContentTokens: 50
            }
          }
        }
      };

      const metrics = extractUsageMetrics(response, 'gemini-1.5-flash', 100);

      expect(metrics.inputTokens).toBe(150);
      expect(metrics.outputTokens).toBe(250);
      expect(metrics.totalTokens).toBe(400);
      expect(metrics.cached).toBe(true);
      expect(metrics.latencyMs).toBe(100);
    });

    it('should fallback to standard usage object', () => {
      const response = {
        text: 'Test response',
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300
        }
      };

      const metrics = extractUsageMetrics(response, 'gemini-1.5-flash', 50);

      expect(metrics.inputTokens).toBe(100);
      expect(metrics.outputTokens).toBe(200);
      expect(metrics.totalTokens).toBe(300);
      expect(metrics.cached).toBe(false);
    });

    it('should handle missing usage data', () => {
      const response = {
        text: 'Test response'
      };

      const metrics = extractUsageMetrics(response, 'gemini-1.5-flash', 75);

      expect(metrics.inputTokens).toBe(0);
      expect(metrics.outputTokens).toBe(0);
      expect(metrics.totalTokens).toBe(0);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly for Gemini 1.5 Flash', () => {
      const inputTokens = 1000;
      const outputTokens = 2000;
      
      const cost = calculateCost(inputTokens, outputTokens, 'gemini-1.5-flash');

      expect(cost.inputCost).toBe(0.00025); // $0.25 per 1M tokens
      expect(cost.outputCost).toBe(0.0025);  // $1.25 per 1M tokens
      expect(cost.totalCost).toBe(0.00275);
      expect(cost.currency).toBe('USD');
    });

    it('should calculate cost for large token counts', () => {
      const inputTokens = 1000000;  // 1M tokens
      const outputTokens = 1000000; // 1M tokens
      
      const cost = calculateCost(inputTokens, outputTokens, 'gemini-1.5-flash');

      expect(cost.inputCost).toBe(0.25);
      expect(cost.outputCost).toBe(1.25);
      expect(cost.totalCost).toBe(1.5);
    });

    it('should handle unknown models with default pricing', () => {
      const cost = calculateCost(100, 200, 'unknown-model');

      // Should use default gemini-1.5-flash pricing
      expect(cost.inputCost).toBe(0.000025);
      expect(cost.outputCost).toBe(0.00025);
      expect(cost.totalCost).toBe(0.000275);
    });
  });

  describe('AI Pricing Models', () => {
    it('should have correct pricing for all models', () => {
      const flashPricing = AI_PRICING_MODELS['gemini-1.5-flash'];
      expect(flashPricing?.inputPricePer1k).toBe(0.00025);
      expect(flashPricing?.outputPricePer1k).toBe(0.00125);

      const proPricing = AI_PRICING_MODELS['gemini-1.5-pro'];
      expect(proPricing?.inputPricePer1k).toBe(0.00125);
      expect(proPricing?.outputPricePer1k).toBe(0.00500);
    });
  });
});