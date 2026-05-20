// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderQueryHook } from '@/test/query-helpers'

vi.mock('@/features/jobs/api/facets-requests', () => ({
  getRunFacets: vi.fn(),
  getJobFacets: vi.fn(),
}))

import * as requests from '@/features/jobs/api/facets-requests'
import { useJobFacets, useRunFacets } from './facets-queries'

beforeEach(() => vi.clearAllMocks())

describe('jobs facets queries', () => {
  it('useRunFacets fetches when runId set', async () => {
    vi.mocked(requests.getRunFacets).mockResolvedValue({} as never)
    const { result } = renderQueryHook(() => useRunFacets('r1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getRunFacets).toHaveBeenCalledWith('r1')
  })

  it('useRunFacets disabled with empty runId', () => {
    const { result } = renderQueryHook(() => useRunFacets(''))
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useJobFacets fetches when runId set', async () => {
    vi.mocked(requests.getJobFacets).mockResolvedValue({} as never)
    const { result } = renderQueryHook(() => useJobFacets('r1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getJobFacets).toHaveBeenCalledWith('r1')
  })

  it('useJobFacets disabled with empty runId', () => {
    const { result } = renderQueryHook(() => useJobFacets(''))
    expect(result.current.fetchStatus).toBe('idle')
  })
})
