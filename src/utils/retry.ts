/**
 * Exponential Backoff Retry Utility
 *
 * Provides a flexible, type-safe retry mechanism with exponential backoff
 * for handling transient failures in asynchronous operations.
 *
 * @author Dimitri
 * @version 1.0.0
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Configuration options for the exponential backoff retry mechanism
 *
 * @template T - The return type of the operation being retried
 */
export interface RetryOptions<T = unknown> {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds between retries (default: 1000) */
  retryDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Optional jitter factor to randomize delays (0-1, default: 0) */
  jitter?: number;
  /** Custom function to determine if an error should trigger a retry */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Callback fired before each retry attempt */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
  /** Callback fired when all retries are exhausted */
  onMaxRetriesReached?: (lastError: Error, totalAttempts: number) => void;
  /** Callback fired on successful operation */
  onSuccess?: (result: T, totalAttempts: number) => void;
}

/**
 * Internal state for tracking retry attempts
 * @internal - Not exported, used internally for documentation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RetryState {
  /** Current attempt number (0-based) */
  attempt: number;
  /** Last error encountered */
  lastError: Error | null;
  /** Whether retry is currently in progress */
  isRetrying: boolean;
}

/**
 * Result of a retry operation
 *
 * @template T - The return type of the successful operation
 */
