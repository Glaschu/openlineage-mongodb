// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as useLineageHook from '@/features/lineage/api'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import React from 'react'
import TableLevel from '@/features/lineage/components/table-level/TableLevel'
import type { LineageGraph } from '@/shared/types/api'

const {
  createElkNodesMock,
  findDownstreamNodesMock,
  findUpstreamNodesMock,
  graphRenderMock,
  zoomControls,
} = vi.hoisted(() => ({
  // Typed with a rest parameter so assertions can read the arguments the
  // component passed (notably the compact flag).
  createElkNodesMock: vi.fn((..._args: unknown[]) => ({
    nodes: [{ id: 'node-1' }] as unknown[],
    edges: [{ id: 'edge-1', source: 'node-1', target: 'node-1' }] as unknown[],
  })),
  findDownstreamNodesMock: vi.fn((..._args: unknown[]) => ({ nodes: [], edges: [] })),
  findUpstreamNodesMock: vi.fn((..._args: unknown[]) => ({ nodes: [], edges: [] })),
  graphRenderMock: vi.fn(),
  zoomControls: [] as Array<{
    scaleZoom: ReturnType<typeof vi.fn>
    fitContent: ReturnType<typeof vi.fn>
    centerOnPositionedNode: ReturnType<typeof vi.fn>
  }>,
}))

const buildZoomControls = () => {
  const controls = {
    scaleZoom: vi.fn(),
    fitContent: vi.fn(),
    centerOnPositionedNode: vi.fn(),
  }
  zoomControls.push(controls)
  return controls
}

vi.mock('@/features/lineage/components/graph', () => ({
  DEFAULT_MAX_SCALE: 2,
  Graph: (props: any) => {
    graphRenderMock(props)
    if (props.setZoomPanControls) {
      props.setZoomPanControls(buildZoomControls())
    }
    return <div data-testid='graph' />
  },
  ZoomPanControls: class {},
}))

vi.mock('@/features/lineage/components/table-level/layout', () => ({
  createElkNodes: (...args: Parameters<typeof createElkNodesMock>) => createElkNodesMock(...args),
  findDownstreamNodes: (...args: unknown[]) => findDownstreamNodesMock(...args),
  findUpstreamNodes: (...args: unknown[]) => findUpstreamNodesMock(...args),
}))

const zoomControlsMock = vi.hoisted(() => ({
  props: null as null | Record<string, (arg?: unknown) => void>,
}))
vi.mock('@/features/lineage/components/column-level/ZoomControls', () => ({
  ZoomControls: (props: Record<string, () => void>) => {
    zoomControlsMock.props = props
    return <div data-testid='zoom-controls' />
  },
}))

vi.mock('@/features/lineage/components/table-level/TableLevelDrawer', () => ({
  __esModule: true,
  default: () => <div data-testid='table-level-drawer' />,
}))

vi.mock('@visx/responsive/lib/components/ParentSize', () => ({
  __esModule: true,
  default: ({
    children,
  }: {
    children: (size: { width: number; height: number }) => React.ReactNode
  }) => <div data-testid='parent-size'>{children({ width: 800, height: 600 })}</div>,
}))

vi.mock('../../../store/actionCreators', async () => {
  // We mock actionCreators but fetchLineage is no longer used for fetching.
  return {
    fetchLineage: vi.fn(),
  }
})

const renderTableLevel = (lineage: LineageGraph | null, initialEntry?: string) => {
  const mockRefetch = vi.fn()

  vi.spyOn(useLineageHook, 'useLineage').mockReturnValue({
    data: lineage ? { graph: [lineage] } : undefined, // Check how useLineage returns data. Usually { lineage: ... } or just schema?
    // Looking at TableLevel.tsx usage: const { data: lineageData... } = useLineage(...)
    // lineageData is passed to createElkNodes.
    // Let's assume structure matches LineageGraph for now or check usage.
    // usage: createElkNodes(lineageData, ...)
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
  } as any)

  return {
    ...renderWithProviders(
      <MemoryRouter
        initialEntries={[
          initialEntry ?? '/table-level/DATASET/analytics/daily-table?depth=2&isCompact=true',
        ]}
      >
        <Routes>
          <Route path='/table-level/:nodeType/:namespace/:name' element={<TableLevel />} />
        </Routes>
      </MemoryRouter>,
      {
        // Redux state if needed for other things?
        // TableLevel uses local state for view options.
      }
    ),
    mockRefetch,
  }
}

