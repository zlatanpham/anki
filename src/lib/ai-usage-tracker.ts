import { db } from "@/server/db";
import { calculateCost } from "./ai-pricing";
import { Prisma } from "@prisma/client";

export interface AIUsageMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  cost: {
    input: number;
    output: number;
    total: number;
    currency: string;
  };
  latencyMs: number;
  cached?: boolean;
}

export interface AIRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AIResponse {
  text?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  model?: string;
  cached?: boolean;
  // For Vercel AI SDK
  experimental_providerMetadata?: {
    google?: {
      groundingMetadata?: any;
      usage?: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        cachedContentTokens?: number;
      };
    };
  };
}

export function extractUsageMetrics(
  response: AIResponse,
  model: string,
  latencyMs: number,
  promptText?: string
): AIUsageMetrics {
  let inputTokens = 0;
  let outputTokens = 0;
  let cached = false;

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('AI Response metadata:', {
      hasUsage: !!response.usage,
      hasExperimental: !!response.experimental_providerMetadata,
      responseTextLength: response.text?.length || 0
    });
  }

  // Try to extract from Vercel AI SDK experimental metadata first (Gemini)
  if (response.experimental_providerMetadata?.google?.usage) {
    const usage = response.experimental_providerMetadata.google.usage;
    inputTokens = usage.inputTokens || 0;
    outputTokens = usage.outputTokens || 0;
    cached = (usage.cachedContentTokens || 0) > 0;
  } 
  // Fallback to standard usage object
  else if (response.usage) {
    inputTokens = response.usage.promptTokens || 0;
    outputTokens = response.usage.completionTokens || 0;
  }
  // If no usage data available, estimate based on text length
  else {
    // Rough estimation: 1 token ≈ 4 characters
    inputTokens = Math.ceil((promptText?.length || 0) / 4);
    outputTokens = Math.ceil((response.text?.length || 0) / 4);
    if (process.env.NODE_ENV === 'development') {
      console.log('Using token estimation based on text length');
    }
  }

  const totalTokens = inputTokens + outputTokens;
  const cost = calculateCost(inputTokens, outputTokens, model);

  if (process.env.NODE_ENV === 'development') {
    console.log('Extracted metrics:', {
      inputTokens,
      outputTokens,
      totalTokens,
      cost
    });
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    model,
    cost,
    latencyMs,
    cached
  };
}

export async function trackAIUsage(
  request: AIRequest,
  response: AIResponse,
  userId: string,
  organizationId: string | null,
  feature: string,
  startTime: number,
  status: 'success' | 'error' = 'success',
  errorMessage?: string
) {
  const latencyMs = Date.now() - startTime;
  const model = response.model || request.model || 'gemini-1.5-flash';
  const usage = extractUsageMetrics(response, model, latencyMs, request.prompt);

  try {
    // Ensure cost values are valid numbers
    const inputCost = usage.cost?.input ?? 0;
    const outputCost = usage.cost?.output ?? 0;
    const totalCost = usage.cost?.total ?? 0;
    
    // Create usage log entry
    await db.aIUsageLog.create({
      data: {
        user_id: userId,
        organization_id: organizationId,
        feature,
        model: usage.model,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        total_tokens: usage.totalTokens,
        input_cost: new Prisma.Decimal(inputCost),
        output_cost: new Prisma.Decimal(outputCost),
        total_cost: new Prisma.Decimal(totalCost),
        currency: usage.cost?.currency || 'USD',
        latency_ms: usage.latencyMs,
        status,
        error_message: errorMessage,
        metadata: {
          prompt: request.prompt.substring(0, 200), // First 200 chars
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          cached: usage.cached,
          responseLength: response.text?.length || 0
        } as any
      }
    });

    // Update user quota
    await updateUserQuota(userId, usage.totalTokens);

    // Queue analytics update (you can implement this later)
    // await queueAnalyticsUpdate(userId);
  } catch (error) {
    console.error('Failed to track AI usage:', error);
    // Don't throw - we don't want tracking failures to break the main flow
  }
}

async function updateUserQuota(userId: string, tokensUsed: number) {
  try {
    // Get or create user quota
    const quota = await db.aIUserQuota.findUnique({
      where: { user_id: userId }
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (!quota) {
      // Create new quota for user
      await db.aIUserQuota.create({
        data: {
          user_id: userId,
          current_usage: tokensUsed,
          reset_date: new Date(now.getFullYear(), now.getMonth() + 1, 1) // First day of next month
        }
      });
    } else {
      // Check if we need to reset monthly usage
      if (quota.reset_date < now) {
        await db.aIUserQuota.update({
          where: { id: quota.id },
          data: {
            current_usage: tokensUsed,
            reset_date: new Date(now.getFullYear(), now.getMonth() + 1, 1)
          }
        });
      } else {
        // Update current usage
        await db.aIUserQuota.update({
          where: { id: quota.id },
          data: {
            current_usage: {
              increment: tokensUsed
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('Failed to update user quota:', error);
  }
}

// Helper function to check if user has quota remaining
export async function checkUserQuota(userId: string): Promise<{ hasQuota: boolean; remaining: number }> {
  try {
    const quota = await db.aIUserQuota.findUnique({
      where: { user_id: userId }
    });

    if (!quota) {
      return { hasQuota: true, remaining: 1000000 }; // Default limit
    }

    const remaining = quota.monthly_limit - quota.current_usage;
    return {
      hasQuota: remaining > 0,
      remaining: Math.max(0, remaining)
    };
  } catch (error) {
    console.error('Failed to check user quota:', error);
    return { hasQuota: true, remaining: 0 }; // Allow usage on error
  }
}

// Wrapper function for AI calls with tracking
export async function trackedAICall<T extends AIResponse>(
  userId: string,
  organizationId: string | null,
  feature: string,
  aiFunction: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const response = await aiFunction();
    
    // Track usage asynchronously
    void trackAIUsage(
      { prompt: '' }, // You might want to pass the actual request
      response,
      userId,
      organizationId,
      feature,
      startTime,
      'success'
    );
    
    return response;
  } catch (error) {
    // Track error
    void trackAIUsage(
      { prompt: '' },
      {} as AIResponse,
      userId,
      organizationId,
      feature,
      startTime,
      'error',
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    throw error;
  }
}