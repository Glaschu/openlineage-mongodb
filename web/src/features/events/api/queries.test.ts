// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderQueryHook } from '@/test/query-helpers'

vi.mock('@/features/events/api/requests', () => ({
  getEvents: vi.fn(),
}))

import * as requests from '@/features/events/api/requests'
import { useEvents } from './queries'

beforeEach(() => vi.clearAllMocks())

describe('events queries', () => {
  it('useEvents fetches', async () => {
    vi.mocked(requests.getEvents).mockResolvedValue({ events: [], totalCount: 0 } as never)
    const { result } = renderQueryHook(() => useEvents('a', 'b', 50, 0, 'asc'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getEvents).toHaveBeenCalledWith('a', 'b', 50, 0, 'asc')
  })

  it('useEvents has default args', async () => {
    vi.mocked(requests.getEvents).mockResolvedValue({ events: [], totalCount: 0 } as never)
    const { result } = renderQueryHook(() => useEvents())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getEvents).toHaveBeenCalledWith('', '', 100, 0, 'desc')
  })
})
