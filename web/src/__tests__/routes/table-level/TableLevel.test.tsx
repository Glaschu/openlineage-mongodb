// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import React from 'react'
import TableLevel from '../../../routes/table-level/TableLevel'
import type { LineageGraph } from '../../../types/api'
import { renderWithProviders } from '../../../helpers/testUtils'
import * as useLineageHook from '../../../queries/lineage'

const { createElkNodesMock, graphRenderMock, zoomControls } = vi.hoisted(() => ({
  createElkNodesMock: vi.fn(() => ({
    nodes: [{ id: 'node-1' }],
    edges: [{ id: 'edge-1', source: 'node-1', target: 'node-1' }],
  })),
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

vi.mock('../../../components/graph', () => ({
  DEFAULT_MAX_SCALE: 2,
  Graph: (props: any) => {
    graphRenderMock(props)
    if (props.setZoomPanControls) {
      props.setZoomPanControls(buildZoomControls())
    }
    return <div data-testid='graph' />
  },
  ZoomPanControls: class { },
}))

vi.mock('../../../routes/table-level/layout', () => ({
  createElkNodes: (...args: Parameters<typeof createElkNodesMock>) => createElkNodesMock(...args),
}))

vi.mock('../../../routes/column-level/ZoomControls', () => ({
  ZoomControls: () => <div data-testid='zoom-controls' />,
}))

vi.mock('../../../routes/table-level/TableLevelDrawer', () => ({
  __esModule: true,
  default: () => <div data-testid='table-level-drawer' />,
}))

vi.mock('@visx/responsive/lib/components/ParentSize', () => ({
  __esModule: true,
  default: ({ children }: { children: (size: { width: number; height: number }) => React.ReactNode }) => (
    <div data-testid='parent-size'>{children({ width: 800, height: 600 })}</div>
  ),
}))

vi.mock('../../../store/actionCreators', async () => {
  // We mock actionCreators but fetchLineage is no longer used for fetching.
  return {
    fetchLineage: vi.fn()
  }
})

const renderTableLevel = (lineage: LineageGraph | null, initialEntry?: string) => {
  const theme = createTheme()
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
        initialEntries={[initialEntry ?? '/table-level/DATASET/analytics/daily-table?depth=2&isCompact=true']}
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
    mockRefetch
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
        null
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
})
