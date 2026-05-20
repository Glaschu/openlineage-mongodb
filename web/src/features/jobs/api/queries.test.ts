// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderQueryHook } from '@/test/query-helpers'

vi.mock('@/features/jobs/api/requests', () => ({
  getJobs: vi.fn(),
  getJob: vi.fn(),
  getRuns: vi.fn(),
  deleteJob: vi.fn(),
  addJobTag: vi.fn(),
  deleteJobTag: vi.fn(),
}))

import * as requests from '@/features/jobs/api/requests'
import {
  useAddJobTag,
  useDeleteJob,
  useDeleteJobTag,
  useJob,
  useJobRuns,
  useJobs,
} from './queries'

beforeEach(() => vi.clearAllMocks())

describe('jobs queries', () => {
  it('useJobs fetches', async () => {
    vi.mocked(requests.getJobs).mockResolvedValue({ jobs: [], totalCount: 0 } as never)
    const { result } = renderQueryHook(() => useJobs('ns'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getJobs).toHaveBeenCalled()
  })

  it('useJob fetches one', async () => {
    vi.mocked(requests.getJob).mockResolvedValue({ name: 'j' } as never)
    const { result } = renderQueryHook(() => useJob('ns', 'j'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getJob).toHaveBeenCalledWith('ns', 'j')
  })

  it('useJob disabled without args', () => {
    const { result } = renderQueryHook(() => useJob('', ''))
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useJobRuns fetches runs', async () => {
    vi.mocked(requests.getRuns).mockResolvedValue({ runs: [], totalCount: 0 } as never)
    const { result } = renderQueryHook(() => useJobRuns('ns', 'j', 10, 0))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests.getRuns).toHaveBeenCalledWith('j', 'ns', 10, 0)
  })

  it.each([
    ['useDeleteJob', useDeleteJob, { namespace: 'ns', jobName: 'j' }, requests.deleteJob, ['ns', 'j']],
    ['useAddJobTag', useAddJobTag, { namespace: 'ns', jobName: 'j', tag: 't' }, requests.addJobTag, ['ns', 'j', 't']],
    ['useDeleteJobTag', useDeleteJobTag, { namespace: 'ns', jobName: 'j', tag: 't' }, requests.deleteJobTag, ['ns', 'j', 't']],
  ])('%s mutates and invalidates', async (_, hook, vars, fn, args) => {
    vi.mocked(fn as never).mockResolvedValue({} as never)
    const { result } = renderQueryHook(() => hook())
    result.current.mutate(vars as never)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fn).toHaveBeenCalledWith(...args)
  })
})
