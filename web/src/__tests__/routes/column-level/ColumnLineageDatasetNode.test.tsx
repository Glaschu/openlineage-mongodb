// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import React from 'react'
import { ColumnLineageDatasetNode } from '../../../routes/column-level/ColumnLineageDatasetNode'
import type { ColumnLineageDatasetNodeData } from '../../../routes/column-level/nodes'
import type { PositionedNode } from '../../../components/graph'

const buildNode = (): PositionedNode<'dataset', ColumnLineageDatasetNodeData> => ({
  id: 'dataset-node',
  kind: 'dataset',
  bottomLeftCorner: { x: 0, y: 0 },
  width: 240,
  height: 80,
  data: {
    dataset: 'users',
    namespace: 'analytics',
  },
})

const LocationSpy = ({ onChange }: { onChange: (location: Location) => void }) => {
  const location = useLocation()
  React.useEffect(() => {
    onChange(location)
  }, [location, onChange])
  return null
}

const renderNode = (initialEntry: string) => {
  const locationRef: { current: Location | null } = { current: null }
  const ui = render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path='/column-level/:namespace/:name'
          element={
            <>
              <LocationSpy onChange={(location) => (locationRef.current = location)} />
              <svg>
                <ColumnLineageDatasetNode node={buildNode()} />
              </svg>
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )

  return { locationRef, ...ui }
}

describe('ColumnLineageDatasetNode', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/column-level/analytics/users')
  })

  it('writes the dataset to the query string when clicked', () => {
    const { container, locationRef } = renderNode('/column-level/analytics/users')
    const text = container.querySelector('text')!
    fireEvent.click(text)
    expect(locationRef.current?.search).toContain('dataset=users')
    expect(locationRef.current?.search).toContain('namespace=analytics')
  })

  it('extends layout options with padding', () => {
    const node = buildNode()
    expect(ColumnLineageDatasetNode.getLayoutOptions(node)).toEqual({
      ...node,
      padding: { left: 16, top: 40, right: 40, bottom: 16 },
    })
  })
})
