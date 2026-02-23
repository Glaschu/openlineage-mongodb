import React from 'react'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { Edge } from '../Edge/Edge'
import { EdgeLabel } from '../Edge/EdgeLabel'
import { ElbowEdge } from '../Edge/ElbowEdge'
import { StraightEdge } from '../Edge/StraightEdge'
import type { PositionedEdge } from '../types'

const useMediaQueryMock = vi.hoisted(() => vi.fn().mockReturnValue(false))
vi.mock('@mui/material/useMediaQuery', () => ({ default: useMediaQueryMock }))

describe('Edge component', () => {
  const baseEdge: PositionedEdge = {
    id: 'edge-test',
    type: 'straight',
    sourceNodeId: 'source',
    targetNodeId: 'target',
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 50, y: 50 },
    container: 'root',
    isAnimated: false,
    label: {
      id: 'label',
      text: 'Label',
      x: 10,
      y: 10,
      height: 10,
      width: 20,
    },
  }

  beforeEach(() => {
    useMediaQueryMock.mockReturnValue(false)
  })

  it('renders StraightEdge when type is straight', () => {
    const { container } = render(<Edge edge={baseEdge} />)
    expect(container.querySelectorAll('line')).toHaveLength(1)
  })

  it('renders ElbowEdge for non-straight types', () => {
    const elbowEdge: PositionedEdge = {
      ...baseEdge,
      type: 'elbow',
      bendPoints: [{ x: 20, y: 20 }],
    }

    const { container } = render(<Edge edge={elbowEdge} />)
    expect(container.querySelectorAll('polyline')).toHaveLength(1)
  })
})

describe('StraightEdge', () => {
  const edge: PositionedEdge = {
    id: 'straight',
    type: 'straight',
    sourceNodeId: 'a',
    targetNodeId: 'b',
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 40, y: 20 },
    container: 'root',
    isAnimated: true,
    label: {
      id: 'lbl',
      text: 'Edge Label',
      x: 10,
      y: 30,
      height: 10,
      width: 30,
    },
  }

  it('renders base line, label, and animated line when motion allowed', () => {
    useMediaQueryMock.mockReturnValue(false)
    const { container } = render(<StraightEdge edge={edge} isMiniMap={false} />)

    const lines = container.querySelectorAll('line')
    expect(lines).toHaveLength(2)
    const [baseLine, animatedLine] = Array.from(lines)
    expect(baseLine.getAttribute('x1')).toBe('0')
    expect(animatedLine.getAttribute('id')).toBe('a-b-animated')

    expect(screen.getByText('Edge Label')).toBeInTheDocument()
  })

  it('omits animation when reduced motion is preferred or minimap', () => {
    useMediaQueryMock.mockReturnValue(true)
    const { container } = render(<StraightEdge edge={edge} isMiniMap />)
    expect(container.querySelectorAll('line')).toHaveLength(1)
  })
})

describe('ElbowEdge', () => {
  const edge: PositionedEdge = {
    id: 'elbow',
    type: 'elbow',
    sourceNodeId: 'a',
    targetNodeId: 'b',
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 30, y: 30 },
    bendPoints: [
      { x: 10, y: 0 },
      { x: 20, y: 20 },
    ],
    container: 'root',
    isAnimated: true,
    label: {
      id: 'label',
      text: 'Elbow Label',
      x: 25,
      y: 40,
      height: 10,
      width: 20,
    },
  }

  it('renders polyline path with animation and label', () => {
    useMediaQueryMock.mockReturnValue(false)
    const { container } = render(<ElbowEdge edge={edge} />)

    const polylines = container.querySelectorAll('polyline')
    expect(polylines).toHaveLength(2)
    expect(polylines[0].getAttribute('points')).toContain('20,20')
    expect(polylines[1].getAttribute('id')).toBe('a-b-animated')
    expect(screen.getByText('Elbow Label')).toBeInTheDocument()
  })

  it('disables animation on minimap', () => {
    useMediaQueryMock.mockReturnValue(false)
    const { container } = render(<ElbowEdge edge={edge} isMiniMap />)
    expect(container.querySelectorAll('polyline')).toHaveLength(1)
  })
})

describe('EdgeLabel', () => {
  it('returns null when label is missing', () => {
    const { container } = render(<EdgeLabel />)
    expect(container.firstChild).toBeNull()
  })

  it('applies fallback position when end point provided', () => {
    const label = {
      id: 'lbl',
      text: 'With Adjust',
      x: 12,
      y: 40,
      height: 10,
      width: 10,
    }

    const { container } = render(<EdgeLabel label={label} endPointY={10} />)
    const text = within(container).getByText('With Adjust')
    expect(text.getAttribute('y')).toBe('35')
  })
})
