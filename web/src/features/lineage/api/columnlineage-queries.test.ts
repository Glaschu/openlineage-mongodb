// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderQueryHook } from '@/test/query-helpers'

vi.mock('@/features/lineage/api/columnlineage-requests', () => ({
  getColumnLineage: vi.fn(),
}))

import * as requests from '@/features/lineage/api/columnlineage-requests'
import { useColumnLineage } from './columnlineage-queries'

describe('columnlineage queries', () => {
  it('useColumnLineage fetches', async () => {
    vi.mocked(requests.getColumnLineage).mockResolvedValue({ graph: [] } as never)
    const { result } = renderQueryHook(() => useColumnLineage('DATASET', 'ns', 'n', 2))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getColumnLineage).toHaveBeenCalledWith('DATASET', 'ns', 'n', 2)
  })
})
