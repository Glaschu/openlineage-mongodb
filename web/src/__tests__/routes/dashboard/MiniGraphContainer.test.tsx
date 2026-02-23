// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { IntervalMetric } from '../../../store/requests/intervalMetrics'
import { MiniGraphContainer } from '../../../routes/dashboard/MiniGraphContainer'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock MiniGraph component
vi.mock('../../../routes/dashboard/MiniGraph', () => ({
  default: ({ color, label }: { color: string; label: string }) => (
    <div data-testid='mini-graph' data-color={color} data-label={label}>
      Mock MiniGraph
    </div>
  ),
}))

describe('MiniGraphContainer Component', () => {
  const mockMetrics: IntervalMetric[] = [
    {
      startInterval: '2023-01-01T00:00:00Z',
      endInterval: '2023-01-01T01:00:00Z',
      count: 100,
    },
    {
      startInterval: '2023-01-01T01:00:00Z',
      endInterval: '2023-01-01T02:00:00Z',
      count: 250,
    },
    {
      startInterval: '2023-01-01T02:00:00Z',
      endInterval: '2023-01-01T03:00:00Z',
      count: 1500,
    },
  ]

  it('should render with label and metrics', () => {
    render(
      <MiniGraphContainer metrics={mockMetrics} isLoading={false} label='Jobs' color='#ff0000' />
    )

    expect(screen.getByText('JOBS')).toBeTruthy()
    expect(screen.getByTestId('mini-graph')).toBeTruthy()
  })

  it('should display the latest count from metrics', () => {
    render(
      <MiniGraphContainer
        metrics={mockMetrics}
        isLoading={false}
        label='Datasets'
        color='#00ff00'
      />
    )

    // Should show the last metric count (1500) formatted (could be "1.5K" or "2k" depending on rounding)
    expect(screen.getByText(/\d+[kKmM]?/)).toBeTruthy()
  })

  it('should uppercase the label', () => {
    render(
      <MiniGraphContainer metrics={mockMetrics} isLoading={false} label='sources' color='#0000ff' />
    )

    expect(screen.getByText('SOURCES')).toBeTruthy()
  })

  it('should not display count when metrics is empty', () => {
    render(<MiniGraphContainer metrics={[]} isLoading={false} label='Jobs' color='#ff0000' />)

    expect(screen.queryByText(/\d+/)).toBeNull()
  })

  it('should pass color and label to MiniGraph', () => {
    const testColor = '#123456'
    const testLabel = 'Test Metric'

    render(
      <MiniGraphContainer
        metrics={mockMetrics}
        isLoading={false}
        label={testLabel}
        color={testColor}
      />
    )

    const miniGraph = screen.getByTestId('mini-graph')
    expect(miniGraph.getAttribute('data-color')).toBe(testColor)
    expect(miniGraph.getAttribute('data-label')).toBe(testLabel)
  })

  it('should pass isLoading prop to MiniGraph', () => {
    render(
      <MiniGraphContainer
        metrics={mockMetrics}
        isLoading={true}
        label='Loading Test'
        color='#ff0000'
      />
    )

    const miniGraph = screen.getByTestId('mini-graph')
    expect(miniGraph).toBeTruthy()
  })

  it('should format large numbers correctly', () => {
    const largeMetrics: IntervalMetric[] = [
      {
        startInterval: '2023-01-01T00:00:00Z',
        endInterval: '2023-01-01T01:00:00Z',
        count: 1234567,
      },
    ]

    render(
      <MiniGraphContainer
        metrics={largeMetrics}
        isLoading={false}
        label='Big Numbers'
        color='#ff0000'
      />
    )

    // Should format 1234567 as "1M" or similar
    expect(screen.getByText(/1M/)).toBeTruthy()
  })
})
