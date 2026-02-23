// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { capitalize, fileSize, formatUpdatedAt } from '../../helpers'

describe('helpers/index', () => {
  describe('capitalize', () => {
    it('uppercases single characters', () => {
      expect(capitalize('a')).toBe('A')
      expect(capitalize('z')).toBe('Z')
    })

    it('uppercases only the first character for longer words', () => {
      expect(capitalize('alpha')).toBe('Alpha')
      expect(capitalize('beta-value')).toBe('Beta-value')
    })
  })

  describe('formatUpdatedAt', () => {
    it('returns an empty string for missing values', () => {
      expect(formatUpdatedAt('')).toBe('')
    })

    it('returns an empty string for unparsable input', () => {
      expect(formatUpdatedAt('not-a-date')).toBe('')
    })

    it('formats ISO timestamps into readable strings', () => {
      const formatted = formatUpdatedAt('2021-05-13T13:45:13Z')
      expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4} \d{2}:\d{2}(am|pm)$/)
      expect(formatted).toContain('May 13, 2021')
    })
  })

  describe('fileSize', () => {
    it('returns zero sizes for an empty payload', () => {
      const sizes = fileSize('')
      expect(sizes.kiloBytes).toBe(0)
      expect(sizes.megaBytes).toBe(0)
    })

    it('computes kilobytes and megabytes based on encoded length', () => {
      const sizes = fileSize('hello world')
      expect(sizes.kiloBytes).toBeCloseTo(11 / 1024, 5)
      expect(sizes.megaBytes).toBeCloseTo(11 / (1024 * 1024), 8)
    })
  })
})
