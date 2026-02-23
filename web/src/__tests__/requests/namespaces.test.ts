// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getNamespaces } from '../../store/requests/namespaces'

// Mock the global fetch
global.fetch = vi.fn()

describe('Namespaces Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNamespaces', () => {
    it('fetches namespaces successfully', async () => {
      const mockNamespaces = {
        namespaces: [{ name: 'ns1' }, { name: 'ns2' }, { name: 'ns3' }],
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockNamespaces),
      })

      const result = await getNamespaces()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockNamespaces)
    })

    it('uses correct API endpoint', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ namespaces: [] }),
      })

      await getNamespaces()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/namespaces$/),
        expect.any(Object)
      )
    })

    it('handles empty namespace list', async () => {
      const mockNamespaces = { namespaces: [] }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockNamespaces),
      })

      const result = await getNamespaces()

      expect(result.namespaces).toHaveLength(0)
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ code: 403, message: 'Forbidden', details: '' }),
      })

      await expect(getNamespaces()).rejects.toThrow()
    })

    it('handles network errors', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      await expect(getNamespaces()).rejects.toThrow('Network error')
    })
  })
})
