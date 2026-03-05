const TRANSIENT_PATTERNS = [
  'connect timeout',
  'connecttimeouterror',
  'fetch failed',
  'econnreset',
  'etimedout',
  'eai_again',
  'enotfound',
  'econnrefused',
  'und_err_connect_timeout',
]

function collectErrorStrings(error: unknown, depth = 0, out: string[] = []): string[] {
  if (!error || depth > 5) return out

  if (typeof error === 'string') {
    out.push(error)
    return out
  }

  if (error instanceof Error) {
    out.push(error.name, error.message)
    const nested = error as Error & { code?: string; cause?: unknown }
    if (nested.code) out.push(nested.code)
    if (nested.cause) collectErrorStrings(nested.cause, depth + 1, out)
    return out
  }

  if (typeof error === 'object') {
    const maybe = error as {
      message?: unknown
      code?: unknown
      name?: unknown
      cause?: unknown
    }
    if (typeof maybe.name === 'string') out.push(maybe.name)
    if (typeof maybe.message === 'string') out.push(maybe.message)
    if (typeof maybe.code === 'string') out.push(maybe.code)
    if (maybe.cause) collectErrorStrings(maybe.cause, depth + 1, out)
  }

  return out
}

export function isTransientDbError(error: unknown): boolean {
  const haystack = collectErrorStrings(error)
    .join(' ')
    .toLowerCase()

  return TRANSIENT_PATTERNS.some((pattern) => haystack.includes(pattern))
}

