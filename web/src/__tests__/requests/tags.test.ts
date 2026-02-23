// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addTags, getTags } from '../../store/requests/tags'

// Mock the global fetch
global.fetch = vi.fn()

describe('Tags Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTags', () => {
    it('fetches tags successfully', async () => {
      const mockTags = {
        tags: [{ name: 'pii' }, { name: 'sensitive' }, { name: 'production' }],
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockTags),
      })

      const result = await getTags()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tags'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockTags)
    })

    it('uses correct API endpoint', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ tags: [] }),
      })

      await getTags()

      expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/tags$/), expect.any(Object))
    })

    it('handles empty tag list', async () => {
      const mockTags = { tags: [] }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockTags),
      })

      const result = await getTags()

      expect(result.tags).toHaveLength(0)
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ code: 500, message: 'Server error', details: '' }),
      })

      await expect(getTags()).rejects.toThrow()
    })
  })

  describe('addTags', () => {
    it('adds a tag successfully with PUT method', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addTags('test-tag', 'Test description')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tags/test-tag'),
        expect.objectContaining({
          method: 'PUT',
        })
      )
    })

    it('sends description in request body', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addTags('pii', 'Personally identifiable information')

      const call = (global.fetch as any).mock.calls[0][1]
      expect(call.body).toContain('Personally identifiable information')
      expect(JSON.parse(call.body)).toEqual({
        description: 'Personally identifiable information',
      })
    })

    it('includes Content-Type header', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addTags('tag', 'desc')

      const call = (global.fetch as any).mock.calls[0][1]
      expect(call.headers['Content-Type']).toBe('application/json')
    })

    it('handles tag names with special characters', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addTags('pii:sensitive', 'Sensitive PII data')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tags/pii:sensitive'),
        expect.any(Object)
      )
    })

    it('handles empty description', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addTags('tag-name', '')

      const call = (global.fetch as any).mock.calls[0][1]
      expect(JSON.parse(call.body)).toEqual({ description: '' })
    })

    it('handles long descriptions', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      const longDescription = 'A'.repeat(1000)
      await addTags('tag', longDescription)

      const call = (global.fetch as any).mock.calls[0][1]
      expect(JSON.parse(call.body).description).toBe(longDescription)
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 409,
        text: async () => JSON.stringify({ code: 409, message: 'Tag already exists', details: '' }),
      })

      await expect(addTags('existing-tag', 'desc')).rejects.toThrow()
    })
  })
})
