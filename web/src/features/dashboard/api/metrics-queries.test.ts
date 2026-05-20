// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderQueryHook } from '@/test/query-helpers'

vi.mock('@/features/dashboard/api/intervalMetrics-requests', () => ({
  getIntervalMetrics: vi.fn(),
}))
vi.mock('@/features/dashboard/api/lineageMetrics-requests', () => ({
  getLineageMetrics: vi.fn(),
}))

import * as intervals from '@/features/dashboard/api/intervalMetrics-requests'
import * as lineage from '@/features/dashboard/api/lineageMetrics-requests'
import { useIntervalMetrics, useLineageMetrics } from './metrics-queries'

describe('dashboard metrics queries', () => {
  it('useIntervalMetrics fetches', async () => {
    vi.mocked(intervals.getIntervalMetrics).mockResolvedValue([] as never)
    const { result } = renderQueryHook(() => useIntervalMetrics('jobs', 'day'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(intervals.getIntervalMetrics).toHaveBeenCalledWith({ asset: 'jobs', unit: 'day' })
  })

  it('useLineageMetrics fetches', async () => {
    vi.mocked(lineage.getLineageMetrics).mockResolvedValue([] as never)
    const { result } = renderQueryHook(() => useLineageMetrics('week'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lineage.getLineageMetrics).toHaveBeenCalledWith({ unit: 'week' })
  })
})
