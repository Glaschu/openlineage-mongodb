// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act } from 'react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { legacy_createStore as createStore } from 'redux'

import OpenSearch from '../../../../components/search/open-search/OpenSearch'

type HighlightMap = Record<string, string[]>

const pendingDebounces = vi.hoisted(() => [] as Array<() => void>)
const mockNavigate = vi.hoisted(() => vi.fn())
const encodeNodeMock = vi.hoisted(() =>
  vi.fn((type: string, namespace: string, name: string) => `${type}:${namespace}:${name}`)
)
const eventTypeColorMock = vi.hoisted(() => vi.fn(() => 'mock-color'))

vi.mock('lodash', async () => {
  const actual = await vi.importActual<typeof import('lodash')>('lodash')
  return {
    ...actual,
    debounce: (fn: (...args: any[]) => unknown) => {
      let lastArgs: any[] = []
      const wrapped: any = (...args: any[]) => {
        lastArgs = args
        pendingDebounces.push(() => fn(...lastArgs))
      }
      wrapped.cancel = vi.fn()
      wrapped.flush = vi.fn(() => fn(...lastArgs))
      return wrapped
    },
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../../../helpers/nodes', async () => {
  const actual = await vi.importActual<typeof import('../../../../helpers/nodes')>(
    '../../../../helpers/nodes'
  )
  return {
    ...actual,
    encodeNode: encodeNodeMock,
    eventTypeColor: eventTypeColorMock,
  }
})

vi.mock('../../../../helpers/theme', () => ({
  theme: {
    palette: {
      action: { hover: '#f5f5f5' },
      primary: { main: '#123456' },
      secondary: { main: '#654321' },
      info: { main: '#abcdef' },
      error: { main: '#ff0000' },
      warning: { main: '#ffaa00' },
    },
    zIndex: {
      snackbar: 1400,
    },
  },
}))

const muiStubs = vi.hoisted(() => {
  const Chip = ({ label, color = 'default', onClick }: any) => (
    <button
      type='button'
      data-testid={`chip-${String(label)}`}
      data-color={color}
      onClick={onClick}
    >
      {label}
    </button>
  )

  const Divider = ({ orientation = 'horizontal' }: { orientation?: string }) => (
    <div data-testid={`divider-${orientation}`} />
  )

  return {
    Chip,
    Divider,
  }
})

vi.mock('@mui/material', () => ({
  __esModule: true,
  Chip: muiStubs.Chip,
  Divider: muiStubs.Divider,
}))

vi.mock('@mui/system/Box', () => ({
  __esModule: true,
  default: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div data-box='true' onClick={onClick}>
      {children}
    </div>
  ),
}))

vi.mock('@fortawesome/react-fontawesome', () => ({
  __esModule: true,
  FontAwesomeIcon: ({ icon }: { icon: unknown }) => (
    <span data-testid='fontawesome-icon'>{String(icon)}</span>
  ),
}))

vi.mock('../../../../components/core/tooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <div data-tooltip={String(title)}>{children}</div>
  ),
}))

vi.mock('../../../../components/core/empty/MqEmpty', () => ({
  __esModule: true,
  default: ({ title, body }: { title: string; body: string }) => (
    <div data-testid='mq-empty'>
      <span>{title}</span>
      <span>{body}</span>
    </div>
  ),
}))

vi.mock('../../../../components/core/status/MqStatus', () => ({
  __esModule: true,
  default: ({ color, label }: { color: string; label: string }) => (
    <div data-testid='status' data-color={color}>
      {label}
    </div>
  ),
}))

