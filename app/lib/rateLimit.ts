// Simple in-memory rate limiting for authentication endpoints
// In production, use Redis or a proper rate limiting service

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts per window
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

export function checkRateLimit(
  identifier: string, 
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  
  // Clean up expired entries
  const keysToDelete: string[] = [];
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetTime < now) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => rateLimitStore.delete(key));
  
  const entry = rateLimitStore.get(identifier);
  
  if (!entry || entry.resetTime < now) {
    // First request or expired window - reset
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    
    return {
      success: true,
      remaining: options.maxAttempts - 1,
      resetTime: newEntry.resetTime,
    };
  }
  
  if (entry.count >= options.maxAttempts) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(identifier, entry);
  
  return {
    success: true,
    remaining: options.maxAttempts - entry.count,
    resetTime: entry.resetTime,
  };
}

export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for reverse proxy setups)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ip = forwarded.split(',')[0].trim();
    return ip;
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to connection remote address (less reliable in production)
  return 'unknown-client';
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  AUTH_STRICT: { windowMs: 15 * 60 * 1000, maxAttempts: 5 }, // 5 attempts per 15 minutes
  AUTH_MODERATE: { windowMs: 5 * 60 * 1000, maxAttempts: 10 }, // 10 attempts per 5 minutes
  AUTH_LENIENT: { windowMs: 60 * 1000, maxAttempts: 20 }, // 20 attempts per minute
  API_GENERAL: { windowMs: 60 * 1000, maxAttempts: 100 }, // 100 requests per minute
} as const;