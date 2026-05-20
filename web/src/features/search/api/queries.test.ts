// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderQueryHook } from '@/test/query-helpers'

vi.mock('@/features/search/api/requests', () => ({
  getSearch: vi.fn(),
  getOpenSearchJobs: vi.fn(),
  getOpenSearchDatasets: vi.fn(),
}))

import * as requests from '@/features/search/api/requests'
import { useOpenSearchDatasets, useOpenSearchJobs, useSearch } from './queries'

beforeEach(() => vi.clearAllMocks())

describe('search queries', () => {
  it('useSearch groups results by namespace:name', async () => {
    vi.mocked(requests.getSearch).mockResolvedValue({
      results: [
        { namespace: 'ns1', name: 'a', type: 'DATASET' },
        { namespace: 'ns1', name: 'a', type: 'DATASET' },
        { namespace: 'ns2', name: 'b', type: 'JOB' },
      ],
    } as never)
    const { result } = renderQueryHook(() => useSearch('q', 'ALL', 'NAME', 10))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.results.get('ns1:a')).toHaveLength(2)
    expect(result.current.data?.results.get('ns2:b')).toHaveLength(1)
    expect(result.current.data?.rawResults).toHaveLength(3)
  })

  it('useSearch disabled on empty query', () => {
    const { result } = renderQueryHook(() => useSearch(''))
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useOpenSearchJobs fetches when query present', async () => {
    vi.mocked(requests.getOpenSearchJobs).mockResolvedValue({ hits: [] } as never)
    const { result } = renderQueryHook(() => useOpenSearchJobs('q'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getOpenSearchJobs).toHaveBeenCalledWith('q')
  })

  it('useOpenSearchJobs disabled on empty', () => {
    const { result } = renderQueryHook(() => useOpenSearchJobs(''))
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useOpenSearchDatasets fetches when query present', async () => {
    vi.mocked(requests.getOpenSearchDatasets).mockResolvedValue({ hits: [] } as never)
    const { result } = renderQueryHook(() => useOpenSearchDatasets('q'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getOpenSearchDatasets).toHaveBeenCalledWith('q')
  })

  it('useOpenSearchDatasets disabled on empty', () => {
    const { result } = renderQueryHook(() => useOpenSearchDatasets(''))
    expect(result.current.fetchStatus).toBe('idle')
  })
})
