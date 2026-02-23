import '@testing-library/jest-dom'
import { afterEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

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
