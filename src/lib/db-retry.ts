import { isTransientDbError } from '@/lib/db-error'

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isTransientDbError(error) || attempt === maxAttempts) break
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
    }
  }

  throw lastError
}

