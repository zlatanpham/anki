import type { NextRequest, NextResponse } from 'next/server';
import { NextResponse as NextResponseModule } from 'next/server';
import { ApiKeyService } from '@/server/services/apiKey';
import { defaultRateLimiter, batchRateLimiter } from '@/server/services/rateLimiter';
import type { ApiKey, User } from '@prisma/client';
import { db } from '@/server/db';

export interface AuthenticatedRequest extends NextRequest {
  apiKey?: ApiKey;
  user?: User;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Creates an error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponseModule.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status: statusCode }
  );
}

/**
 * Extracts the API key from the Authorization header
 */
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  const [type, key] = authHeader.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !key) return null;
  
  return key;
}

/**
 * Authentication middleware for API routes
 */
export function withAuth(
  handler: (request: AuthenticatedRequest, params?: unknown) => Promise<NextResponse>
) {
  return async function (request: NextRequest, params?: unknown): Promise<NextResponse> {
    const startTime = Date.now();
    
    try {
      // Extract API key
      const apiKey = extractApiKey(request);
      if (!apiKey) {
        return createErrorResponse(
          'MISSING_API_KEY',
          'API key is required. Include it in the Authorization header as: Bearer YOUR_API_KEY',
          401
        );
      }
      
      // Validate API key
      const validatedApiKey = await ApiKeyService.validateApiKey(apiKey);
      if (!validatedApiKey) {
        return createErrorResponse(
          'INVALID_API_KEY',
          'The provided API key is invalid or has been revoked',
          401
        );
      }
      
      // Get user
      const user = await db.user.findUnique({
        where: { id: validatedApiKey.userId },
      });
      
      if (!user) {
        return createErrorResponse(
          'USER_NOT_FOUND',
          'The user associated with this API key no longer exists',
          401
        );
      }
      
      // Add apiKey and user to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.apiKey = validatedApiKey;
      authenticatedRequest.user = user;
      
      // Call the handler
      const response = await handler(authenticatedRequest, params);
      
      // Log API usage
      const responseTime = Date.now() - startTime;
      await ApiKeyService.logApiUsage(
        validatedApiKey.id,
        request.nextUrl.pathname,
        request.method,
        response.status,
        responseTime,
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
        request.headers.get('user-agent') ?? undefined
      );
      
      return response;
    } catch (error) {
      console.error('API middleware error:', error);
      return createErrorResponse(
        'INTERNAL_ERROR',
        'An internal server error occurred',
        500
      );
    }
  };
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  handler: (request: AuthenticatedRequest, params?: unknown) => Promise<NextResponse>,
  useBatchLimits = false
) {
  return async function (request: AuthenticatedRequest, params?: unknown): Promise<NextResponse> {
    // Get the appropriate rate limiter
    const rateLimiter = useBatchLimits ? batchRateLimiter : defaultRateLimiter;
    
    // Use API key ID as identifier for rate limiting
    const identifier = request.apiKey?.id ?? 'anonymous';
    
    // Check rate limit
    const limitInfo = await rateLimiter.checkLimit(identifier);
    
    // If rate limited, return 429
    if (limitInfo.remaining < 0) {
      return createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please try again later.',
        429,
        {
          limit: limitInfo.limit,
          reset: limitInfo.reset.toISOString(),
        }
      );
    }
    
    // Add rate limit headers to response
    const response = await handler(request, params);
    
    response.headers.set('X-RateLimit-Limit', limitInfo.limit.toString());
    response.headers.set('X-RateLimit-Remaining', limitInfo.remaining.toString());
    response.headers.set('X-RateLimit-Reset', limitInfo.reset.toISOString());
    
    return response;
  };
}

/**
 * Combined auth and rate limit middleware
 */
export function withAuthAndRateLimit(
  handler: (request: AuthenticatedRequest, params?: unknown) => Promise<NextResponse>,
  useBatchLimits = false
) {
  return withAuth(withRateLimit(handler, useBatchLimits));
}