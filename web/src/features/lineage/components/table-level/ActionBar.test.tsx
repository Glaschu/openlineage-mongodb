// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ActionBar, GraphSearchOption } from '@/features/lineage/components/table-level/ActionBar'
import { type Location, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'

vi.mock('@/shared/components/MqTooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactElement }) =>
    React.cloneElement(children, { 'aria-label': title }),
}))

const LocationSpy = ({ onChange }: { onChange: (location: Location) => void }) => {
  const location = useLocation()
  React.useEffect(() => {
    onChange(location)
  }, [location, onChange])
  return null
}

const renderActionBar = (
  {
    nodeType = 'JOB',
    depth = 2,
    initialEntry = '/table/JOB/finance/daily-job?depth=2',
  }: { nodeType?: 'JOB' | 'DATASET'; depth?: number; initialEntry?: string },
  overrides: {
    setDepth?: (depth: number) => void
    setIsCompact?: (value: boolean) => void
    setIsFull?: (value: boolean) => void
    isCompact?: boolean
    isCompactAutomatic?: boolean
    isFull?: boolean
    searchOptions?: GraphSearchOption[]
    onSelectNode?: (nodeId: string | null) => void
  } = {}
) => {
  const theme = createTheme()
  const fetchLineage = vi.fn()
  const setDepth = vi.fn(overrides.setDepth ?? (() => {}))
  const setIsCompact = vi.fn(overrides.setIsCompact ?? (() => {}))
  const setIsFull = vi.fn(overrides.setIsFull ?? (() => {}))
  const setAggregateByParent = vi.fn()
  const onSelectNode = vi.fn(overrides.onSelectNode ?? (() => {}))
  const locationRef: { current: Location | null } = { current: null }

  const ui = render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path='/table/:nodeType/:namespace/:name'
            element={
              <>
                <LocationSpy onChange={(location) => (locationRef.current = location)} />
                <ActionBar
                  nodeType={nodeType}
                  refresh={fetchLineage as any}
                  depth={depth}
                  setDepth={setDepth}
                  isCompact={overrides.isCompact ?? false}
                  setIsCompact={setIsCompact}
                  isFull={overrides.isFull ?? false}
                  setIsFull={setIsFull}
                  isCompactAutomatic={overrides.isCompactAutomatic ?? false}
                  aggregateByParent={false}
                  setAggregateByParent={setAggregateByParent}
                  searchOptions={overrides.searchOptions}
                  onSelectNode={onSelectNode}
                />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )

  return { fetchLineage, setDepth, setIsCompact, setIsFull, onSelectNode, locationRef, ...ui }
}

describe('ActionBar', () => {
  it('offers every laid-out node, grouped and namespaced, and reports the choice', () => {
    const searchOptions: GraphSearchOption[] = [
      { id: 'dataset:analytics:orders', name: 'orders', namespace: 'analytics', kind: 'Datasets' },
      { id: 'dataset:billing:orders', name: 'orders', namespace: 'billing', kind: 'Datasets' },
      { id: 'job:etl:nightly', name: 'nightly', namespace: 'etl', kind: 'Jobs' },
    ]
    const { onSelectNode } = renderActionBar({}, { searchOptions })

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    // Same-named datasets in different namespaces have to be distinguishable.
    expect(options[0]).toHaveTextContent('orders')
    expect(options[0]).toHaveTextContent('analytics')
    expect(options[1]).toHaveTextContent('billing')
    // Scoped to the dropdown: the bar's own heading also reads "Jobs".
    const listbox = within(screen.getByRole('listbox'))
    expect(listbox.getByText('Jobs')).toBeInTheDocument()
    expect(listbox.getByText('Datasets')).toBeInTheDocument()

    fireEvent.click(options[1])
    expect(onSelectNode).toHaveBeenCalledWith('dataset:billing:orders')
  })

  it('labels the compact switch as automatic when the graph forced it', () => {
    renderActionBar({}, { isCompact: true, isCompactAutomatic: true })

    expect(screen.getByRole('checkbox', { name: 'Compact Nodes (auto)' })).toBeChecked()
  })

  it('calls fetchLineage with the current parameters when refresh is clicked', () => {
    const { fetchLineage } = renderActionBar({})

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(fetchLineage).toHaveBeenCalled()
  })

  it('updates the depth and search params when the depth input changes', () => {
    const { setDepth, locationRef } = renderActionBar({ depth: 2 })

    fireEvent.change(screen.getByLabelText('Depth'), { target: { value: '3' } })

    expect(setDepth).toHaveBeenCalledWith(3)
    expect(locationRef.current?.search).toContain('depth=3')
  })

  it('toggles the switches and writes the values to the URL', () => {
    const { setIsFull, setIsCompact, locationRef } = renderActionBar({
      initialEntry: '/table/JOB/finance/daily-job',
    })

    fireEvent.click(screen.getByRole('checkbox', { name: 'Full Graph' }))
    expect(setIsFull).toHaveBeenCalledWith(true)
    expect(locationRef.current?.search).toContain('isFull=true')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Compact Nodes' }))
    expect(setIsCompact).toHaveBeenCalledWith(true)
    expect(locationRef.current?.search).toContain('isCompact=true')
  })
})
