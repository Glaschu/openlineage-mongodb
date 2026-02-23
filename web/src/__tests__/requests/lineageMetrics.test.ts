// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLineageMetrics } from '../../store/requests/lineageMetrics'

// Mock the global fetch
global.fetch = vi.fn()

// Mock Intl.DateTimeFormat
const mockResolvedOptions = vi.fn().mockReturnValue({ timeZone: 'America/New_York' })
global.Intl = {
  DateTimeFormat: vi.fn().mockImplementation(() => ({
    resolvedOptions: mockResolvedOptions,
  })),
} as any

describe('Lineage Metrics Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolvedOptions.mockReturnValue({ timeZone: 'America/New_York' })
  })

  describe('getLineageMetrics', () => {
    it('fetches lineage metrics with day unit', async () => {
      const mockMetrics = [
        {
          startInterval: '2024-01-01',
          endInterval: '2024-01-02',
          fail: 5,
          start: 10,
          complete: 8,
          abort: 2,
        },
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockMetrics),
      })

      const result = await getLineageMetrics({ unit: 'day' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/stats/lineage-events'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockMetrics)
    })

    it('fetches lineage metrics with week unit', async () => {
      const mockMetrics: any[] = []

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockMetrics),
      })

      await getLineageMetrics({ unit: 'week' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('period=WEEK'),
        expect.any(Object)
      )
    })

    it('converts day unit to uppercase DAY', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getLineageMetrics({ unit: 'day' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('period=DAY'),
        expect.any(Object)
      )
    })

    it('includes timezone parameter from browser', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getLineageMetrics({ unit: 'day' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('timezone=America/New_York'),
        expect.any(Object)
      )
    })

    it('handles different timezones', async () => {
      mockResolvedOptions.mockReturnValue({ timeZone: 'Europe/London' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getLineageMetrics({ unit: 'day' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('timezone=Europe/London'),
        expect.any(Object)
      )
    })

    it('handles UTC timezone', async () => {
      mockResolvedOptions.mockReturnValue({ timeZone: 'UTC' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getLineageMetrics({ unit: 'week' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('timezone=UTC'),
        expect.any(Object)
      )
    })

    it('handles Asia/Tokyo timezone', async () => {
      mockResolvedOptions.mockReturnValue({ timeZone: 'Asia/Tokyo' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getLineageMetrics({ unit: 'day' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('timezone=Asia/Tokyo'),
        expect.any(Object)
      )
    })

    it('includes both period and timezone parameters', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getLineageMetrics({ unit: 'week' })

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('period=WEEK')
      expect(call).toContain('timezone=')
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ code: 500, message: 'Server error', details: '' }),
      })

      await expect(getLineageMetrics({ unit: 'day' })).rejects.toThrow()
    })

    it('handles empty metrics array', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      const result = await getLineageMetrics({ unit: 'day' })

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })

    it('handles complex metrics response', async () => {
      const mockMetrics = [
        {
          startInterval: '2024-01-01T00:00:00Z',
          endInterval: '2024-01-01T23:59:59Z',
          fail: 10,
          start: 100,
          complete: 85,
          abort: 5,
        },
        {
          startInterval: '2024-01-02T00:00:00Z',
          endInterval: '2024-01-02T23:59:59Z',
          fail: 8,
          start: 95,
          complete: 82,
          abort: 5,
        },
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockMetrics),
      })

      const result = await getLineageMetrics({ unit: 'day' })

      expect(result).toHaveLength(2)
      expect(result[0].fail).toBe(10)
      expect(result[1].complete).toBe(82)
    })
  })
})
