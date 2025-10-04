/**
 * Chat input validation schema
 *
 * Provides comprehensive validation for user chat inputs including:
 * - Length validation (min/max)
 * - XSS prevention (HTML tags, JavaScript injection)
 * - SQL injection prevention
 * - Event handler blocking
 *
 * @module chat-validation
 */

import { z } from 'zod'

/**
 * Chat input validation schema with security patterns
 *
 * Validation rules:
 * 1. Minimum 1 character (non-empty)
 * 2. Maximum 4000 characters
 * 3. No HTML tags
 * 4. No JavaScript protocol handlers
 * 5. No event handler attributes (onclick, onerror, etc.)
 * 6. No SQL keywords (basic prevention)
 */
export const chatInputSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message too long (max 4000 characters)')
    .refine(
      (val) => {
        // Block HTML tags, script injection, and SQL patterns
        const dangerousPatterns = [
          /<[^>]*>/g,                                                      // Any HTML tags
          /javascript:/gi,                                                  // JavaScript protocol
          /on\w+\s*=/gi,                                                   // Event handlers (onclick, onerror, etc.)
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|SCRIPT)\b)/gi  // SQL keywords
        ];
        return !dangerousPatterns.some(pattern => pattern.test(val));
      },
      'Input contains potentially unsafe characters. Please remove HTML tags, scripts, or special characters.'
    )
})

/**
 * Type-safe chat input
 */
export type ChatInput = z.infer<typeof chatInputSchema>

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  success: boolean
  data?: ChatInput
  error?: {
    message: string
    code: string
  }
}

/**
 * Validate chat input and return detailed result
 *
 * @param input - Raw input string to validate
 * @returns Validation result with data or error
 *
 * @example
 * const result = validateChatInput('Hello world')
 * if (result.success) {
 *   console.log(result.data.message)
 * } else {
 *   console.error(result.error.message)
 * }
 */
export function validateChatInput(input: string): ValidationResult {
  try {
    const validated = chatInputSchema.parse({ message: input })
    return {
      success: true,
      data: validated
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      if (firstError) {
        return {
          success: false,
          error: {
            message: firstError.message,
            code: firstError.code
          }
        }
      }
    }
    return {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'UNKNOWN_ERROR'
      }
    }
  }
}

/**
 * Character count status with color coding
 */
export type CharacterStatus = 'safe' | 'warning' | 'caution' | 'error'

/**
 * Get character count status for progressive UI feedback
 *
 * @param length - Current message length
 * @returns Status with color and message
 *
 * @example
 * const status = getCharacterStatus(3900)
 * // Returns: { status: 'caution', color: 'orange', message: '100 chars remaining' }
 */
export function getCharacterStatus(length: number): {
  status: CharacterStatus
  color: string
  message: string | null
} {
  if (length > 4000) {
    return {
      status: 'error',
      color: 'red',
      message: 'Too long! Please shorten your message.'
    }
  }
  if (length > 3800) {
    return {
      status: 'caution',
      color: 'orange',
      message: `${4000 - length} chars remaining`
    }
  }
  if (length > 3500) {
    return {
      status: 'warning',
      color: 'yellow',
      message: `${4000 - length} chars remaining`
    }
  }
  return {
    status: 'safe',
    color: 'green',
    message: null
  }
}

/**
 * Rate limit tracker for client-side UX
 * (Server-side enforcement will be added separately)
 */
export class RateLimitTracker {
  private messageCount: number = 0
  private resetTime: number = Date.now() + 60000 // 1 minute from now
  private readonly limit: number = 5

  /**
   * Check if rate limit allows sending a message
   *
   * @returns true if under limit, false if exceeded
   */
  canSend(): boolean {
    // Reset counter if time window has passed
    if (Date.now() > this.resetTime) {
      this.messageCount = 0
      this.resetTime = Date.now() + 60000
    }

    return this.messageCount < this.limit
  }

  /**
   * Increment message count after sending
   */
  incrementCount(): void {
    this.messageCount++
  }

  /**
   * Get remaining messages in current window
   */
  getRemainingMessages(): number {
    if (Date.now() > this.resetTime) {
      return this.limit
    }
    return Math.max(0, this.limit - this.messageCount)
  }

  /**
   * Get seconds until rate limit resets
   */
  getSecondsUntilReset(): number {
    return Math.max(0, Math.ceil((this.resetTime - Date.now()) / 1000))
  }
}
