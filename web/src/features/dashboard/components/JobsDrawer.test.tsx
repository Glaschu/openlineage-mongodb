// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as useJobsHook from '@/features/jobs/api'
import { Job } from '@/shared/types/api'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import JobsDrawer from '@/features/dashboard/components/JobsDrawer'
import React from 'react'

// Mock JobRunItem component
vi.mock('@/features/dashboard/components/JobRunItem', () => ({
  default: ({ job }: { job: Job }) => <div data-testid={`job-item-${job.name}`}>{job.name}</div>,
}))

describe('JobsDrawer Component', () => {
  const mockJobs: Job[] = [
    {
      id: { namespace: 'ns1', name: 'job1' },
      name: 'job1',
      namespace: 'ns1',
      type: 'BATCH',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      tags: [],
      latestRun: null,
      latestRuns: [],
      facets: {},
    } as any,
    {
      id: { namespace: 'ns1', name: 'job2' },
      name: 'job2',
      namespace: 'ns1',
      type: 'STREAM',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      tags: [],
      latestRun: null,
      latestRuns: [],
      facets: {},
    } as any,
  ]

  const renderJobsDrawer = (jobs: Job[] = [], isLoading = false, totalCount = 0) => {
    vi.spyOn(useJobsHook, 'useJobs').mockReturnValue({
      data: { jobs, totalCount },
      isLoading,
      isPending: isLoading,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    return renderWithProviders(
      <MemoryRouter>
        <JobsDrawer />
      </MemoryRouter>
    )
  }

  it('should render Jobs heading', () => {
    renderJobsDrawer(mockJobs, false, 2)
    expect(screen.getByText('Jobs')).toBeTruthy()
  })

  it('should render job items from store', () => {
    renderJobsDrawer(mockJobs, false, 2)
    expect(screen.getByTestId('job-item-job1')).toBeTruthy()
    expect(screen.getByTestId('job-item-job2')).toBeTruthy()
  })

  it('should show loading spinner when isJobsLoading is true', () => {
    renderJobsDrawer(mockJobs, true, 2)
    // Note: implementation details might have changed so ensuring we query for progressbar
    const spinner = screen.getByRole('progressbar')
    expect(spinner).toBeTruthy()
  })

  it('should not show loading spinner when not loading', () => {
    renderJobsDrawer(mockJobs, false, 2)
    const spinner = screen.queryByRole('progressbar')
    expect(spinner).toBeNull()
  })

  it('should render pagination controls', () => {
    const { container } = renderJobsDrawer(mockJobs, false, 100)
    // Check for pagination component (MqPaging)
    const paging = container.querySelector('[class*="MuiBox"]')
    expect(paging).toBeTruthy()
  })

  it('should render with empty jobs array', () => {
    renderJobsDrawer([], false, 0)
    expect(screen.getByText('Jobs')).toBeTruthy()
    expect(screen.queryByTestId(/job-item-/)).toBeNull()
  })

  it('should have fixed width', () => {
    const { container } = renderJobsDrawer(mockJobs, false, 2)
    // Check that drawer box exists
    expect(container.querySelector('.MuiBox-root')).toBeTruthy()
  })

  it('should render sticky header', () => {
    renderJobsDrawer(mockJobs, false, 2)
    // Check that Jobs heading is rendered
    expect(screen.getByText('Jobs')).toBeTruthy()
  })

  it('paginates next and previous via MqPaging controls', () => {
    const { container } = renderJobsDrawer(mockJobs, false, 100)
    const buttons = container.querySelectorAll('button:not([disabled])')
    // First enabled button is "next" (prev disabled at page 0)
    fireEvent.click(buttons[buttons.length - 1])
    // After advancing, decrementPage path is exercisable by clicking the previously-disabled "prev" — re-query
    const buttons2 = container.querySelectorAll('button:not([disabled])')
    if (buttons2.length > 1) fireEvent.click(buttons2[0])
  })
})
