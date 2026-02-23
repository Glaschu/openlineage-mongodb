// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getEvents } from '../../store/requests/events'

// Mock the global fetch
global.fetch = vi.fn()

describe('Events Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEvents', () => {
    it('fetches events with default parameters', async () => {
      const mockEvents = {
        events: [{ id: '1' }, { id: '2' }],
        totalCount: 2,
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockEvents),
      })

      const result = await getEvents()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/events/lineage'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockEvents)
    })

    it('includes default limit and offset', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ events: [] }),
      })

      await getEvents()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=100'),
        expect.any(Object)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=0'),
        expect.any(Object)
      )
    })

    it('includes default sort direction as desc', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ events: [] }),
      })

      await getEvents()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sortDirection=desc'),
        expect.any(Object)
      )
    })

    it('fetches events with custom after parameter', async () => {
      const mockEvents = { events: [] }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockEvents),
      })

      await getEvents('2024-01-01T00:00:00Z')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('after=2024-01-01T00:00:00Z'),
        expect.any(Object)
      )
    })

    it('fetches events with custom before parameter', async () => {
      const mockEvents = { events: [] }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockEvents),
      })

      await getEvents('', '2024-12-31T23:59:59Z')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('before=2024-12-31T23:59:59Z'),
        expect.any(Object)
      )
    })

    it('fetches events with custom limit', async () => {
      const mockEvents = { events: [] }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockEvents),
      })

      await getEvents('', '', 50)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      )
    })

    it('fetches events with custom offset', async () => {
      const mockEvents = { events: [] }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockEvents),
      })

      await getEvents('', '', 100, 25)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=25'),
        expect.any(Object)
      )
    })

    it('fetches events with ascending sort direction', async () => {
      const mockEvents = { events: [] }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockEvents),
      })

      await getEvents('', '', 100, 0, 'asc')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sortDirection=asc'),
        expect.any(Object)
      )
    })

    it('fetches events with all parameters', async () => {
      const mockEvents = { events: [] }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockEvents),
      })

      await getEvents('2024-01-01', '2024-12-31', 200, 50, 'desc')

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('after=2024-01-01')
      expect(call).toContain('before=2024-12-31')
      expect(call).toContain('limit=200')
      expect(call).toContain('offset=50')
      expect(call).toContain('sortDirection=desc')
    })

    it('handles empty date strings', async () => {
      const mockEvents = { events: [] }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockEvents),
      })

      await getEvents('', '')

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('before=')
      expect(call).toContain('after=')
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ code: 500, message: 'Server error', details: '' }),
      })

      await expect(getEvents()).rejects.toThrow()
    })
  })
})
