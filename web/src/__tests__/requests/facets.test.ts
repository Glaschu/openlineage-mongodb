// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getJobFacets, getRunFacets } from '../../store/requests/facets'

// Mock the global fetch
global.fetch = vi.fn()

describe('Facets Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRunFacets', () => {
    it('fetches run facets successfully', async () => {
      const mockFacets = {
        facets: {
          nominalTime: { nominalStartTime: '2024-01-01T00:00:00Z' },
        },
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockFacets),
      })

      const result = await getRunFacets('run-123')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/jobs/runs/run-123/facets'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockFacets)
    })

    it('includes type=run query parameter', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ facets: {} }),
      })

      await getRunFacets('run-456')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=run'),
        expect.any(Object)
      )
    })

    it('handles run IDs with special characters', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ facets: {} }),
      })

      await getRunFacets('run-id-with-dashes-123')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/jobs/runs/run-id-with-dashes-123'),
        expect.any(Object)
      )
    })

    it('handles UUID format run IDs', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ facets: {} }),
      })

      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      await getRunFacets(uuid)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/jobs/runs/${uuid}`),
        expect.any(Object)
      )
    })

    it('handles empty facets', async () => {
      const mockFacets = { facets: {} }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockFacets),
      })

      const result = await getRunFacets('run-1')

      expect(result.facets).toEqual({})
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ code: 404, message: 'Run not found', details: '' }),
      })

      await expect(getRunFacets('non-existent-run')).rejects.toThrow()
    })
  })

  describe('getJobFacets', () => {
    it('fetches job facets successfully', async () => {
      const mockFacets = {
        facets: {
          sourceCode: { language: 'python', sourceCode: 'print("hello")' },
        },
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockFacets),
      })

      const result = await getJobFacets('run-123')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/jobs/runs/run-123/facets'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockFacets)
    })

    it('includes type=job query parameter', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ facets: {} }),
      })

      await getJobFacets('run-456')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=job'),
        expect.any(Object)
      )
    })

    it('uses same endpoint as getRunFacets but different type', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ facets: {} }),
      })

      await getRunFacets('run-1')
      await getJobFacets('run-1')

      const runCall = (global.fetch as any).mock.calls[0][0]
      const jobCall = (global.fetch as any).mock.calls[1][0]

      expect(runCall).toContain('type=run')
      expect(jobCall).toContain('type=job')
      expect(runCall.replace('type=run', '')).toBe(jobCall.replace('type=job', ''))
    })

    it('handles complex facet structures', async () => {
      const mockFacets = {
        facets: {
          sourceCode: { language: 'sql', sourceCode: 'SELECT * FROM table' },
          sql: { query: 'SELECT * FROM table' },
        },
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockFacets),
      })

      const result = await getJobFacets('run-789')

      expect(result.facets.sourceCode).toBeDefined()
      expect(result.facets.sql).toBeDefined()
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ code: 500, message: 'Server error', details: '' }),
      })

      await expect(getJobFacets('run-1')).rejects.toThrow()
    })
  })
})
