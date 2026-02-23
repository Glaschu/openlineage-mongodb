// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../helpers/testUtils'
import JobDetailPage from '../../../components/jobs/JobDetailPage'
import type { LineageJob } from '../../../types/lineage'
import type { Run } from '../../../types/api'
import * as useJobsHook from '../../../queries/jobs'

// Mocks
const {
  setTabIndexMock,
  dialogToggleMock,
  deleteJobMock,
  formatUpdatedAtMock,
  runStateColorMock,
  stopWatchDurationMock,
  truncateTextMock,
  navigateMock,
  setSearchParamsMock,
} = vi.hoisted(() => {
  return {
    setTabIndexMock: vi.fn((index: number) => ({ type: 'SET_TAB_INDEX', payload: index })),
    dialogToggleMock: vi.fn((field: string) => ({ type: 'DIALOG_TOGGLE', payload: field })),
    deleteJobMock: vi.fn(), // Hook mutation result
    formatUpdatedAtMock: vi.fn((value: string) => `formatted(${value})`),
    runStateColorMock: vi.fn((state: string) => `color(${state})`),
    stopWatchDurationMock: vi.fn((duration: number) => `duration(${duration})`),
    truncateTextMock: vi.fn((text: string, max: number) => `${text.slice(0, max)}::${max}`),
    navigateMock: vi.fn(),
    setSearchParamsMock: vi.fn(),
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams(), setSearchParamsMock] as const,
  }
})

vi.mock('../../../store/slices/displaySlice', () => ({
  dialogToggle: (...args: any[]) => dialogToggleMock(...args),
}))

vi.mock('../../../store/slices/lineageSlice', () => ({
  setTabIndex: (...args: any[]) => setTabIndexMock(...args),
}))

vi.mock('../../../helpers', () => ({
  formatUpdatedAt: (...args: any[]) => formatUpdatedAtMock(...args),
}))

vi.mock('../../../helpers/nodes', () => ({
  runStateColor: (...args: any[]) => runStateColorMock(...args),
}))

vi.mock('../../../helpers/time', () => ({
  stopWatchDuration: (...args: any[]) => stopWatchDurationMock(...args),
}))

vi.mock('../../../helpers/text', () => ({
  truncateText: (...args: any[]) => truncateTextMock(...args),
}))

vi.mock('@mui/x-date-pickers', () => ({
  CalendarIcon: ({ children }: { children?: React.ReactNode }) => (
    <span data-testid='calendar-icon'>{children}</span>
  ),
}))

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ title }: { title?: string }) => <span data-testid='fa-icon'>{title}</span>,
}))

vi.mock('@fortawesome/free-solid-svg-icons/faCog', () => ({
  faCog: 'fa-cog-icon',
}))

vi.mock('../../../components/Dialog', () => ({
  __esModule: true,
  default: ({
    dialogIsOpen,
    dialogToggle,
    ignoreWarning,
    title,
  }: {
    dialogIsOpen: boolean
    dialogToggle: (field: string) => void
    ignoreWarning: () => void
    title: string
  }) => (
    <div data-testid='dialog' data-open={dialogIsOpen} data-title={title}>
      <button type='button' onClick={() => dialogToggle('toggle')} data-testid='dialog-toggle'>
        toggle
      </button>
      <button type='button' onClick={ignoreWarning} data-testid='dialog-confirm'>
        confirm
      </button>
    </div>
  ),
}))

vi.mock('../../../components/jobs/JobTags', () => ({
  __esModule: true,
  default: ({ jobTags }: { jobTags: string[] }) => (
    <div data-testid='job-tags'>{JSON.stringify(jobTags)}</div>
  ),
}))

vi.mock('../../../components/jobs/RunInfo', () => ({
  __esModule: true,
  default: ({ run }: { run: Run }) => (
    <div data-testid='run-info'>{run.id}</div>
  ),
}))

vi.mock('../../../components/jobs/Runs', () => ({
  __esModule: true,
  default: ({ jobName, jobNamespace }: { jobName: string; jobNamespace: string }) => (
    <div data-testid='runs'>{`${jobNamespace}/${jobName}`}</div>
  ),
}))

vi.mock('../../../components/core/info/MqInfo', () => ({
  __esModule: true,
  MqInfo: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div data-testid={`mq-info-${label}`}>{value}</div>
  ),
}))

vi.mock('../../../components/core/text/MqText', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('../../../components/core/status/MqStatus', () => ({
  __esModule: true,
  default: ({ label, color }: { label: string; color?: string }) => (
    <span data-testid='mq-status' data-color={color}>
      {label}
    </span>
  ),
}))

vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ children, title }: { children: React.ReactNode; title: React.ReactNode }) => (
    <div data-testid={title === 'Refresh' ? 'tooltip-Refresh' : undefined}>{children}</div>
  ),
}))

