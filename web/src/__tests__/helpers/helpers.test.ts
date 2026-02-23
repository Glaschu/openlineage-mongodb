// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { formatNumber } from '../../helpers/numbers'
import { truncateText } from '../../helpers/text'

describe('Helper Functions', () => {
  describe('numbers helpers', () => {
    it('should format number', () => {
      const result = formatNumber(1000)
      expect(result).toBe('1k')
    })

    it('should format large number', () => {
      const result = formatNumber(1000000)
      expect(result).toBe('1M')
    })

    it('should not format small numbers', () => {
      const result = formatNumber(500)
      expect(result).toBe('500')
    })
  })

  describe('text helpers', () => {
    it('should truncate long text', () => {
      const result = truncateText('This is a very long text that should be truncated', 10)
      expect(result.length).toBeLessThanOrEqual(13) // 10 + '...'
    })

    it('should not truncate short text', () => {
      const result = truncateText('Short', 10)
      expect(result).toBe('Short')
    })
  })
})
