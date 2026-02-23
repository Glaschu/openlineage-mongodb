// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ElbowEdge } from '../../../../components/graph/Edge/ElbowEdge'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import type { PositionedEdge } from '../../../../components/graph/types'

describe('ElbowEdge Component', () => {
  const mockEdge: PositionedEdge = {
    id: 'edge-1',
    type: 'elbow',
    sourceNodeId: 'source',
    targetNodeId: 'target',
    container: 'container1',
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 200, y: 200 },
  }

  it('should render a polyline with correct points', () => {
    const { container } = render(
      <svg>
        <ElbowEdge edge={mockEdge} />
      </svg>
    )
    const polyline = container.querySelector('polyline')
    expect(polyline).toBeTruthy()
    expect(polyline?.getAttribute('points')).toContain('0,0')
    expect(polyline?.getAttribute('points')).toContain('200,200')
  })

  it('should render with bend points', () => {
    const edgeWithBends = {
      ...mockEdge,
      bendPoints: [
        { x: 50, y: 50 },
        { x: 100, y: 150 },
      ],
    }
    const { container } = render(
      <svg>
        <ElbowEdge edge={edgeWithBends} />
      </svg>
    )
    const polyline = container.querySelector('polyline')
    const points = polyline?.getAttribute('points') || ''
    expect(points).toContain('0,0')
    expect(points).toContain('50,50')
    expect(points).toContain('100,150')
    expect(points).toContain('200,200')
  })

  it('should apply custom color and stroke width', () => {
    const customEdge = {
      ...mockEdge,
      color: '#ff0000',
      strokeWidth: 5,
    }
    const { container } = render(
      <svg>
        <ElbowEdge edge={customEdge} />
      </svg>
    )
    const polyline = container.querySelector('polyline')
    expect(polyline?.getAttribute('stroke')).toBe('#ff0000')
    expect(polyline?.getAttribute('stroke-width')).toBe('5')
  })

  it('should render edge label when provided', () => {
    const edgeWithLabel = {
      ...mockEdge,
      label: { text: 'Test Label', x: 100, y: 100 },
    }
    const { container } = render(
      <svg>
        <ElbowEdge edge={edgeWithLabel} />
      </svg>
    )
    const text = container.querySelector('text')
    expect(text).toBeTruthy()
    expect(text?.textContent).toBe('Test Label')
  })

  it('should render animated polyline when isAnimated is true', () => {
    const animatedEdge = {
      ...mockEdge,
      isAnimated: true,
    }
    const { container } = render(
      <svg>
        <ElbowEdge edge={animatedEdge} />
      </svg>
    )
    const polylines = container.querySelectorAll('polyline')
    expect(polylines.length).toBeGreaterThan(1)
  })

  it('should not render animated polyline in miniMap', () => {
    const animatedEdge = {
      ...mockEdge,
      isAnimated: true,
    }
    const { container } = render(
      <svg>
        <ElbowEdge edge={animatedEdge} isMiniMap={true} />
      </svg>
    )
    // Should only have one polyline (no animation in minimap)
    const polylines = container.querySelectorAll('polyline')
    expect(polylines.length).toBe(1)
  })

  it('should have correct edge id', () => {
    const { container } = render(
      <svg>
        <ElbowEdge edge={mockEdge} />
      </svg>
    )
    const polyline = container.querySelector('polyline')
    expect(polyline?.getAttribute('id')).toBe('source-target')
  })
})