vi.mock('../../../components/core/empty/MqEmpty', () => ({
  __esModule: true,
  default: ({ title, body }: { title?: React.ReactNode; body?: React.ReactNode }) => (
    <div data-testid='mq-empty'>
      <div>{title}</div>
      <div>{body}</div>
    </div>
  ),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn()
  }
}))

const renderJobDetailPage = (
  jobData: any = null,
  isLoading = false,
  initialState = {} as any
) => {
  // Mock hooks
  vi.spyOn(useJobsHook, 'useJob').mockReturnValue({
    data: jobData,
    isLoading,
    isPending: isLoading,
    isError: false,
    error: null,
    refetch: vi.fn()
  } as any)

  vi.spyOn(useJobsHook, 'useDeleteJob').mockReturnValue({
    mutate: deleteJobMock,
    isPending: false,
    isError: false,
    error: null,
  } as any)

  const lineageJob = {
    namespace: 'analytics',
    name: 'ExampleJob',
    type: 'BATCH',
    id: { namespace: 'analytics', name: 'ExampleJob' },
  } as LineageJob

  return renderWithProviders(
    <ThemeProvider theme={createTheme()}>
      <MemoryRouter>
        <JobDetailPage lineageJob={lineageJob} />
      </MemoryRouter>
    </ThemeProvider>,
    {
      initialState: {
        display: { dialogIsOpen: false },
        jobs: { deletedJobName: null },
        lineage: { tabIndex: 0 },
        ...initialState,
      }
    }
  )
}

describe('JobDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading state', () => {
    renderJobDetailPage(null, true)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders job detail, handles interactions, and cleans up', () => {
    const job = {
      name: 'ExampleJob',
      namespace: 'analytics',
      description: 'A job description',
      type: 'BATCH',
      location: 'https://example.com/job',
      latestRun: {
        id: 'run-0',
        state: 'COMPLETED',
        startedAt: '2024-01-03T00:00:00Z',
        endedAt: '2024-01-03T01:00:00Z',
        durationMs: 90000,
      },
      latestRuns: [],
      tags: ['alpha', 'beta'],
      parentJobName: 'ParentJob',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
    }

    const { unmount } = renderJobDetailPage(job)

    expect(screen.getByText((content) => content.includes('ExampleJob'))).toBeInTheDocument()
    expect(runStateColorMock).toHaveBeenCalledWith('COMPLETED')

    // Delete flow
    const deleteButton = screen.getByRole('button', { name: 'jobs.dialog_delete' })
    fireEvent.click(deleteButton)
    expect(dialogToggleMock).toHaveBeenCalledWith('')

    const confirmButton = screen.getByTestId('dialog-confirm')
    fireEvent.click(confirmButton)
    expect(deleteJobMock).toHaveBeenCalledWith(
      { jobName: 'ExampleJob', namespace: 'analytics' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )

    const closeIcon = screen.queryByTestId('CloseIcon') // MUI CloseIcon likely has this test ID if rendered, or we can check what MUI stub renders
    if (closeIcon) {
      fireEvent.click(closeIcon.closest('button')!)
      expect(setSearchParamsMock).toHaveBeenCalledWith({})
    }

    expect(screen.getByTestId('run-info')).toHaveTextContent('run-0')

    unmount()
    expect(setTabIndexMock).toHaveBeenCalledWith(0)
  })

  it('renders empty state when latest run is missing', () => {
    const job = {
      name: 'NoRunJob',
      namespace: 'analytics',
      latestRun: null,
      latestRuns: [],
      tags: [],
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-06T00:00:00Z',
    }

    renderJobDetailPage(job)

    expect(screen.getByTestId('mq-empty')).toBeInTheDocument()
  })

  it('renders history tab content when tab index is one and navigates on delete', () => {
    const job = {
      name: 'HistoryJob',
      namespace: 'analytics',
    }

    // Setup render with tab index 1 to check history tab
    renderJobDetailPage(job, false, {
      lineage: { tabIndex: 1 }
    })
    expect(screen.getByTestId('runs')).toHaveTextContent('analytics/HistoryJob')

    // Now test navigation on delete
    // Trigger the delete flow
    const deleteButton = screen.getByRole('button', { name: 'jobs.dialog_delete' })
    fireEvent.click(deleteButton)
    fireEvent.click(screen.getByTestId('dialog-confirm'))

    // Check mutation call and trigger onSuccess
    const mutationCall = deleteJobMock.mock.calls[0]
    expect(mutationCall[0]).toEqual({ jobName: 'HistoryJob', namespace: 'analytics' })
    expect(mutationCall[1]).toHaveProperty('onSuccess')

    mutationCall[1].onSuccess()
    expect(navigateMock).toHaveBeenCalledWith('/')
  })
})
