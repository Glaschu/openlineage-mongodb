// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderQueryHook } from '@/test/query-helpers'

vi.mock('@/features/alation/api/requests', () => ({
  getAlationMappings: vi.fn(),
  acceptAlationMapping: vi.fn(),
  rejectAlationMapping: vi.fn(),
  suggestAlationMappings: vi.fn(),
}))

import * as requests from '@/features/alation/api/requests'
import {
  useAcceptMapping,
  useAlationMappings,
  useRejectMapping,
  useSuggestMappings,
} from './queries'

beforeEach(() => vi.clearAllMocks())

describe('alation queries', () => {
  it('useAlationMappings fetches', async () => {
    vi.mocked(requests.getAlationMappings).mockResolvedValue([] as never)
    const { result } = renderQueryHook(() => useAlationMappings('ns', 'SUGGESTED'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getAlationMappings).toHaveBeenCalledWith('ns', 'SUGGESTED')
  })

  it('useAcceptMapping mutates', async () => {
    vi.mocked(requests.acceptAlationMapping).mockResolvedValue({} as never)
    const { result } = renderQueryHook(() => useAcceptMapping())
    result.current.mutate('1' as never)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(requests.acceptAlationMapping).mock.calls[0][0]).toBe('1')
  })

  it('useRejectMapping mutates', async () => {
    vi.mocked(requests.rejectAlationMapping).mockResolvedValue({} as never)
    const { result } = renderQueryHook(() => useRejectMapping())
    result.current.mutate('2' as never)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(requests.rejectAlationMapping).mock.calls[0][0]).toBe('2')
  })

  it('useSuggestMappings mutates', async () => {
    vi.mocked(requests.suggestAlationMappings).mockResolvedValue({} as never)
    const { result } = renderQueryHook(() => useSuggestMappings())
    result.current.mutate({ namespace: 'ns', schemaId: 7 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.suggestAlationMappings).toHaveBeenCalledWith('ns', 7)
  })
})
