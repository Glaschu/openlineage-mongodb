// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Edge } from '../../../../components/graph/Edge/Edge'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import type { PositionedEdge } from '../../../../components/graph/types'

describe('Edge Component', () => {
  const mockElbowEdge: PositionedEdge = {
    id: 'edge-1',
    type: 'elbow',
    sourceNodeId: 'node1',
    targetNodeId: 'node2',
    container: 'container1',
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 100, y: 100 },
  }

  const mockStraightEdge: PositionedEdge = {
    id: 'edge-2',
    type: 'straight',
    sourceNodeId: 'node3',
    targetNodeId: 'node4',
    container: 'container1',
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 100, y: 100 },
  }

  it('should render ElbowEdge for elbow type', () => {
    const { container } = render(
      <svg>
        <Edge edge={mockElbowEdge} />
      </svg>
    )
    const polyline = container.querySelector('polyline')
    expect(polyline).toBeTruthy()
    expect(polyline?.getAttribute('id')).toBe('node1-node2')
  })

  it('should render StraightEdge for straight type', () => {
    const { container } = render(
      <svg>
        <Edge edge={mockStraightEdge} />
      </svg>
    )
    const line = container.querySelector('line')
    expect(line).toBeTruthy()
    expect(line?.getAttribute('id')).toBe('node3-node4')
  })

  it('should default to ElbowEdge for unknown type', () => {
    const unknownTypeEdge = { ...mockElbowEdge, type: 'unknown' as any }
    const { container } = render(
      <svg>
        <Edge edge={unknownTypeEdge} />
      </svg>
    )
    const polyline = container.querySelector('polyline')
    expect(polyline).toBeTruthy()
  })

  it('should pass isMiniMap prop to edge components', () => {
    const { container } = render(
      <svg>
        <Edge edge={mockElbowEdge} isMiniMap={true} />
      </svg>
    )
    // Should render but not animated in minimap
    const polyline = container.querySelector('polyline')
    expect(polyline).toBeTruthy()
  })
})
