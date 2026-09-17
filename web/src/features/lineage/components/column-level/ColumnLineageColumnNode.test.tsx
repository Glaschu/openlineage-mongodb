// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { type Location, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it } from 'vitest'
import { legacy_createStore as createStore } from '@reduxjs/toolkit'
import { fireEvent, render } from '@testing-library/react'
import ColumnLineageColumnNode, {
  encodeQueryString,
} from '@/features/lineage/components/column-level/ColumnLineageColumnNode'
import React from 'react'
import type { ColumnLineageColumnNodeData } from '@/features/lineage/components/column-level/nodes'
import type { PositionedNode } from '@/features/lineage/components/graph'

const LocationSpy = ({ onChange }: { onChange: (location: Location) => void }) => {
  const location = useLocation()
  React.useEffect(() => {
    onChange(location)
  }, [location, onChange])
  return null
}

const buildNode = (): PositionedNode<'column', ColumnLineageColumnNodeData> => ({
  id: 'column-node',
  kind: 'column',
  bottomLeftCorner: { x: 0, y: 0 },
  width: 200,
  height: 24,
  data: {
    column: 'very_long_column_name_exceeding_limits',
    namespace: 'analytics',
    dataset: 'users',
  },
})

const renderNode = (initialEntry = '/column-level/analytics/users') => {
  const store = createStore(() => ({
    columnLineage: { columnLineage: { graph: [] } },
  }))
  const locationRef: { current: Location | null } = { current: null }

  const ui = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path='/column-level/:namespace/:name'
            element={
              <>
                <LocationSpy onChange={(location) => (locationRef.current = location)} />
                <svg>
                  <ColumnLineageColumnNode node={buildNode()} />
                </svg>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  )

  return { locationRef, ...ui }
}

describe('ColumnLineageColumnNode', () => {
  it('selects the column without opening the details drawer', () => {
    const { locationRef, container } = renderNode('/column-level/analytics/users?depth=3')

    fireEvent.click(container.querySelector('rect') as Element)

    const params = new URLSearchParams(locationRef.current?.search ?? '')
    expect(params.get('columnName')).toBe('very_long_column_name_exceeding_limits')
    expect(params.get('dataset')).toBe('users')
    // Selecting is not a request to open the drawer: that is what made it
    // appear unbidden on every click.
    expect(params.get('drawer')).toBeNull()
    // And unrelated view state survives.
    expect(params.get('depth')).toBe('3')
  })

  it('leaves an already open drawer open when another column is selected', () => {
    const { locationRef, container } = renderNode(
      '/column-level/analytics/users?drawer=open&depth=3'
    )

    fireEvent.click(container.querySelector('rect') as Element)

    const params = new URLSearchParams(locationRef.current?.search ?? '')
    expect(params.get('drawer')).toBe('open')
    expect(params.get('columnName')).toBe('very_long_column_name_exceeding_limits')
  })

  beforeEach(() => {
    window.history.replaceState({}, '', '/column-level/analytics/users')
  })

  it('encodes a column query string', () => {
    expect(encodeQueryString('ns', 'dataset', 'column')).toBe('datasetField:ns:dataset:column')
  })

  it('selects the column on click without touching params on hover', () => {
    const { container, locationRef } = renderNode()
    const rect = container.querySelector('rect')!
    const text = container.querySelector('text')!

    fireEvent.mouseEnter(rect)
    expect(locationRef.current?.search ?? '').not.toContain('column=')
    fireEvent.mouseLeave(rect)

    fireEvent.click(text)
    expect(locationRef.current?.search).toContain('dataset=users')
    expect(locationRef.current?.search).toContain('namespace=analytics')
    expect(locationRef.current?.search).toContain(
      'column=datasetField%3Aanalytics%3Ausers%3Avery_long_column_name_exceeding_limits'
    )
    expect(locationRef.current?.search).toContain(
      'columnName=very_long_column_name_exceeding_limits'
    )
  })

  it('dims the node when dimmed and highlights when selected', () => {
    const dimmedNode = { ...buildNode(), data: { ...buildNode().data, dimmed: true } }
    const { container } = renderNode()
    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('1')

    const store = createStore(() => ({ columnLineage: { columnLineage: { graph: [] } } }))
    const dimmed = render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/column-level/analytics/users']}>
          <Routes>
            <Route
              path='/column-level/:namespace/:name'
              element={
                <svg>
                  <ColumnLineageColumnNode node={dimmedNode} />
                </svg>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>
    )
    expect(dimmed.container.querySelector('g')?.getAttribute('opacity')).toBe('0.3')
  })

  it('returns layout options unchanged', () => {
    const node = buildNode()
    expect(ColumnLineageColumnNode.getLayoutOptions(node)).toEqual(node)
  })
})
