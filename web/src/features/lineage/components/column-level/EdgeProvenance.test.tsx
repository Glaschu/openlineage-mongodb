// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { ColumnTransformation, transformationKey } from './columnLineageUtils'
import { EdgeProvenance } from './EdgeProvenance'
import type { HoveredEdge } from '@/features/lineage/components/graph'

const edge: HoveredEdge = {
  id: 'edge-1',
  sourceNodeId: 'datasetField:analytics:orders:total',
  targetNodeId: 'datasetField:analytics:summary:revenue',
  clientX: 100,
  clientY: 200,
}

const centerDataset = { namespace: 'analytics', name: 'summary' }

const indexWith = (transformation: ColumnTransformation) =>
  new Map([
    [
      transformationKey(
        { namespace: 'analytics', dataset: 'orders', column: 'total' },
        { namespace: 'analytics', dataset: 'summary', column: 'revenue' }
      ),
      transformation,
    ],
  ])

describe('EdgeProvenance', () => {
  it('names both ends of the edge', () => {
    render(<EdgeProvenance edge={edge} transformations={new Map()} centerDataset={centerDataset} />)

    expect(screen.getByText('orders.total')).toBeInTheDocument()
    expect(screen.getByText('summary.revenue')).toBeInTheDocument()
    expect(screen.getAllByText('analytics')).toHaveLength(2)
  })

  it('shows the transformation type and description when the facet has them', () => {
    render(
      <EdgeProvenance
        edge={edge}
        transformations={indexWith({ type: 'AGGREGATION', description: 'sum of order totals' })}
        centerDataset={centerDataset}
      />
    )

    expect(screen.getByText('AGGREGATION')).toBeInTheDocument()
    expect(screen.getByText('sum of order totals')).toBeInTheDocument()
  })

  it('distinguishes "none recorded" from "not loaded"', () => {
    // The facet is loaded for the centre dataset, so a missing entry means the
    // pipeline recorded no transformation.
    const { unmount } = render(
      <EdgeProvenance edge={edge} transformations={new Map()} centerDataset={centerDataset} />
    )
    expect(screen.getByText('No transformation recorded')).toBeInTheDocument()
    unmount()

    // This edge ends somewhere else, whose facet was never fetched — saying
    // "none" there would be a claim the UI cannot make.
    render(
      <EdgeProvenance
        edge={edge}
        transformations={new Map()}
        centerDataset={{ namespace: 'analytics', name: 'orders' }}
      />
    )
    expect(screen.getByText('Transformation not loaded for this dataset')).toBeInTheDocument()
  })

  it('positions itself clear of the pointer', () => {
    render(<EdgeProvenance edge={edge} transformations={new Map()} centerDataset={centerDataset} />)

    const card = screen.getByTestId('edge-provenance')
    expect(card).toHaveStyle({ position: 'fixed' })
    // Offset so the card never sits under the cursor and flicker-loops.
    expect(card).toHaveStyle({ left: '114px', top: '214px' })
  })
})
