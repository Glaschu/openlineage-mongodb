import { LineageJob } from '../../../types/lineage'
import { MemoryRouter } from 'react-router-dom'
import { PositionedNode } from '../../../components/graph'
import { Provider } from 'react-redux'
import { TableLineageJobNodeData } from '../../../routes/table-level/nodes'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'redux'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import TableLineageJobNode from '../../../routes/table-level/TableLineageJobNode'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}))

// Mock child components
vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: React.ReactNode }) => (
    <div data-testid='mq-tooltip' title={typeof title === 'string' ? title : 'tooltip'}>
      {children}
    </div>
  ),
}))

vi.mock('../../../components/core/status/MqStatus', () => ({
  default: ({ label, color }: { label: string; color: string }) => (
    <div data-testid='mq-status' data-label={label} data-color={color}>
      {label}
    </div>
  ),
}))

vi.mock('../../../components/core/text/MqText', () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => (
    <span data-testid='mq-text' {...props}>
      {children}
    </span>
  ),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ namespace: 'test-ns', name: 'test-job' }),
  }
})

const createMockJob = (overrides = {}): LineageJob => ({
  id: { namespace: 'test-namespace', name: 'test-job' },
  namespace: 'test-namespace',
  name: 'test-job',
  type: 'BATCH',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  inputs: [],
  outputs: [],
  location: 's3://bucket/path',
  description: 'Test job description',
  simpleName: 'test-job',
  latestRun: {
    id: 'run-1',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:05:00Z',
    nominalStartTime: '2024-01-15T10:00:00Z',
    nominalEndTime: '2024-01-15T10:05:00Z',
    state: 'COMPLETED',
    startedAt: '2024-01-15T10:00:00Z',
    endedAt: '2024-01-15T10:05:00Z',
    durationMs: 300000,
    args: {},
    jobVersion: {
      name: 'test-job',
      namespace: 'test-namespace',
      version: 'v1',
    },
    facets: {},
  },
  parentJobName: null,
  parentJobUuid: null,
  ...overrides,
})

const createMockNode = (overrides = {}): PositionedNode<'job', TableLineageJobNodeData> => ({
  id: 'node-1',
  kind: 'job',
  bottomLeftCorner: { x: 100, y: 100 },
  width: 200,
  height: 50,
  data: {
    job: createMockJob(),
  },
  ...overrides,
})

const createMockStore = () => {
  return createStore(() => ({
    lineage: {
      lineage: { graph: [] },
    },
  }))
}

describe('TableLineageJobNode', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders job node with basic information', () => {
    const node = createMockNode()
    const store = createMockStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageJobNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText('JOB')).toBeInTheDocument()
    expect(screen.getByText('test-job')).toBeInTheDocument()
  })

  it('navigates to job lineage page on click', () => {
    const node = createMockNode()
    const store = createMockStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageJobNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    const jobLabel = screen.getByText('test-job')
    fireEvent.click(jobLabel)

    expect(mockNavigate).toHaveBeenCalledWith(
      '/lineage/job/test-namespace/test-job?tableLevelNode=node-1'
    )
  })

  it('renders job with description', () => {
    const job = createMockJob({ description: 'Custom job description' })
    const node = createMockNode({ data: { job } })
    const store = createMockStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageJobNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText('test-job')).toBeInTheDocument()
  })

  it('renders job without description', () => {
    const job = createMockJob({ description: undefined })
    const node = createMockNode({ data: { job } })
    const store = createMockStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageJobNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText('test-job')).toBeInTheDocument()
  })

  it('renders job with COMPLETED run state', () => {
    const node = createMockNode()
    const store = createMockStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageJobNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText('test-job')).toBeInTheDocument()
  })

  it('renders job with FAILED run state', () => {
    const job = createMockJob({
      latestRun: {
        id: 'run-1',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:05:00Z',
        nominalStartTime: '2024-01-15T10:00:00Z',
        nominalEndTime: '2024-01-15T10:05:00Z',
        state: 'FAILED',
        startedAt: '2024-01-15T10:00:00Z',
        endedAt: '2024-01-15T10:05:00Z',
        durationMs: 300000,
        args: {},
        jobVersion: {
          name: 'test-job',
          namespace: 'test-namespace',
          version: 'v1',
        },
        facets: {},
      },
    })
    const node = createMockNode({ data: { job } })
    const store = createMockStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageJobNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText('test-job')).toBeInTheDocument()
  })

  it('renders job with no latest run', () => {
    const job = createMockJob({ latestRun: null })
    const node = createMockNode({ data: { job } })
    const store = createMockStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageJobNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText('test-job')).toBeInTheDocument()
  })

  it('truncates long job names', () => {
    const longName = 'very_long_job_name_that_should_be_truncated_for_display'
    const job = createMockJob({ name: longName })
    const node = createMockNode({ data: { job } })
    const store = createMockStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageJobNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    // Truncated version should be rendered (16 chars max)
    expect(screen.queryByText(longName)).not.toBeInTheDocument()
  })
})
