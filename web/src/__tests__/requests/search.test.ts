// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOpenSearchDatasets, getOpenSearchJobs, getSearch } from '../../store/requests/search'

// Mock the global fetch
global.fetch = vi.fn()

describe('Search Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSearch', () => {
    it('performs basic search successfully', async () => {
      const mockResults = {
        results: [{ name: 'result1' }, { name: 'result2' }],
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResults),
      })

      const result = await getSearch('test query')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/search?q=test query'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockResults)
    })

    it('includes default sort parameter', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ results: [] }),
      })

      await getSearch('query')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=NAME'),
        expect.any(Object)
      )
    })

    it('includes default limit parameter', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ results: [] }),
      })

      await getSearch('query')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=100'),
        expect.any(Object)
      )
    })

    it('searches with JOB filter', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ results: [] }),
      })

      await getSearch('query', 'JOB')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('filter=JOB'),
        expect.any(Object)
      )
    })

    it('searches with DATASET filter', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ results: [] }),
      })

      await getSearch('query', 'DATASET')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('filter=DATASET'),
        expect.any(Object)
      )
    })

    it('does not include filter for ALL', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ results: [] }),
      })

      await getSearch('query', 'ALL')

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).not.toContain('filter=')
    })

    it('searches with custom sort parameter', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ results: [] }),
      })

      await getSearch('query', 'ALL', 'UPDATE_AT')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=UPDATE_AT'),
        expect.any(Object)
      )
    })

    it('searches with custom limit', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ results: [] }),
      })

      await getSearch('query', 'ALL', 'NAME', 50)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      )
    })

    it('searches with all parameters', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ results: [] }),
      })

      await getSearch('my query', 'JOB', 'UPDATE_AT', 200)

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('q=my query')
      expect(call).toContain('filter=JOB')
      expect(call).toContain('sort=UPDATE_AT')
      expect(call).toContain('limit=200')
    })

    it('handles special characters in query', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ results: [] }),
      })

      await getSearch('query with spaces & symbols')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=query with spaces & symbols'),
        expect.any(Object)
      )
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ code: 400, message: 'Bad request', details: '' }),
      })

      await expect(getSearch('query')).rejects.toThrow()
    })
  })

  describe('getOpenSearchJobs', () => {
    it('searches jobs via beta API successfully', async () => {
      const mockResults = {
        hits: [{ name: 'job1' }, { name: 'job2' }],
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResults),
      })

      const result = await getOpenSearchJobs('test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/search/jobs?q=test'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockResults)
    })

    it('uses beta API URL', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ hits: [] }),
      })

      await getOpenSearchJobs('query')

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('/api/v2beta/search/jobs?q=query')
    })

    it('searches for complex job queries', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ hits: [] }),
      })

      await getOpenSearchJobs('etl job production')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=etl job production'),
        expect.any(Object)
      )
    })

    it('handles empty search query', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ hits: [] }),
      })

      await getOpenSearchJobs('')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q='),
        expect.any(Object)
      )
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ code: 500, message: 'Server error', details: '' }),
      })

      await expect(getOpenSearchJobs('query')).rejects.toThrow()
    })
  })

  describe('getOpenSearchDatasets', () => {
    it('searches datasets via beta API successfully', async () => {
      const mockResults = {
        hits: [{ name: 'dataset1' }, { name: 'dataset2' }],
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResults),
      })

      const result = await getOpenSearchDatasets('test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/search/datasets?q=test'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockResults)
    })

    it('uses beta API URL', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ hits: [] }),
      })

      await getOpenSearchDatasets('query')

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('/api/v2beta/search/datasets?q=query')
    })

    it('searches for complex dataset queries', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ hits: [] }),
      })

      await getOpenSearchDatasets('user table production')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=user table production'),
        expect.any(Object)
      )
    })

    it('handles empty search query', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ hits: [] }),
      })

      await getOpenSearchDatasets('')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q='),
        expect.any(Object)
      )
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
        text: async () =>
          JSON.stringify({ code: 503, message: 'Service unavailable', details: '' }),
      })

      await expect(getOpenSearchDatasets('query')).rejects.toThrow()
    })
  })
})
