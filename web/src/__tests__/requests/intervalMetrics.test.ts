// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getIntervalMetrics } from '../../store/requests/intervalMetrics'

// Mock the global fetch
global.fetch = vi.fn()

// Mock Intl.DateTimeFormat
const mockResolvedOptions = vi.fn().mockReturnValue({ timeZone: 'America/New_York' })
global.Intl = {
  DateTimeFormat: vi.fn().mockImplementation(() => ({
    resolvedOptions: mockResolvedOptions,
  })),
} as any

describe('Interval Metrics Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolvedOptions.mockReturnValue({ timeZone: 'America/New_York' })
  })

  describe('getIntervalMetrics', () => {
    it('fetches jobs metrics with day unit', async () => {
      const mockMetrics = [
        {
          startInterval: '2024-01-01',
          endInterval: '2024-01-02',
          count: 100,
        },
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockMetrics),
      })

      const result = await getIntervalMetrics({ asset: 'jobs', unit: 'day' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/stats/jobs'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockMetrics)
    })

    it('fetches datasets metrics with week unit', async () => {
      const mockMetrics: any[] = []

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockMetrics),
      })

      await getIntervalMetrics({ asset: 'datasets', unit: 'week' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/stats/datasets'),
        expect.any(Object)
      )
    })

    it('fetches sources metrics', async () => {
      const mockMetrics: any[] = []

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockMetrics),
      })

      await getIntervalMetrics({ asset: 'sources', unit: 'day' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/stats/sources'),
        expect.any(Object)
      )
    })

    it('converts day unit to uppercase DAY', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getIntervalMetrics({ asset: 'jobs', unit: 'day' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('period=DAY'),
        expect.any(Object)
      )
    })

    it('converts week unit to uppercase WEEK', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getIntervalMetrics({ asset: 'datasets', unit: 'week' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('period=WEEK'),
        expect.any(Object)
      )
    })

    it('includes timezone parameter from browser', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getIntervalMetrics({ asset: 'jobs', unit: 'day' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('timezone=America/New_York'),
        expect.any(Object)
      )
    })

    it('handles different timezones', async () => {
      mockResolvedOptions.mockReturnValue({ timeZone: 'Pacific/Auckland' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getIntervalMetrics({ asset: 'sources', unit: 'day' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('timezone=Pacific/Auckland'),
        expect.any(Object)
      )
    })

    it('handles UTC timezone', async () => {
      mockResolvedOptions.mockReturnValue({ timeZone: 'UTC' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getIntervalMetrics({ asset: 'datasets', unit: 'week' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('timezone=UTC'),
        expect.any(Object)
      )
    })

    it('includes both period and timezone for jobs', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getIntervalMetrics({ asset: 'jobs', unit: 'week' })

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('/stats/jobs')
      expect(call).toContain('period=WEEK')
      expect(call).toContain('timezone=')
    })

    it('includes both period and timezone for datasets', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getIntervalMetrics({ asset: 'datasets', unit: 'day' })

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('/stats/datasets')
      expect(call).toContain('period=DAY')
      expect(call).toContain('timezone=')
    })

    it('includes both period and timezone for sources', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getIntervalMetrics({ asset: 'sources', unit: 'week' })

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('/stats/sources')
      expect(call).toContain('period=WEEK')
      expect(call).toContain('timezone=')
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ code: 500, message: 'Server error', details: '' }),
      })

      await expect(getIntervalMetrics({ asset: 'jobs', unit: 'day' })).rejects.toThrow()
    })

    it('handles empty metrics array', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      const result = await getIntervalMetrics({ asset: 'jobs', unit: 'day' })

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })

    it('handles complex metrics response', async () => {
      const mockMetrics = [
        {
          startInterval: '2024-01-01T00:00:00Z',
          endInterval: '2024-01-01T23:59:59Z',
          count: 150,
        },
        {
          startInterval: '2024-01-02T00:00:00Z',
          endInterval: '2024-01-02T23:59:59Z',
          count: 175,
        },
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockMetrics),
      })

      const result = await getIntervalMetrics({ asset: 'datasets', unit: 'day' })

      expect(result).toHaveLength(2)
      expect(result[0].count).toBe(150)
      expect(result[1].count).toBe(175)
    })
  })
})
