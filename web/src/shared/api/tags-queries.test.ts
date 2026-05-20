// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderQueryHook } from '@/test/query-helpers'

vi.mock('@/shared/api/tags-requests', () => ({
  getTags: vi.fn(),
  addTags: vi.fn(),
}))

import * as requests from '@/shared/api/tags-requests'
import { useAddTags, useTags } from './tags-queries'

beforeEach(() => vi.clearAllMocks())

describe('tags queries', () => {
  it('useTags fetches', async () => {
    vi.mocked(requests.getTags).mockResolvedValue({ tags: [] } as never)
    const { result } = renderQueryHook(() => useTags())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getTags).toHaveBeenCalled()
  })

  it('useAddTags mutates', async () => {
    vi.mocked(requests.addTags).mockResolvedValue({} as never)
    const { result } = renderQueryHook(() => useAddTags())
    result.current.mutate({ tag: 't', description: 'd' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.addTags).toHaveBeenCalledWith('t', 'd')
  })
})
