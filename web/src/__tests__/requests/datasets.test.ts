// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addDatasetFieldTag,
  addDatasetTag,
  deleteDataset,
  deleteDatasetFieldTag,
  deleteDatasetTag,
  getDataset,
  getDatasets,
  getDatasetVersions,
} from '../../store/requests/datasets'

// Mock the global fetch
global.fetch = vi.fn()

describe('Datasets Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDatasets', () => {
    it('fetches datasets with default parameters', async () => {
      const mockResponse = {
        datasets: [
          { name: 'dataset1', namespace: 'ns1' },
          { name: 'dataset2', namespace: 'ns1' },
        ],
        totalCount: 2,
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      const result = await getDatasets('test-namespace')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces/test-namespace/datasets'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.datasets).toHaveLength(2)
      expect(result.totalCount).toBe(2)
    })

    it('fetches datasets with custom limit and offset', async () => {
      const mockResponse = { datasets: [], totalCount: 0 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getDatasets('test-namespace', 50, 10)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50&offset=10'),
        expect.any(Object)
      )
    })

    it('encodes namespace with special characters', async () => {
      const mockResponse = { datasets: [], totalCount: 0 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getDatasets('test/namespace with spaces')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('test%2Fnamespace%20with%20spaces'),
        expect.any(Object)
      )
    })

    it('adds namespace to each dataset', async () => {
      const mockResponse = {
        datasets: [{ name: 'dataset1' }, { name: 'dataset2' }],
        totalCount: 2,
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      const result = await getDatasets('test-namespace')

      expect(result.datasets[0].namespace).toBe('test-namespace')
      expect(result.datasets[1].namespace).toBe('test-namespace')
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ code: 500, message: 'Server error', details: '' }),
      })

      await expect(getDatasets('test-namespace')).rejects.toThrow()
    })
  })

  describe('getDatasetVersions', () => {
    it('fetches dataset versions successfully', async () => {
      const mockResponse = {
        versions: [{ version: 'v1' }, { version: 'v2' }],
        totalCount: 2,
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      const result = await getDatasetVersions('test-namespace', 'test-dataset', 10, 0)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/namespaces/test-namespace/datasets/test-dataset/versions?limit=10&offset=0'
        ),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.versions).toHaveLength(2)
      expect(result.totalCount).toBe(2)
    })

    it('encodes dataset name with special characters', async () => {
      const mockResponse = { versions: [], totalCount: 0 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getDatasetVersions('test-namespace', 'dataset/with/slashes', 10, 0)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('dataset%2Fwith%2Fslashes'),
        expect.any(Object)
      )
    })

    it('handles custom pagination', async () => {
      const mockResponse = { versions: [], totalCount: 0 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getDatasetVersions('ns', 'ds', 50, 25)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50&offset=25'),
        expect.any(Object)
      )
    })
  })

  describe('getDataset', () => {
    it('fetches a single dataset', async () => {
      const mockDataset = {
        name: 'test-dataset',
        namespace: 'test-namespace',
        type: 'DB_TABLE',
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockDataset),
      })

      const result = await getDataset('test-namespace', 'test-dataset')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces/test-namespace/datasets/test-dataset'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.name).toBe('test-dataset')
    })

    it('encodes both namespace and dataset name', async () => {
      const mockDataset = { name: 'ds' }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockDataset),
      })

      await getDataset('ns/with/slash', 'ds with space')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ns%2Fwith%2Fslash'),
        expect.any(Object)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ds%20with%20space'),
        expect.any(Object)
      )
    })
  })

  describe('deleteDataset', () => {
    it('deletes a dataset successfully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteDataset('test-namespace', 'test-dataset')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces/test-namespace/datasets/test-dataset'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('encodes dataset name for deletion', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteDataset('ns', 'dataset/name')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('dataset%2Fname'),
        expect.any(Object)
      )
    })
  })

  describe('deleteDatasetTag', () => {
    it('deletes a dataset tag successfully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteDatasetTag('test-namespace', 'test-dataset', 'test-tag')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/namespaces/test-namespace/datasets/test-dataset/tags/test-tag'
        ),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('encodes all parameters including tag', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteDatasetTag('ns/1', 'ds/1', 'tag with spaces')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ns%2F1'),
        expect.any(Object)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ds%2F1'),
        expect.any(Object)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('tag%20with%20spaces'),
        expect.any(Object)
      )
    })
  })

  describe('addDatasetTag', () => {
    it('adds a dataset tag successfully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addDatasetTag('test-namespace', 'test-dataset', 'test-tag')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/namespaces/test-namespace/datasets/test-dataset/tags/test-tag'
        ),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('encodes tag name with special characters', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addDatasetTag('ns', 'ds', 'pii:sensitive')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('pii%3Asensitive'),
        expect.any(Object)
      )
    })
  })

  describe('deleteDatasetFieldTag', () => {
    it('deletes a dataset field tag successfully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteDatasetFieldTag('test-namespace', 'test-dataset', 'field-name', 'test-tag')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/namespaces/test-namespace/datasets/test-dataset/fields/field-name/tags/test-tag'
        ),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('encodes field name with special characters', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteDatasetFieldTag('ns', 'ds', 'nested.field.name', 'tag')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('nested.field.name'),
        expect.any(Object)
      )
    })

    it('handles all encoded parameters', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteDatasetFieldTag('ns/1', 'ds/1', 'field/1', 'tag/1')

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('ns%2F1')
      expect(call).toContain('ds%2F1')
      expect(call).toContain('field%2F1')
      expect(call).toContain('tag%2F1')
    })
  })

  describe('addDatasetFieldTag', () => {
    it('adds a dataset field tag successfully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addDatasetFieldTag('test-namespace', 'test-dataset', 'field-name', 'test-tag')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/namespaces/test-namespace/datasets/test-dataset/fields/field-name/tags/test-tag'
        ),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('encodes all four parameters correctly', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addDatasetFieldTag('my ns', 'my ds', 'my field', 'my tag')

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('my%20ns')
      expect(call).toContain('my%20ds')
      expect(call).toContain('my%20field')
      expect(call).toContain('my%20tag')
    })
  })
})
