// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderQueryHook } from '@/test/query-helpers'

vi.mock('@/features/datasets/api/requests', () => ({
  getDatasets: vi.fn(),
  getDataset: vi.fn(),
  getDatasetVersions: vi.fn(),
  deleteDataset: vi.fn(),
  addDatasetTag: vi.fn(),
  deleteDatasetTag: vi.fn(),
  addDatasetFieldTag: vi.fn(),
  deleteDatasetFieldTag: vi.fn(),
}))

import * as requests from '@/features/datasets/api/requests'
import {
  useAddDatasetFieldTag,
  useAddDatasetTag,
  useDataset,
  useDatasetVersions,
  useDatasets,
  useDeleteDataset,
  useDeleteDatasetFieldTag,
  useDeleteDatasetTag,
} from './queries'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('datasets queries', () => {
  it('useDatasets fetches when namespace provided', async () => {
    vi.mocked(requests.getDatasets).mockResolvedValue({ datasets: [], totalCount: 0 })
    const { result } = renderQueryHook(() => useDatasets('ns', 10, 0))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getDatasets).toHaveBeenCalledWith('ns', 10, 0)
  })

  it('useDatasets is disabled when namespace empty', () => {
    const { result } = renderQueryHook(() => useDatasets(''))
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useDataset fetches one', async () => {
    vi.mocked(requests.getDataset).mockResolvedValue({ name: 'd' } as never)
    const { result } = renderQueryHook(() => useDataset('ns', 'd'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getDataset).toHaveBeenCalledWith('ns', 'd')
  })

  it('useDataset respects enabled=false', () => {
    const { result } = renderQueryHook(() => useDataset('ns', 'd', false))
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useDatasetVersions fetches versions', async () => {
    vi.mocked(requests.getDatasetVersions).mockResolvedValue({ versions: [], totalCount: 0 })
    const { result } = renderQueryHook(() => useDatasetVersions('ns', 'd', 5, 0))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getDatasetVersions).toHaveBeenCalledWith('ns', 'd', 5, 0)
  })

  it.each([
    ['useDeleteDataset', useDeleteDataset, { namespace: 'ns', datasetName: 'd' }, requests.deleteDataset, ['ns', 'd']],
    ['useAddDatasetTag', useAddDatasetTag, { namespace: 'ns', datasetName: 'd', tag: 't' }, requests.addDatasetTag, ['ns', 'd', 't']],
    ['useDeleteDatasetTag', useDeleteDatasetTag, { namespace: 'ns', datasetName: 'd', tag: 't' }, requests.deleteDatasetTag, ['ns', 'd', 't']],
    ['useAddDatasetFieldTag', useAddDatasetFieldTag, { namespace: 'ns', datasetName: 'd', field: 'f', tag: 't' }, requests.addDatasetFieldTag, ['ns', 'd', 'f', 't']],
    ['useDeleteDatasetFieldTag', useDeleteDatasetFieldTag, { namespace: 'ns', datasetName: 'd', field: 'f', tag: 't' }, requests.deleteDatasetFieldTag, ['ns', 'd', 'f', 't']],
  ])('%s mutation invokes the request and invalidates', async (_, hook, vars, fn, args) => {
    vi.mocked(fn as never).mockResolvedValue({} as never)
    const { result } = renderQueryHook(() => hook())
    result.current.mutate(vars as never)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fn).toHaveBeenCalledWith(...args)
  })
})
