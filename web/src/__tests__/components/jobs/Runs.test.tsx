// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ThemeProvider, createTheme } from '@mui/material/styles'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../helpers/testUtils'
import Runs from '../../../components/jobs/Runs'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as useJobsHook from '../../../queries/jobs'

// Mocks
vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid={`tooltip-${title}`}>{children}</div>
  ),
}))

vi.mock('../../../components/core/code/MqCode', () => ({
  __esModule: true,
  default: ({ code }: { code: string }) => <div data-testid='mq-code'>{code}</div>,
}))

vi.mock('../../../components/core/copy/MqCopy', () => ({
  __esModule: true,
  default: ({ string }: { string: string }) => <button data-testid={`copy-${string}`}>Copy</button>,
}))

vi.mock('../../../components/core/empty/MqEmpty', () => ({
  __esModule: true,
  default: ({ title, body }: { title: string; body: string }) => (
    <div data-testid='mq-empty'>
      <div>{title}</div>
      <div>{body}</div>
    </div>
  ),
}))

vi.mock('../../../components/paging/MqPaging', () => ({
  __esModule: true,
  default: ({
    pageSize,
    currentPage,
    totalCount,
    incrementPage,
    decrementPage,
  }: {
    pageSize: number
    currentPage: number
    totalCount: number
    incrementPage: () => void
    decrementPage: () => void
  }) => (
    <div data-testid='mq-paging'>
      <span>
        Page {currentPage} of {Math.ceil(totalCount / pageSize)}
      </span>
      <button onClick={decrementPage}>Prev</button>
      <button onClick={incrementPage}>Next</button>
    </div>
  ),
}))

vi.mock('../../../components/core/status/MqStatus', () => ({
  __esModule: true,
  default: ({ label, color }: { label: string; color: string }) => (
    <div data-testid={`mq-status-${label}`} data-color={color}>
      {label}
    </div>
  ),
}))

vi.mock('../../../components/jobs/RunInfo', () => ({
  __esModule: true,
  default: ({ run }: { run: any }) => <div data-testid='run-info'>Run Info for {run.id}</div>,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const renderRuns = (runs = [], isLoading = false, totalCount = 0) => {
  vi.spyOn(useJobsHook, 'useJobRuns').mockReturnValue({
    data: { runs, totalCount },
    isLoading,
    isPending: isLoading,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as any)

  return renderWithProviders(
    <ThemeProvider theme={createTheme()}>
      <Runs jobName='daily-job' jobNamespace='analytics' />
    </ThemeProvider>
  )
}

describe('Runs Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show empty state when no runs', () => {
    renderRuns([], false, 0)
    expect(screen.getByTestId('mq-empty')).toBeInTheDocument()
  })

  it('should show loading spinner when runsLoading is true', () => {
    renderRuns([], true, 0)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should render runs table with data', () => {
    const runs = [
      {
        id: 'run-1',
        state: 'COMPLETED',
        createdAt: '2024-01-01T00:00:00Z',
        startedAt: '2024-01-01T00:00:00Z',
        endedAt: '2024-01-01T00:00:10Z',
        durationMs: 10000,
      },
    ] as any

    renderRuns(runs, false, 1)
    expect(screen.getByText('runs_columns.id')).toBeInTheDocument()
    expect(screen.getByText('runs_columns.state')).toBeInTheDocument()
    expect(screen.getByTestId('mq-status-COMPLETED')).toBeInTheDocument()
  })

  it('should switch to RunInfo view when run is clicked', () => {
    const runs = [
      {
        id: 'run-1',
        state: 'COMPLETED',
        createdAt: '2024-01-01T00:00:00Z',
        startedAt: '2024-01-01T00:00:00Z',
        endedAt: '2024-01-01T00:00:10Z',
        durationMs: 10000,
      },
    ] as any

    renderRuns(runs, false, 1)

    // Click on row (or status)
    fireEvent.click(screen.getByTestId('mq-status-COMPLETED').closest('tr')!)

    expect(screen.getByTestId('run-info')).toBeInTheDocument()
    expect(screen.getByText('Run Info for run-1')).toBeInTheDocument()
  })

  it('should show back button when in RunInfo view', () => {
    const runs = [
      {
        id: 'run-1',
        state: 'COMPLETED',
        createdAt: '',
        startedAt: '',
        endedAt: '',
        durationMs: 0,
      },
    ] as any

    renderRuns(runs, false, 1)
    fireEvent.click(screen.getByTestId('mq-status-COMPLETED').closest('tr')!)

    const backButton = screen.getByRole('button') // The IconButton
    expect(backButton).toBeInTheDocument()

    // Click back
    fireEvent.click(backButton)
    expect(screen.queryByTestId('run-info')).not.toBeInTheDocument()
    expect(screen.getByText('runs_columns.id')).toBeInTheDocument()
  })
})
