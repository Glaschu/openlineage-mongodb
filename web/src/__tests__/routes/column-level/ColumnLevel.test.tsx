// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import ColumnLevel from '../../../routes/column-level/ColumnLevel'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../helpers/testUtils'
import * as useColumnLineageHook from '../../../queries/columnlineage'

// Mock dependencies
const { createElkNodesMock } = vi.hoisted(() => ({
  createElkNodesMock: vi.fn(() => ({
    nodes: [{ id: 'node-1' }],
    edges: [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-1' }],
  })),
}))

vi.mock('../../../routes/column-level/layout', () => ({
  createElkNodes: (...args: any[]) => createElkNodesMock(...args),
}))

vi.mock('../../../components/graph', () => ({
  Graph: () => <div data-testid='graph' />,
  ZoomPanControls: class { },
}))

vi.mock('../../../routes/column-level/ZoomControls', () => ({
  ZoomControls: () => <div data-testid='zoom-controls' />,
}))

vi.mock('../../../routes/column-level/ColumnLevelDrawer', () => ({
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
})
