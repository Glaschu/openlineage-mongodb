// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getColumnLineage } from '../../store/requests/columnlineage'

// Mock the global fetch
global.fetch = vi.fn()

// Mock generateNodeId helper
vi.mock('../../helpers/nodes', () => ({
  generateNodeId: (type: string, namespace: string, name: string) =>
    `${type}:${namespace}:${name}`,
}))

describe('Column Lineage Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getColumnLineage', () => {
    it('fetches column lineage for a dataset', async () => {
      const mockLineage = {
        graph: { nodes: [], edges: [] },
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockLineage),
      })

      const result = await getColumnLineage('DATASET', 'test-namespace', 'test-dataset', 3)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/column-lineage'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockLineage)
    })

    it('fetches column lineage for a job', async () => {
      const mockLineage = {
        graph: { nodes: [], edges: [] },
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockLineage),
      })

      await getColumnLineage('JOB', 'test-namespace', 'test-job', 2)

      expect(global.fetch).toHaveBeenCalled()
    })

    it('includes nodeId parameter generated from inputs', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ graph: {} }),
      })

      await getColumnLineage('DATASET', 'ns', 'ds', 1)

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('nodeId=DATASET')
    })

    it('includes depth parameter', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ graph: {} }),
      })

      await getColumnLineage('DATASET', 'ns', 'ds', 5)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('depth=5'),
        expect.any(Object)
      )
    })

    it('includes withDownstream=true parameter', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ graph: {} }),
      })

      await getColumnLineage('DATASET', 'ns', 'ds', 3)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('withDownstream=true'),
        expect.any(Object)
      )
    })

    it('encodes namespace correctly', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ graph: {} }),
      })

      await getColumnLineage('DATASET', 'namespace/with/slashes', 'dataset', 1)

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('namespace%2Fwith%2Fslashes')
    })

    it('encodes dataset name correctly', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ graph: {} }),
      })

      await getColumnLineage('DATASET', 'ns', 'dataset with spaces', 1)

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('dataset%20with%20spaces')
    })

    it('handles depth of 0', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ graph: {} }),
      })

      await getColumnLineage('DATASET', 'ns', 'ds', 0)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('depth=0'),
        expect.any(Object)
      )
    })

    it('handles large depth values', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ graph: {} }),
      })

      await getColumnLineage('DATASET', 'ns', 'ds', 20)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('depth=20'),
        expect.any(Object)
      )
    })

    it('handles complex dataset names', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ graph: {} }),
      })

      await getColumnLineage('DATASET', 'prod', 'schema.table.column', 3)

      expect(global.fetch).toHaveBeenCalled()
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ code: 404, message: 'Not found', details: '' }),
      })

      await expect(getColumnLineage('DATASET', 'ns', 'ds', 1)).rejects.toThrow()
    })

    it('handles network errors', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network failure'))

      await expect(getColumnLineage('DATASET', 'ns', 'ds', 1)).rejects.toThrow('Network failure')
    })
  })
})
