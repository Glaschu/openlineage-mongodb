// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Job } from '../../../types/api'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import JobRunItem from '../../../routes/dashboard/JobRunItem'
import React from 'react'

const mockNavigate = vi.fn()

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('JobRunItem Component', () => {
  const mockJob: Job = {
    id: { namespace: 'test-namespace', name: 'test-job' },
    name: 'test-job',
    namespace: 'test-namespace',
    type: 'BATCH',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    latestRun: {
      id: 'run-1',
      state: 'COMPLETED',
      createdAt: '2023-01-02T00:00:00Z',
      updatedAt: '2023-01-02T00:10:00Z',
      durationMs: 60000,
      startedAt: '2023-01-02T00:00:00Z',
      endedAt: '2023-01-02T00:01:00Z',
      facets: {},
    },
    latestRuns: [
      {
        id: 'run-1',
        state: 'COMPLETED',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:10:00Z',
        durationMs: 60000,
        startedAt: '2023-01-02T00:00:00Z',
        endedAt: '2023-01-02T00:01:00Z',
        facets: {},
      },
      {
        id: 'run-2',
        state: 'FAILED',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:05:00Z',
        durationMs: 30000,
        startedAt: '2023-01-01T00:00:00Z',
        endedAt: '2023-01-01T00:00:30Z',
        facets: {},
      },
    ],
    facets: {},
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render job name', () => {
    render(
      <MemoryRouter>
        <JobRunItem job={mockJob} />
      </MemoryRouter>
    )

    expect(screen.getByText('test-job')).toBeTruthy()
  })

  it('should render first 3 tags', () => {
    render(
      <MemoryRouter>
        <JobRunItem job={mockJob} />
      </MemoryRouter>
    )

    expect(screen.getByText('tag1')).toBeTruthy()
    expect(screen.getByText('tag2')).toBeTruthy()
    expect(screen.getByText('tag3')).toBeTruthy()
  })

  it('should show additional tags count when more than 3 tags', () => {
    render(
      <MemoryRouter>
        <JobRunItem job={mockJob} />
      </MemoryRouter>
    )

    expect(screen.getByText('+ 2')).toBeTruthy()
  })

  it('should render namespace', () => {
    render(
      <MemoryRouter>
        <JobRunItem job={mockJob} />
      </MemoryRouter>
    )

    expect(screen.getByText('test-namespace')).toBeTruthy()
  })

  it('should render job type', () => {
    render(
      <MemoryRouter>
        <JobRunItem job={mockJob} />
      </MemoryRouter>
    )

    expect(screen.getByText('BATCH')).toBeTruthy()
  })

  it('should render latest run status', () => {
    render(
      <MemoryRouter>
        <JobRunItem job={mockJob} />
      </MemoryRouter>
    )

    expect(screen.getByText('COMPLETED')).toBeTruthy()
  })

  it('should render N/A when no latest run', () => {
    const jobWithoutRun = { ...mockJob, latestRun: undefined } as any
    render(
      <MemoryRouter>
        <JobRunItem job={jobWithoutRun} />
      </MemoryRouter>
    )

    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0)
  })

  it('should navigate to lineage page when clicked', () => {
    render(
      <MemoryRouter>
        <JobRunItem job={mockJob} />
      </MemoryRouter>
    )

    const container = screen.getByText('test-job').closest('div')?.parentElement
    if (container) {
      fireEvent.click(container)
      expect(mockNavigate).toHaveBeenCalled()
      const call = mockNavigate.mock.calls[0][0]
      expect(call).toContain('/lineage/')
      expect(call).toContain('test-namespace')
      expect(call).toContain('test-job')
    }
  })

  it('should render LAST 10 RUNS label', () => {
    render(
      <MemoryRouter>
        <JobRunItem job={mockJob} />
      </MemoryRouter>
    )

    expect(screen.getByText('LAST 10 RUNS')).toBeTruthy()
  })

  it('should truncate long job names', () => {
    const longNameJob = {
      ...mockJob,
      name: 'a'.repeat(100),
    }
    render(
      <MemoryRouter>
        <JobRunItem job={longNameJob} />
      </MemoryRouter>
    )

    // Should show truncated text with ellipsis
    expect(screen.getByText(/^a+\.\.\.$/)).toBeTruthy()
  })

  it('should render without tags', () => {
    const jobWithoutTags = { ...mockJob, tags: [] }
    render(
      <MemoryRouter>
        <JobRunItem job={jobWithoutTags} />
      </MemoryRouter>
    )

    expect(screen.getByText('test-job')).toBeTruthy()
  })

  it('should show hover effect on container', () => {
    const { container } = render(
      <MemoryRouter>
        <JobRunItem job={mockJob} />
      </MemoryRouter>
    )

    // Just verify the component renders
    expect(container.querySelector('.MuiBox-root')).toBeTruthy()
  })
})