vi.mock('../../../../components/core/text/MqText', () => ({
  __esModule: true,
  default: ({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) => (
    <span
      data-highlight={highlight ? 'true' : 'false'}
      data-testid={highlight ? 'highlighted-text' : undefined}
    >
      {children}
    </span>
  ),
}))

vi.mock('../../../../components/search/open-search/airlfow-logo.svg', () => ({
  __esModule: true,
  default: 'airflow.svg',
}))

vi.mock('../../../../components/search/open-search/dbt-logo.svg', () => ({
  __esModule: true,
  default: 'dbt.svg',
}))

vi.mock('../../../../components/search/open-search/spark-logo.svg', () => ({
  __esModule: true,
  default: 'spark.svg',
}))

import { renderWithProviders } from '../../../../helpers/testUtils'
import * as useSearchHook from '../../../../queries/search'

const flushPendingDebounces = async () => {
  const callbacks = pendingDebounces.splice(0)
  await act(async () => {
    callbacks.forEach((callback) => callback())
  })
}

const renderOpenSearch = ({
  jobs = [],
  jobHighlights = jobs.map(() => ({} as HighlightMap)),
  datasets = [],
  datasetHighlights = datasets.map(() => ({} as HighlightMap)),
  search = 'Test Search',
}: {
  jobs?: any[]
  jobHighlights?: HighlightMap[]
  datasets?: any[]
  datasetHighlights?: HighlightMap[]
  search?: string
} = {}) => {
  const store = createStore(() => ({}))

  vi.spyOn(useSearchHook, 'useOpenSearchJobs').mockReturnValue({
    data: { hits: jobs, highlights: jobHighlights },
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as any)

  vi.spyOn(useSearchHook, 'useOpenSearchDatasets').mockReturnValue({
    data: { hits: datasets, highlights: datasetHighlights },
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as any)

  return renderWithProviders(
    <MemoryRouter>
      <OpenSearch search={search} />
    </MemoryRouter>,
    { store }
  )
}

describe('OpenSearch Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    encodeNodeMock.mockClear()
    eventTypeColorMock.mockClear()
    pendingDebounces.length = 0
  })

  afterEach(() => {
    pendingDebounces.length = 0
  })

  it('shows empty state when no hits are found', async () => {
    renderOpenSearch()

    await flushPendingDebounces()

    // With React Query hooks initiating immediately, and our mock returning empty hits,
    // we expect the empty state to be visible.
    expect(screen.getByTestId('mq-empty')).toHaveTextContent('No Hits')
  })

  it('renders job highlights, integration logos, and dispatch colors', async () => {
    const longJobName = 'ExtremelyLongJobNameForTestingCoverage'
    const jobHit = {
      run_id: 'job-run-1',
      name: longJobName,
      namespace: 'analytics',
      eventType: 'COMPLETE',
      runFacets: {
        processing_engine: {
          name: 'Spark',
        },
      },
      facets: {
        sourceCode: {
          language: 'Python',
        },
      },
    }

    renderOpenSearch({
      jobs: [jobHit],
      jobHighlights: [
        {
          name: ['before <em>match</em> after'],
          namespace: ['<em>analytics</em>'],
        },
      ],
    })

    await flushPendingDebounces()

    const truncated = `${longJobName.slice(0, 30)}...`
    expect(screen.getByText(truncated)).toBeInTheDocument()
    expect(screen.getByAltText('Spark')).toBeInTheDocument()

    const highlightedSegments = screen.getAllByTestId('highlighted-text')
    expect(highlightedSegments.map((node) => node.textContent?.trim())).toEqual([
      'match',
      'analytics',
    ])

    expect(eventTypeColorMock).toHaveBeenCalledWith('COMPLETE')
    expect(screen.getByTestId('status')).toHaveAttribute('data-color', 'mock-color')

    fireEvent.click(screen.getByText(truncated))
    expect(mockNavigate).toHaveBeenCalledWith('/lineage/JOB:analytics:ExtremelyLongJobNameForTestingCoverage')
    expect(encodeNodeMock).toHaveBeenCalledWith('JOB', 'analytics', longJobName)
  })

  // ... (Other navigation tests remain valid as they test rendering and interaction given presence of data)

  it('navigates to job results with keyboard input', async () => {
    renderOpenSearch({
      jobs: [
        {
          run_id: 'job-run-1',
          name: 'job-one',
          namespace: 'analytics',
          eventType: 'START',
        },
      ],
    })

    await flushPendingDebounces()

    mockNavigate.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })

    expect(mockNavigate).toHaveBeenCalledWith('/lineage/JOB:analytics:job-one')
  })

  it('navigates to dataset results after traversing job results', async () => {
    renderOpenSearch({
      jobs: [
        {
          run_id: 'job-run-1',
          name: 'job-one',
          namespace: 'analytics',
          eventType: 'COMPLETE',
        },
      ],
      datasets: [
        {
          run_id: 'dataset-run-1',
          name: 'dataset-one',
          namespace: 'analytics',
        },
      ],
    })

    await flushPendingDebounces()

    mockNavigate.mockClear()
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })

    expect(mockNavigate).toHaveBeenCalledWith('/lineage/DATASET:analytics:dataset-one')
    expect(encodeNodeMock).toHaveBeenCalledWith('DATASET', 'analytics', 'dataset-one')
  })

  it('renders dataset facets, highlights fields, and falls back to chips for unknown engines', async () => {
    const datasetHit = {
      run_id: 'dataset-run-1',
      name: 'CustomerDataset',
      namespace: 'analytics',
      facets: {
        schema: {
          fields: [
            { name: 'TestFieldOne' },
            { name: 'OtherField' },
            { name: 'AnotherField' },
            { name: 'FourthField' },
            { name: 'FifthField' },
            { name: 'SixthField' },
            { name: 'SeventhField' },
          ],
        },
      },
    }

    const jobHit = {
      run_id: 'job-run-2',
      name: 'unknown-engine-job',
      namespace: 'analytics',
      eventType: 'RUNNING',
      runFacets: {
        processing_engine: {
          name: 'CustomEngine',
        },
      },
    }

    renderOpenSearch({
      jobs: [jobHit],
      datasets: [datasetHit],
      jobHighlights: [
        {
          name: ['<em>unknown</em>'],
        },
      ],
      datasetHighlights: [
        {
          name: ['lead <em>Test</em> tail'],
        },
      ],
      search: 'Test',
    })

    await flushPendingDebounces()

    expect(screen.getByTestId('chip-CustomEngine')).toBeInTheDocument()

    const highlightedValues = screen
      .getAllByTestId('highlighted-text')
      .map((node) => node.textContent?.trim())
    expect(highlightedValues).toContain('Test')

    expect(screen.getByTestId('chip-TestFieldOne')).toHaveAttribute('data-color', 'primary')
    expect(screen.getByTestId('chip-OtherField')).toHaveAttribute('data-color', 'default')

    expect(
      screen.getByText((content) => content.trim() === '+ 2')
    ).toBeInTheDocument()
  })
})