describe('TableLevel', () => {
  beforeEach(() => {
    createElkNodesMock.mockClear()
    graphRenderMock.mockClear()
    zoomControls.length = 0
    vi.restoreAllMocks()
  })

  it('renders nothing when lineage data is not available', () => {
    renderTableLevel(null)

    expect(screen.queryByTestId('graph')).toBeNull()
    expect(createElkNodesMock).not.toHaveBeenCalled()
  })

  it('renders the graph when lineage data is loaded', () => {
    vi.useFakeTimers()
    try {
      const lineage = { graph: [], nodes: [] } as unknown as LineageGraph
      renderTableLevel(lineage)

      // expect(fetchLineageMock).toHaveBeenCalledWith('DATASET', 'analytics', 'daily-table', 2)
      // No longer dispatching fetchLineage.

      expect(useLineageHook.useLineage).toHaveBeenCalled()

      // The component calls createElkNodes with the data from the hook
      expect(createElkNodesMock).toHaveBeenCalledWith(
        expect.anything(), // The lineage object
        'DATASET:analytics:daily-table',
        true,
        false,
        null,
        false
      )

      expect(graphRenderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'column-level-graph',
          nodes: [{ id: 'node-1' }],
          edges: [{ id: 'edge-1', source: 'node-1', target: 'node-1' }],
        })
      )

      vi.runAllTimers()
      expect(zoomControls.length).toBeGreaterThan(0)
      expect(zoomControls[0].fitContent).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('zoom control handlers delegate to the graph controls', () => {
    vi.useFakeTimers()
    try {
      const lineage = { graph: [], nodes: [] } as unknown as LineageGraph
      renderTableLevel(lineage)
      vi.runAllTimers()
      expect(zoomControlsMock.props).not.toBeNull()
      const controls = zoomControls[0]
      controls.fitContent.mockClear()
      zoomControlsMock.props!.handleScaleZoom('in' as never)
      expect(controls.scaleZoom).toHaveBeenCalled()
      zoomControlsMock.props!.handleScaleZoom('out' as never)
      expect(controls.scaleZoom).toHaveBeenCalledTimes(2)
      zoomControlsMock.props!.handleResetZoom()
      expect(controls.fitContent).toHaveBeenCalled()
      zoomControlsMock.props!.handleCenterOnNode()
      expect(controls.centerOnPositionedNode).toHaveBeenCalledWith(
        'DATASET:analytics:daily-table',
        2
      )
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('TableLevel automatic compacting', () => {
  const graph = () =>
    ({ graph: [{ id: 'DATASET:analytics:daily-table' }] } as unknown as LineageGraph)

  // The shared harness URL pins isCompact, which would mask the automatic
  // behaviour; these cases need a URL that expresses no preference.
  const NO_PREFERENCE = '/table-level/DATASET/analytics/daily-table?depth=2'

  // height mirrors what createElkNodes produces: 24 when compact, 34 + 10 per
  // column at full size.
  const graphOfHeight = (count: number, height: number) => ({
    nodes: Array.from({ length: count }).map((_, i) => ({ id: `node-${i}`, height })),
    edges: [],
  })

  const compactArgs = () => createElkNodesMock.mock.calls.map((call) => call[2])

  beforeEach(() => {
    createElkNodesMock.mockClear()
    graphRenderMock.mockClear()
  })

  it('compacts a graph too large to read at full size', () => {
    // 17 nodes of a 90-column table — the shape that made deep graphs unreadable.
    createElkNodesMock.mockReturnValue(graphOfHeight(17, 934) as never)
    renderTableLevel(graph(), NO_PREFERENCE)

    // Built once at the user's setting, then rebuilt compact once its size is known.
    expect(compactArgs()).toContain(true)
    expect(screen.getByRole('checkbox', { name: 'Compact Nodes (auto)' })).toBeChecked()
  })

  it('counts nested group children toward the budget', () => {
    createElkNodesMock.mockReturnValue({
      nodes: [
        {
          id: 'group-1',
          height: 0,
          children: [
            { id: 'a', height: 1400 },
            { id: 'b', height: 1400 },
          ],
        },
      ],
      edges: [],
    } as never)
    renderTableLevel(graph(), NO_PREFERENCE)

    expect(compactArgs()).toContain(true)
  })

  it('leaves a small graph at full size', () => {
    createElkNodesMock.mockReturnValue(graphOfHeight(5, 74) as never)
    renderTableLevel(graph(), NO_PREFERENCE)

    expect(compactArgs()).not.toContain(true)
    expect(screen.getByRole('checkbox', { name: 'Compact Nodes' })).not.toBeChecked()
  })

  it('does not override an explicit choice in the URL', () => {
    createElkNodesMock.mockReturnValue(graphOfHeight(17, 934) as never)
    renderTableLevel(graph(), '/table-level/DATASET/analytics/daily-table?isCompact=false')

    expect(compactArgs()).not.toContain(true)
    expect(screen.getByRole('checkbox', { name: 'Compact Nodes' })).not.toBeChecked()
  })
})

describe('TableLevel node search', () => {
  const graph = () =>
    ({ graph: [{ id: 'DATASET:analytics:daily-table' }] } as unknown as LineageGraph)

  beforeEach(() => {
    createElkNodesMock.mockClear()
    zoomControls.length = 0
    createElkNodesMock.mockReturnValue({
      nodes: [
        {
          id: 'dataset:analytics:orders',
          kind: 'DATASET',
          height: 24,
          data: { dataset: { name: 'orders', namespace: 'analytics' } },
        },
        {
          id: 'job:etl:nightly',
          kind: 'JOB',
          height: 24,
          data: { job: { name: 'nightly', namespace: 'etl' } },
        },
      ],
      edges: [],
    } as never)
  })

  it('centres the graph on a node picked from the search box', () => {
    renderTableLevel(graph())

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    const options = screen.getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('orders'),
      expect.stringContaining('nightly'),
    ])

    fireEvent.click(options[1])

    expect(zoomControls[0].centerOnPositionedNode).toHaveBeenCalledWith('job:etl:nightly', 2)
  })
})
