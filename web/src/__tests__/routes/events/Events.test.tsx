// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'

import Events from '../../../routes/events/Events'
import type { Event } from '../../../types/api'
import { renderWithProviders } from '../../../helpers/testUtils'
import * as useEventsHook from '../../../queries/events'

const {
  resetEventsMock,
  formatDateAPIQueryMock,
  formatDatePickerMock,
  formatUpdatedAtMock,
  truncateTextMock,
  eventTypeColorMock,
  fileSizeMock,
  saveAsMock,
  searchParamsState,
  setSearchParamsMock,
  searchParamsProxy,
  datePickerHandlers,
} = vi.hoisted(() => {
  const resetEventsMock = vi.fn(() => ({ type: 'RESET_EVENTS' }))
  const formatDateAPIQueryMock = vi.fn((value: unknown) => `api(${String(value)})`)
  const formatDatePickerMock = vi.fn((value: unknown) => `picker(${String(value)})`)
  const formatUpdatedAtMock = vi.fn((value: string) => `updated(${value})`)
  const truncateTextMock = vi.fn((value: string) => value)
  const eventTypeColorMock = vi.fn(() => '#123456')
  const fileSizeMock = vi.fn((data: string) => {
    try {
      const parsed = JSON.parse(data)
      const runId: string = parsed?.run?.runId ?? ''
      const kiloBytes = runId.includes('large') ? 600 : 10
      return { kiloBytes, megaBytes: kiloBytes / 1024 }
    } catch {
      return { kiloBytes: 10, megaBytes: 10 / 1024 }
    }
  })
  const saveAsMock = vi.fn()

  const searchParamsState = {
    params: new URLSearchParams(),
    setInitial(entries?: Record<string, string>) {
      this.params = new URLSearchParams(entries ? Object.entries(entries) : [])
    },
  }

  const setSearchParamsMock = vi.fn((next: Record<string, string>) => {
    searchParamsState.params = new URLSearchParams(Object.entries(next))
  })

  const searchParamsProxy = {
    get: (key: string) => searchParamsState.params.get(key),
    forEach: (callback: (value: string, key: string) => void) =>
      searchParamsState.params.forEach((value, key) => callback(value, key)),
  } as unknown as URLSearchParams

  const datePickerHandlers: Record<string, (pickerEvent: { toDate: () => unknown }) => void> = {}

  return {
    resetEventsMock,
    formatDateAPIQueryMock,
    formatDatePickerMock,
    formatUpdatedAtMock,
    truncateTextMock,
    eventTypeColorMock,
    fileSizeMock,
    saveAsMock,
    searchParamsState,
    setSearchParamsMock,
    searchParamsProxy,
    datePickerHandlers,
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useSearchParams: () => [searchParamsProxy, setSearchParamsMock] as const,
  }
})

vi.mock('../../../store/actionCreators', () => ({
  resetEvents: () => resetEventsMock(),
}))

vi.mock('../../../helpers', () => ({
  formatUpdatedAt: (...args: Parameters<typeof formatUpdatedAtMock>) =>
    formatUpdatedAtMock(...args),
  fileSize: (...args: Parameters<typeof fileSizeMock>) => fileSizeMock(...args),
}))

vi.mock('../../../helpers/time', () => ({
  formatDateAPIQuery: (...args: Parameters<typeof formatDateAPIQueryMock>) =>
    formatDateAPIQueryMock(...args),
  formatDatePicker: (...args: Parameters<typeof formatDatePickerMock>) =>
    formatDatePickerMock(...args),
}))

vi.mock('../../../helpers/text', () => ({
  truncateText: (...args: Parameters<typeof truncateTextMock>) => truncateTextMock(...args),
}))

vi.mock('../../../helpers/nodes', () => ({
  eventTypeColor: (...args: Parameters<typeof eventTypeColorMock>) => eventTypeColorMock(...args),
}))

vi.mock('file-saver', () => ({
  saveAs: (...args: Parameters<typeof saveAsMock>) => saveAsMock(...args),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../../components/core/screen-load/MqScreenLoad', () => ({
  MqScreenLoad: ({ loading, children }: { loading: boolean; children: React.ReactElement }) => (
    <div data-testid='screen-load' data-loading={loading}>
      {children}
    </div>
  ),
}))

vi.mock('../../../components/core/text/MqText', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('../../../components/core/status/MqStatus', () => ({
  __esModule: true,
  default: ({ label }: { label: string }) => <span data-testid='mq-status'>{label}</span>,
}))

vi.mock('../../../components/core/copy/MqCopy', () => ({
  __esModule: true,
  default: ({ string }: { string: string }) => <span data-testid={`copy-${string}`}>copy</span>,
}))

vi.mock('../../../components/core/date-picker/MqDatePicker', () => ({
  __esModule: true,
  default: ({ label, value, onChange }: { label: string; value: string; onChange: (arg: any) => void }) => {
    datePickerHandlers[label] = onChange
    return (
      <div data-testid={`date-picker-${label}`}>date-picker-{label}-{value}</div>
    )
  },
}))

vi.mock('../../../components/paging/MqPaging', () => ({
  __esModule: true,
  default: ({
    currentPage,
    incrementPage,
    decrementPage,
  }: {
    currentPage: number
    incrementPage: () => void
    decrementPage: () => void
  }) => (
    <div data-testid='paging'>
      <button data-testid='paging-next' type='button' onClick={incrementPage}>
        next
      </button>
      <button data-testid='paging-prev' type='button' onClick={decrementPage}>
        prev
      </button>
      <span data-testid='paging-info'>{currentPage}</span>
    </div>
  ),
}))

vi.mock('../../../components/core/empty/MqEmpty', () => ({
  __esModule: true,
  default: ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <div data-testid='mq-empty'>
      <div>{title}</div>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('../../../components/core/json-view/MqJsonView', () => ({
  __esModule: true,
  default: ({ data }: { data: unknown }) => (
    <div data-testid='mq-json-view'>{JSON.stringify(data)}</div>
  ),
}))

vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`tooltip-${title}`}>{children}</div>
  ),
}))

