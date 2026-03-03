import { beforeAll } from 'vitest'

declare global {
  interface Window {
    matchMedia: (query: string) => MediaQueryList
  }
}

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserver
  }

  if (!('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }
})
