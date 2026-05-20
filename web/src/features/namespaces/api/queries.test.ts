// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderQueryHook } from '@/test/query-helpers'

vi.mock('@/features/namespaces/api/requests', () => ({
  getNamespaces: vi.fn(),
}))

import * as requests from '@/features/namespaces/api/requests'
import { useNamespaces } from './queries'

describe('namespaces queries', () => {
  it('useNamespaces fetches', async () => {
    vi.mocked(requests.getNamespaces).mockResolvedValue({ namespaces: [] } as never)
    const { result } = renderQueryHook(() => useNamespaces())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getNamespaces).toHaveBeenCalled()
  })
})
