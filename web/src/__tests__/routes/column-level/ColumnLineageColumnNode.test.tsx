// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStore } from 'redux'
import { fireEvent, render } from '@testing-library/react'
import React from 'react'
import ColumnLineageColumnNode, {
  encodeQueryString,
} from '../../../routes/column-level/ColumnLineageColumnNode'
import type { ColumnLineageColumnNodeData } from '../../../routes/column-level/nodes'
import type { PositionedNode } from '../../../components/graph'

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
  beforeEach(() => {
    window.history.replaceState({}, '', '/column-level/analytics/users')
  })

  it('encodes a column query string', () => {
    expect(encodeQueryString('ns', 'dataset', 'column')).toBe('datasetField:ns:dataset:column')
  })

  it('updates search params for hover and click interactions', () => {
    const { container, locationRef } = renderNode()
    const rect = container.querySelector('rect')!
    const text = container.querySelector('text')!

    fireEvent.mouseEnter(rect)
    expect(locationRef.current?.search).toContain('column=datasetField%3Aanalytics%3Ausers%3Avery_long_column_name_exceeding_limits')

    fireEvent.mouseLeave(rect)

    fireEvent.click(text)
    expect(locationRef.current?.search).toContain('dataset=users')
    expect(locationRef.current?.search).toContain('namespace=analytics')
  })

  it('returns layout options unchanged', () => {
    const node = buildNode()
    expect(ColumnLineageColumnNode.getLayoutOptions(node)).toEqual(node)
  })
})