export interface RetryResult<T> {
  /** The successful result, if any */
  data?: T;
  /** The final error, if operation failed after all retries */
  error?: Error;
  /** Whether the operation was successful */
  success: boolean;
  /** Total number of attempts made */
  totalAttempts: number;
  /** Whether all retries were exhausted */
  retriesExhausted: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates the delay for the next retry attempt using exponential backoff
 *
 * @param attempt - Current attempt number (0-based)
 * @param retryDelay - Base delay in milliseconds between retries
 * @param backoffMultiplier - Exponential multiplier
 * @param maxDelay - Maximum delay cap
 * @param jitter - Jitter factor for randomization (0-1)
 * @returns Calculated delay in milliseconds
 *
 * @example
 * ```typescript
 * const delay = calculateBackoffDelay(2, 1000, 2, 30000, 0.1);
 * // Returns ~4000ms ± 10% jitter
 * ```
 */
export function calculateBackoffDelay(
  attempt: number,
  retryDelay: number = 1000,
  backoffMultiplier: number = 2,
  maxDelay: number = 30000,
  jitter: number = 0
): number {
  // Calculate exponential delay
  const exponentialDelay = retryDelay * Math.pow(backoffMultiplier, attempt);

  // Apply maximum delay cap
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Apply jitter if specified
  if (jitter > 0) {
    const jitterAmount = cappedDelay * jitter;
    const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;
    return Math.max(0, cappedDelay + randomJitter);
  }

  return cappedDelay;
}

/**
 * Default retry condition - retries for any error
 *
 * @param _error - The error that occurred (unused)
 * @param _attempt - Current attempt number (unused)
 * @returns Always true (retry for any error)
 */
const defaultShouldRetry = (_error: Error, _attempt: number): boolean => true;

// ============================================================================
// Main Retry Functions
// ============================================================================

/**
 * Executes an asynchronous operation with exponential backoff retry logic
 *
 * This function provides a robust retry mechanism for handling transient failures
 * in asynchronous operations such as API calls, file operations, or hardware detection.
 *
 * @template T - The return type of the operation
 * @param operation - The async function to retry
 * @param options - Configuration options for retry behavior
 * @returns Promise resolving to RetryResult with success/failure information
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await retryWithBackoff(
 *   async () => await fetch('/api/data'),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 *
 * if (result.success) {
 *   console.log('Data:', result.data);
 * } else {
 *   console.error('Failed after retries:', result.error);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Advanced usage with custom retry logic
 * const result = await retryWithBackoff(
 *   async () => await detectHardware(),
 *   {
 *     maxRetries: 5,
 *     initialDelay: 2000,
 *     backoffMultiplier: 1.5,
 *     jitter: 0.1,
 *     shouldRetry: (error, attempt) => {
 *       // Only retry network errors, not validation errors
 *       return error.name === 'NetworkError';
 *     },
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt + 1} in ${delay}ms: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions<T> = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    jitter = 0,
    shouldRetry = defaultShouldRetry,
    onRetry,
    onMaxRetriesReached,
    onSuccess,
  } = options;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      // Execute the operation
      const result = await operation();

      // Success! Call success callback if provided
      onSuccess?.(result, attempt + 1);

      return {
        data: result,
        success: true,
        totalAttempts: attempt + 1,
        retriesExhausted: false,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (!shouldRetry(lastError, attempt)) {
        return {
          error: lastError,
          success: false,
          totalAttempts: attempt + 1,
          retriesExhausted: false,
        };
      }

      // Check if we've exhausted all retries
      if (attempt >= maxRetries) {
        onMaxRetriesReached?.(lastError, attempt + 1);
        return {
          error: lastError,
          success: false,
          totalAttempts: attempt + 1,
          retriesExhausted: true,
        };
      }

      // Calculate delay for next retry
      const delay = calculateBackoffDelay(
        attempt,
        retryDelay,
        backoffMultiplier,
        maxDelay,
        jitter
      );

      // Call retry callback if provided
      onRetry?.(lastError, attempt, delay);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      attempt++;
    }
  }

  // This should never be reached, but TypeScript requires it
  return {
    error: lastError || new Error("Unknown error"),
    success: false,
    totalAttempts: attempt,
    retriesExhausted: true,
  };
}

/**
 * Creates a retry function with pre-configured options
 *
 * This factory function allows you to create a reusable retry function
 * with specific configuration, useful for consistent retry behavior
 * across multiple operations.
 *
 * @template T - The return type of operations this retry function will handle
 * @param defaultOptions - Default retry options to apply
 * @returns A configured retry function
 *
 * @example
 * ```typescript
 * // Create a retry function for API calls
 * const retryApiCall = createRetryFunction<Response>({
 *   maxRetries: 5,
 *   initialDelay: 1000,
 *   backoffMultiplier: 1.5,
 *   shouldRetry: (error) => error.name === 'NetworkError',
 *   onRetry: (error, attempt, delay) => {
 *     console.log(`API retry ${attempt + 1} in ${delay}ms`);
 *   }
 * });
 *
 * // Use the configured retry function
 * const userResult = await retryApiCall(() => fetch('/api/users'));
 * const postsResult = await retryApiCall(() => fetch('/api/posts'));
 * ```
 */
export function createRetryFunction<T = unknown>(
  defaultOptions: RetryOptions<T>
) {
  return async (
    operation: () => Promise<T>,
    overrideOptions?: Partial<RetryOptions<T>>
  ): Promise<RetryResult<T>> => {
    const mergedOptions = { ...defaultOptions, ...overrideOptions };
    return retryWithBackoff(operation, mergedOptions);
  };
}

/**
 * Utility function for creating common retry configurations
 */
export const RetryPresets = {
  /**
   * Fast retry for quick operations (UI interactions, etc.)
   */
  fast: {
    maxRetries: 3,
    retryDelay: 500,
    backoffMultiplier: 1.5,
    maxDelay: 5000,
  } as RetryOptions,

  /**
   * Standard retry for most operations
   */
  standard: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
  } as RetryOptions,

  /**
   * Slow retry for expensive operations (hardware detection, etc.)
   */
  slow: {
    maxRetries: 3,
    retryDelay: 2000,
    backoffMultiplier: 2,
    maxDelay: 30000,
  } as RetryOptions,

  /**
   * Patient retry for critical operations that must succeed
   */
  patient: {
    maxRetries: 5,
    retryDelay: 3000,
    backoffMultiplier: 1.5,
    maxDelay: 60000,
    jitter: 0.1,
  } as RetryOptions,
} as const;
