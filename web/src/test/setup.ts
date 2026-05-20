import '@testing-library/jest-dom'
import { afterEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// happy-dom v20 doesn't expose localStorage unless --localstorage-file is set.
// Provide a minimal in-memory shim so code that touches window.localStorage works in tests.
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size
      },
    },
    configurable: true,
  })
}

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

// Mock for file imports
vi.mock('*.jpg', () => ({ default: 'mock-jpg' }))
vi.mock('*.jpeg', () => ({ default: 'mock-jpeg' }))
vi.mock('*.png', () => ({ default: 'mock-png' }))
vi.mock('*.gif', () => ({ default: 'mock-gif' }))
vi.mock('*.svg', () => ({ default: 'mock-svg' }))
vi.mock('*.ttf', () => ({ default: 'mock-ttf' }))
vi.mock('*.woff', () => ({ default: 'mock-woff' }))
vi.mock('*.woff2', () => ({ default: 'mock-woff2' }))

// Extend expect with custom matchers if needed
