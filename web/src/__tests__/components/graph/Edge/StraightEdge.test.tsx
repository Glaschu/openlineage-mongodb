// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { StraightEdge } from '../../../../components/graph/Edge/StraightEdge'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import type { PositionedEdge } from '../../../../components/graph/types'

describe('StraightEdge Component', () => {
  const mockEdge: PositionedEdge = {
    id: 'edge-1',
    type: 'straight',
    sourceNodeId: 'source',
    targetNodeId: 'target',
    container: 'container1',
    startPoint: { x: 10, y: 20 },
    endPoint: { x: 150, y: 180 },
  }

  it('should render a line with correct coordinates', () => {
    const { container } = render(
      <svg>
        <StraightEdge edge={mockEdge} />
      </svg>
    )
    const line = container.querySelector('line')
    expect(line).toBeTruthy()
    expect(line?.getAttribute('x1')).toBe('10')
    expect(line?.getAttribute('y1')).toBe('20')
    expect(line?.getAttribute('x2')).toBe('150')
    expect(line?.getAttribute('y2')).toBe('180')
  })

  it('should apply custom color and stroke width', () => {
    const customEdge = {
      ...mockEdge,
      color: '#00ff00',
      strokeWidth: 3,
    }
    const { container } = render(
      <svg>
        <StraightEdge edge={customEdge} />
      </svg>
    )
    const line = container.querySelector('line')
    expect(line?.getAttribute('stroke')).toBe('#00ff00')
    expect(line?.getAttribute('stroke-width')).toBe('3')
  })

  it('should render edge label when provided', () => {
    const edgeWithLabel = {
      ...mockEdge,
      label: { text: 'Connection', x: 80, y: 100 },
    }
    const { container } = render(
      <svg>
        <StraightEdge edge={edgeWithLabel} />
      </svg>
    )
    const text = container.querySelector('text')
    expect(text).toBeTruthy()
    expect(text?.textContent).toBe('Connection')
  })

  it('should render animated line when isAnimated is true', () => {
    const animatedEdge = {
      ...mockEdge,
      isAnimated: true,
    }
    const { container } = render(
      <svg>
        <StraightEdge edge={animatedEdge} />
      </svg>
    )
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBeGreaterThan(1)
  })

  it('should not render animated line in miniMap', () => {
    const animatedEdge = {
      ...mockEdge,
      isAnimated: true,
    }
    const { container } = render(
      <svg>
        <StraightEdge edge={animatedEdge} isMiniMap={true} />
      </svg>
    )
    // Should only have one line (no animation in minimap)
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBe(1)
  })

  it('should have correct edge id', () => {
    const { container } = render(
      <svg>
        <StraightEdge edge={mockEdge} />
      </svg>
    )
    const line = container.querySelector('line')
    expect(line?.getAttribute('id')).toBe('source-target')
  })

  it('should apply default stroke width when not provided', () => {
    const { container } = render(
      <svg>
        <StraightEdge edge={mockEdge} />
      </svg>
    )
    const line = container.querySelector('line')
    expect(line?.getAttribute('stroke-width')).toBe('2')
  })
})
