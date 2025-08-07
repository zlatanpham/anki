import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/server/db';
import type { ApiKey } from '@prisma/client';

const API_KEY_PREFIX = 'ank_';
const API_KEY_LENGTH = 32;
const SALT_ROUNDS = 10;

export interface GenerateApiKeyResult {
  apiKey: ApiKey;
  plainKey: string;
}

export class ApiKeyService {
  /**
   * Generates a new API key for a user
   */
  static async generateApiKey(
    userId: string,
    name: string,
    expiresAt?: Date
  ): Promise<GenerateApiKeyResult> {
    // Generate a cryptographically secure random key
    const randomPart = randomBytes(API_KEY_LENGTH).toString('base64url');
    const plainKey = `${API_KEY_PREFIX}${randomPart}`;
    
    // Hash the key before storing
    const keyHash = await bcrypt.hash(plainKey, SALT_ROUNDS);
    
    // Create the API key record
    const apiKey = await db.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        expiresAt,
      },
    });
    
    return {
      apiKey,
      plainKey,
    };
  }
  
  /**
   * Validates an API key and returns the associated API key record
   */
  static async validateApiKey(plainKey: string): Promise<ApiKey | null> {
    // Extract all active API keys (we'll check the hash)
    const apiKeys = await db.apiKey.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });
    
    // Check each key hash
    for (const apiKey of apiKeys) {
      const isValid = await bcrypt.compare(plainKey, apiKey.keyHash);
      if (isValid) {
        // Update last used timestamp
        await db.apiKey.update({
          where: { id: apiKey.id },
          data: { 
            lastUsedAt: new Date(),
            usageCount: { increment: 1 },
          },
        });
        
        return apiKey;
      }
    }
    
    return null;
  }
  
  /**
   * Lists all API keys for a user (without exposing the actual keys)
   */
  static async listUserApiKeys(userId: string) {
    return db.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        usageCount: true,
        revokedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  /**
   * Revokes an API key
   */
  static async revokeApiKey(userId: string, apiKeyId: string): Promise<boolean> {
    const result = await db.apiKey.updateMany({
      where: {
        id: apiKeyId,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });
    
    return result.count > 0;
  }
  
  /**
   * Logs API usage
   */
  static async logApiUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    ipAddress?: string,
    userAgent?: string
  ) {
    await db.apiUsageLog.create({
      data: {
        apiKeyId,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        ipAddress,
        userAgent,
      },
    });
  }
  
  /**
   * Gets API usage statistics for a user
   */
  static async getUserApiUsageStats(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const apiKeys = await db.apiKey.findMany({
      where: { userId },
      include: {
        apiUsageLogs: {
          where: {
            createdAt: { gte: startDate },
          },
          select: {
            endpoint: true,
            statusCode: true,
            responseTimeMs: true,
            createdAt: true,
          },
        },
      },
    });
    
    return apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      totalRequests: key.apiUsageLogs.length,
      successfulRequests: key.apiUsageLogs.filter(log => log.statusCode < 400).length,
      averageResponseTime: key.apiUsageLogs.length > 0
        ? key.apiUsageLogs.reduce((sum, log) => sum + log.responseTimeMs, 0) / key.apiUsageLogs.length
        : 0,
      endpointBreakdown: key.apiUsageLogs.reduce((acc, log) => {
        acc[log.endpoint] = (acc[log.endpoint] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    }));
  }
}