const renderEventsRoute = (
  {
    result = [],
    totalCount = 0,
    isLoading = false,
  }: {
    result?: Event[]
    totalCount?: number
    isLoading?: boolean
  } = {},
  options: { searchParams?: Record<string, string> } = {}
) => {
  if (options.searchParams) {
    searchParamsState.setInitial(options.searchParams)
  } else {
    searchParamsState.setInitial()
  }

  const mockRefetch = vi.fn()

  vi.spyOn(useEventsHook, 'useEvents').mockReturnValue({
    data: { events: result, totalCount },
    isLoading,
    isPending: isLoading,
    isError: false,
    error: null,
    refetch: mockRefetch,
  } as any)

  return {
    ...renderWithProviders(
      <MemoryRouter initialEntries={['/events']}>
        <Events />
      </MemoryRouter>
    ),
    mockRefetch
  }
}

describe('Events route', () => {
  beforeEach(() => {
    Object.keys(datePickerHandlers).forEach((key) => delete datePickerHandlers[key])
    resetEventsMock.mockClear()
    setSearchParamsMock.mockClear()
    formatDateAPIQueryMock.mockClear()
    formatDatePickerMock.mockClear()
    vi.restoreAllMocks()
  })

  it('renders empty state, updates filters, and cleans up', () => {
    const { unmount, mockRefetch } = renderEventsRoute({
      result: [],
      totalCount: 0,
      isLoading: false, // Not loading initially to show empty state if no results? 
      // Actually if isLoading is false and result is empty, it shows empty state.
    })

    // Assert initial fetch implicitly happened via hook mount
    expect(useEventsHook.useEvents).toHaveBeenCalled()
    expect(setSearchParamsMock).toHaveBeenCalled()

    expect(screen.getByTestId('mq-empty')).toBeInTheDocument()

    // Simulate Refresh
    const refreshIcon = within(screen.getByTestId('tooltip-Refresh')).getByRole('button')
    fireEvent.click(refreshIcon)
    expect(mockRefetch).toHaveBeenCalled()

    // Simulate Empty State Refresh
    const emptyRefreshButton = within(screen.getByTestId('mq-empty')).getByRole('button', {
      name: 'Refresh',
    })
    fireEvent.click(emptyRefreshButton)
    expect(mockRefetch).toHaveBeenCalledTimes(2)

    // Tests for date pickers...
    const fromHandler = datePickerHandlers['events_route.from_date']
    act(() => {
      fromHandler?.({ toDate: () => 'FROM_DATE' })
    })
    // This triggers set search params, which triggers new hook call with new params
    expect(setSearchParamsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: 'api(FROM_DATE)' })
    )

    unmount()
    // resetEvents is no longer dispatched on unmount in the component
    // expect(resetEventsMock).toHaveBeenCalled()
  })

  it('renders events table, toggles payload view, and paginates', () => {
    const events: Event[] = [
      {
        eventType: 'START',
        eventTime: '2024-01-01T00:00:00Z',
        producer: 'producer-a',
        schemaURL: 'schema',
        run: { runId: 'small-run', facets: {} },
        job: { name: 'SmallJob', namespace: 'analytics', facets: {} },
        inputs: [],
        outputs: [],
      },
      {
        eventType: 'COMPLETE',
        eventTime: '2024-01-02T00:00:00Z',
        producer: 'producer-b',
        schemaURL: 'schema',
        run: { runId: 'large-run', facets: {} },
        job: { name: 'LargeJob', namespace: 'finance', facets: {} },
        inputs: [],
        outputs: [],
      },
    ]

    renderEventsRoute(
      {
        result: events,
        totalCount: 2,
        isLoading: false,
      },
      {
        searchParams: { dateFrom: 'existing-from', dateTo: 'existing-to' },
      }
    )

    expect(screen.getByText('2 total')).toBeInTheDocument()

    const firstRow = screen.getByText('small-run').closest('tr')
    fireEvent.click(firstRow!)
    expect(screen.getByTestId('mq-json-view').textContent).toContain('small-run')

    // Test Pagination
    fireEvent.click(screen.getByTestId('paging-next'))
    // expect rerender with new offset
    // In React Query world, pagination is handled by state change which updates hook args.
    expect(screen.getByTestId('paging-info').textContent).toBe('1')
  })
})
