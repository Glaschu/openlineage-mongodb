// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { renderQueryHook } from '@/test/query-helpers'
import { waitFor } from '@testing-library/react'

vi.mock('@/features/lineage/api/lineage-requests', () => ({
  getLineage: vi.fn(),
}))

import * as requests from '@/features/lineage/api/lineage-requests'
import { useLineage } from './lineage-queries'

describe('lineage queries', () => {
  it('useLineage fetches with all args', async () => {
    vi.mocked(requests.getLineage).mockResolvedValue({ graph: [] } as never)
    const { result } = renderQueryHook(() => useLineage('JOB', 'ns', 'n', 3, true))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getLineage).toHaveBeenCalledWith('JOB', 'ns', 'n', 3, true)
  })
})
