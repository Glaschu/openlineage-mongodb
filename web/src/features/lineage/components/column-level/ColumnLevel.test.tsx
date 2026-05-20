// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import ColumnLevel from '@/features/lineage/components/column-level/ColumnLevel'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import * as useColumnLineageHook from '@/features/lineage/api'

// Mock dependencies
const { createElkNodesMock, graphRenderMock, zoomControlsCapture, zoomPanControls } = vi.hoisted(() => ({
  createElkNodesMock: vi.fn(() => ({
    nodes: [{ id: 'node-1' }],
    edges: [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-1' }],
  })),
  graphRenderMock: vi.fn(),
  zoomControlsCapture: { current: null as null | Record<string, (x?: unknown) => void> },
  zoomPanControls: { current: null as null | { scaleZoom: ReturnType<typeof vi.fn>; fitContent: ReturnType<typeof vi.fn>; centerOnPositionedNode: ReturnType<typeof vi.fn> } },
}))

vi.mock('@/features/lineage/components/column-level/layout', () => ({
  createElkNodes: (...args: any[]) => createElkNodesMock(...args),
}))

vi.mock('@/features/lineage/components/graph', () => ({
  Graph: (props: any) => {
    graphRenderMock(props)
    if (props.setZoomPanControls) {
      const controls = {
        scaleZoom: vi.fn(),
        fitContent: vi.fn(),
        centerOnPositionedNode: vi.fn(),
      }
      zoomPanControls.current = controls
      props.setZoomPanControls(controls)
    }
    return <div data-testid='graph' />
  },
  ZoomPanControls: class { },
}))

vi.mock('@/features/lineage/components/column-level/ZoomControls', () => ({
  ZoomControls: (props: any) => {
    zoomControlsCapture.current = props
    return <div data-testid='zoom-controls' />
  },
}))

vi.mock('@/features/lineage/components/column-level/ColumnLevelDrawer', () => ({
  default: () => <div data-testid='column-level-drawer' />,
}))

vi.mock('@visx/responsive/lib/components/ParentSize', () => ({
  default: ({ children }: any) => <div>{children({ width: 800, height: 600 })}</div>,
}))

const LocationSpy = ({ onChange }: { onChange: (location: Location) => void }) => {
  const location = useLocation()
  React.useEffect(() => {
    onChange(location)
  }, [location, onChange])
  return null
}

const renderColumnLevel = (columnLineageData: any = null, initialEntry?: string) => {
  const locationRef: { current: Location | null } = { current: null }

  vi.spyOn(useColumnLineageHook, 'useColumnLineage').mockReturnValue({
    data: columnLineageData,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as any)

  const ui = renderWithProviders(
    <MemoryRouter initialEntries={[initialEntry ?? '/column-level/analytics/users?depth=2']}>
      <Routes>
        <Route
          path='/column-level/:namespace/:name'
          element={
            <>
              <LocationSpy onChange={(location) => (locationRef.current = location)} />
              <ColumnLevel />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )

  return { locationRef, ...ui }
}

describe('ColumnLevel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createElkNodesMock.mockClear()
  })

  it('renders nothing when lineage is missing', () => {
    const { container } = renderColumnLevel(null)
    // Should render empty div if no data
    expect(container.innerHTML).toContain('<div></div>')
    // Or check that graph is not present
    expect(screen.queryByTestId('graph')).toBeNull()
  })

  it('renders the graph when data is present', () => {
    const mockData = { graph: [] }
    renderColumnLevel(
      mockData,
      '/column-level/analytics/users?depth=4'
    )

    expect(createElkNodesMock).toHaveBeenCalled()
    expect(screen.getByTestId('graph')).toBeInTheDocument()
    expect(screen.getByTestId('zoom-controls')).toBeInTheDocument()
  })

  it('zoom handlers delegate to graph controls', () => {
    vi.useFakeTimers()
    try {
      renderColumnLevel({ graph: [] }, '/column-level/analytics/users')
      vi.runAllTimers()
      const controls = zoomPanControls.current
      expect(controls).not.toBeNull()
      const props = zoomControlsCapture.current
      expect(props).not.toBeNull()
      controls!.fitContent.mockClear()
      props!.handleScaleZoom('in')
      props!.handleScaleZoom('out')
      expect(controls!.scaleZoom).toHaveBeenCalledTimes(2)
      props!.handleResetZoom()
      expect(controls!.fitContent).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
